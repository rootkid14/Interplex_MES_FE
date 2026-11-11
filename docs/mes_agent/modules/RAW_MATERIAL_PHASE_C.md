# MES2 RAW Material — Phase C (2026-11-09)

**Status:** Code-release candidate. No direct SQL execution. Requires V0001 schema to have been manually applied + verified, and Phase B Model Config data containing `expected_uom` on every active `RAW_QTY` rule. Not yet tested end-to-end on the customer's SQL Server or physical scanners.

## Barcode and source of truth

Supplier barcode is strictly `PN;QTY;UOM;SERIAL`, e.g. `PISCR07-0352-01;12.7500;KG;00002644000001`. The scanner preserves the Serial as a string including leading zeroes. Quantity accepts 1–14 integral digits and up to four decimals and is stored in SQL Server `DECIMAL(18,4)`. Backend uses `Decimal` and receives the exact scanned string (never uses a manually typed initial QTY). No automatic KG→PCS conversion.

UOM comes from `IPTH_BOM_LIST.Unit` via Phase B Model Config generation; at **scan time** Backend loads the persisted `ModelConfigs.JsonData.rawMaterials[].expected_uom` for the canonical WO's SAP Model. It compares normalized uppercase UOM against the scanned UOM and rejects missing legacy rules. Config changes require reopening/reloading active workstations. BOM changes require re-saving the Model Config; there is no automatic silent runtime substitution.

## Storage contract

V0001 manually created:
- `dbo.RawMaterialLots(LotID, PartNumber, SerialNumber, OriginalQty, UOMCode, RawBarcode, RegisteredAtUTC, RegisteredBy)`. Unique key `(PartNumber, SerialNumber)`. Existing lot identity cannot be altered by a repeated barcode.
- `dbo.RawMaterialUsage(UsageID, LotID, WorkOrder, ReceivedQty, RemainderOutQty, PreviousUsageID, IsCurrent, ReceivedAtUTC, ClosedAtUTC, ClosedReason, OperatorID)`. Filtered unique `LotID WHERE IsCurrent=1`; filtered unique `PreviousUsageID WHERE PreviousUsageID IS NOT NULL`; same-lot FK.

One current owner per lot, **not** simultaneous split allocations. On an unchanged scan by its owning WO: `RAW_ALREADY_LOGGED` (no write). On scan by another WO: `RAW_REMAINDER_REQUIRED` with `CurrentUsageID`, previous owner and amount. A transfer requires `PreviousUsageID`; code serializes by `sp_getapplock` within the SQL transaction, rechecks the current usage row under `UPDLOCK,HOLDLOCK`, closes the previous row with `RemainderOutQty`, inserts new current usage, commits atomically. Stale requests: `RAW_STALE_TRANSFER` (no write). Full-amount transfer is allowed (`RemainingQTY <= ReceivedQty`). No overwrite of original lot quantity.

**Accounting interpretation:** `ReceivedQty - RemainderOutQty` is the quantity allocated/retained by that historical WO, not independently measured physical consumption. There is no scrap, waste, or on-hand inventory ledger in this phase. If physical consumption tracking is later required, design separate transactions.

## API endpoints (existing `/validation` prefix)

- `POST /validation/logRawMaterial` request: `{"WO": 10001, "RawMaterial": "PISCR07-0352-01;2000;PCS;2644000001"}`. Legacy `QTY` and `PartNO` body fields are **rejected**, not trusted.
- On new lot: `success=true`, `data.Action="RAW_REGISTERED"`, `QTY_Logged` (decimal string), UOM, Serial, lot ID.
- On repeat same WO: `success=false`, `data.Code="RAW_ALREADY_LOGGED"`.
- On different WO: `success=false`, `data.Code="RAW_REMAINDER_REQUIRED"` with `PreviousWO`, `PreviousQTY`, `CurrentUsageID`, `RequestedWO`, `PartNO`, `SerialNumber`, `UOM`, `RawMaterial`.
- `POST /validation/transferRawMaterial`: `{"WO": 10002, "RawMaterial": "PISCR07-0352-01;2000;PCS;2644000001", "RemainingQTY":"500.0000", "PreviousUsageID":1}`. FE sends a decimal **string**. Backend checks 0 < remainder <= current ReceivedQty, and matches current usage ID.
- `GET /validation/getLoggedMaterials/{wo}`: `data.mainInputs` unchanged (Batch flow); `data.rawMaterials` now sourced from V0001 tables and contains `code`, `pn`, `qty` (net allocation decimal string), `receivedQty`, `remainderOutQty`, `serial`, `uom`, `originalQty`, `time`, `timestamp`, `isCurrent`, `id`, `lotId`.
- `GET /tracebility/materialstracebywo/{wo}` reads V0001 usage + lot, retaining old fields (`RawMaterial`, `PartNO`, `QTY`, `Time`) plus new serial/UOM/usage state fields.
- `GET /packing_master/...` RAW history now reads new ledger; `/packing_master/log_material` explicitly refuses legacy `RAW_QTY` writes. Use the validation API.

## FE components

- `src/hooks/useRawMaterialFlow.jsx` is shared by `FrameMachiningProc.jsx`, `FrameAssemblyProc.jsx`, `FrameAssyPackingMaster.jsx`. It recognizes RAW by an **exact leading PN** before old Batch substring matching, parses the barcode, validates UOM for fast feedback, calls the Backend for authoritative validation, and shows a shared remainder modal.
- Manual initial RAW QTY dialogs are retired. Existing Batch remainder dialogs are unchanged.
- Material histories are reloaded from Backend on success; no optimistic local duplicate append.
- `db_engine.py` offers new RAW registry and ledger tables for inspection but blocks generic UPDATE/DELETE on them.

## Packing quantity safety

The existing Packing code historically treated RAW QTY as finished PCS for quantity caps. Phase C does **not** convert KG/M to PCS. For non-PCS RAW, only a positive scanned RAW allocation is required for material presence; Packing capacity remains limited by MAIN INPUT PCS, if present. If a Packing program requires **only non-PCS RAW** and has no MAIN INPUT PCS capacity source, Packing is blocked (`maxAllowedQty=0`) until a separately approved conversion/capacity policy is implemented. For PCS RAW, the original 1:1 legacy capacity assumption is retained; confirm BOM usage ratio before using this for production.

## Compatibility, runbook and caveats

1. Apply SQL V0001 `00_PRECHECK → 01_APPLY → 02_VERIFY` **manually** (if not already applied). If V0001 was applied and VERIFY passed, do **not** rerun APPLY. Use the corrected VERIFY erratum.
2. Install Phase B and save every active RAW Model Config so `expected_uom` is persisted; inspect `IPTH_BOM_LIST.Unit` conflicts/empty values.
3. Schedule a production stop; code updater `--scan` must PASS: source fingerprints, Phase B fingerprints and read-only DB V0001 column/index checks. Then `--apply` source/docs only. Restart BE and build/reload FE together. **Old FE cannot safely scan RAW after new BE deployment.**
4. Manually test one new Serial, duplicate in same WO, different WO transfer, stale transfer, bad UOM, bad format, decimals KG, and historical reading at Machining/Assembly/Packing/Traceability. Inspect SQL rows. Use a test WO/Serial in Dev DB first.
5. Code rollback never rolls back SQL data. Legacy `Raw_Materials_Master` is not written; do not expect new data to appear there. Old code will not read V0001 records after rollback. Protect/reconcile test records separately.

Not changed: existing Batch APIs, cross-DB customer IPTH_* tables, database schema, migration manager. Existing `RawMaterialLog` write path is disabled rather than guessed to be a real table. The SQL Server deployment/runtime and customer integrations need on-site verification.

## Source provenance

Patch based on `IPTH_Source_20261107_033151Z.zip`, plus Phase B source outputs from `IPTH_MES2_RAW_UOM_PhaseB_Updater.py` (2026-11-09). Exact checksums are embedded in the Phase C updater. If the deployed files differ, **REJECT** and collect a fresh source ZIP; do not force apply.
