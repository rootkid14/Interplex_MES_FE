# MES system architecture — verified high-level view

## Major components

```text
MES browser / React + Vite (Interplex_MES_FE)
    ├─ production pages (Work Order, Inhouse Batch Allocator, Outsource Allocator)
    ├─ modal Workcenter selector
    ├─ routing target dropdown + manual fallback
    ├─ export CSV-formatted .txt file for labels
    └─ Axios client: src/api/client.js, baseURL /api/v1
                    │ HTTP JSON
                    ▼
FastAPI backend (Interplex_MES_BE)
    ├─ app/api/v1/api.py: route registry
    ├─ WoValidation.py: WO validation / Workcenter selection
    ├─ batchallocation.py: Batch allocation / outsource operations
    ├─ bom.py: Traveller/BOM legacy APIs
    ├─ routing_modes_api.py: target discovery and downstream routing
    └─ app/db/session.py: SQLAlchemy SessionLocal
                    │ SQL queries / ORM
                    ▼
SQL Server database
    ├─ IPTH_Tbl_Job_Master_SAP: JOB and Model PN
    ├─ IPTH_BOM_LIST: flattened multilevel BOM / operations
    ├─ RoutingConfigs: saved traveller routing
    ├─ WorkCenter_Master: station types and line codes
    ├─ Master_WO_Log: WO runtime, status and WCtr
    └─ Batches_Master + additional production/consumption tables

Printing workstation (Windows, independent Tkinter / Zebra ZPL app)
    └─ opens FE exported .txt → 6-column CSV parse → ZPL → win32print RAW → Zebra
```

The exact production server process manager, SQL Server deployment details, web proxy and user role model are **not established** by the current source snapshot. Verify rather than assume.

## Major job flow

1. Browser validates scanned WO through `workstationAPI.validateWorkOrder` → `GET /api/v1/validation/validate/{wo}`; backend reads SAP Job Master / model config and may create or load `Master_WO_Log`.
2. New jobs can prompt the Workcenter selection modal. `GET /api/v1/validation/getWorkCenters` reads `WorkCenter_Master`; modal displays `(station, lines)`. `POST /api/v1/validation/setWCTR` writes selected LineCode to `Master_WO_Log.WCtr`.
3. Inhouse Batch Allocator uses SAP `Model` (current PN) and `routing/candidates/{job_no}` to show candidate FERT target PNs. Selected target resolves a route. For descriptions, find the current PN in route steps and read current and following step descriptions.
4. Outsource Allocator takes `New Part Number (Sau Outsource)` as Current PN, sets Current Process literal `Outsource`, and selects a FERT target using `routing/candidates/by-pn/{start_pn}` + `routing/resolve-by-pn`.
5. If routing fails, operator may enter Next Process, otherwise a blank becomes `-`.
6. FE exports .txt with six comma-separated **CSV-escaped** fields per label. Zebra app consumes this file separately. The FE TXT export and actual Windows print are two different operations.

## Data ownership and identifiers

| Identifier | Source / contract | Notes |
| --- | --- | --- |
| `WO` / `job_no` | SAP Job Master and production state | Check canonical-vs-scanned WO linkage in validation before altering flow. |
| `CURRENT_PN` | Inhouse: allocated/model PN; Outsource: New Part Number | **Do not** use original Outsource ModelNO for route start. |
| `TARGET_PN` | FERT candidates from BOM | UI defaults first candidate, operator can select another. |
| `CURRENT_PROCESS` | Inhouse: routing step; Outsource: `Outsource` | `-` fallback when unavailable in Inhouse. |
| `NEXT_PROCESS` | Routing next step or operator manual input | `-` if unresolved and manual left blank. |
| `WCtr` | selected line code | Backend setWCTR writes code, not `WorkCenter_Master.ID`. |

## Dependencies & boundaries

- FastAPI router registry: `Interplex_MES_BE/app/api/v1/api.py` mounts `routing_modes_api.router` under `/bom` and `WoValidation.router` under `/validation`.
- FE Axios client in `src/api/client.js` uses `/api/v1` relative URL and credentials. This is a confirmed source snapshot, not a runtime connectivity guarantee.
- Routing output has `routingPath`, each step typically `{StepNo, Process, Components, TargetParent}`.
- Never invent a current schema or assume foreign keys absent merely because one route stores strings.

<!-- MES2_RAW_PHASE_C_v1_20261109 -->
## MES2 RAW runtime — 2026-11-09

RAW barcode PN;QTY;UOM;SERIAL → Model Config UOM validation → `RawMaterialLots` / `RawMaterialUsage` in one SQL transaction → WO history, Packing and Traceability. Legacy `Raw_Materials_Master` is no longer used for new RAW scans. See `modules/RAW_MATERIAL_PHASE_C.md` for endpoint contracts, concurrency and safety constraints. SQL changes are manual only.

<!-- MES2_RW_PHASE_B_V1 -->
## RW backend architecture (V0002)

`/rework/open` binds the WO (same production WO or new Bulk local WO), then input scans atomically FROZEN + `MES_ReworkInputs`; cumulative `CompletedQty` authorizes REWORK label allocation, which atomically writes both `Batches_Master` and `MES_ReworkOutputs`. Both NORMAL and REWORK allocation synchronize by WO+PN application locks. Trace marks RW on the existing WO node and treats BULK as a genealogy root while keeping Input Batch references in RW Details. RAW material uses existing V0001 tables and requires configured PN/UOM. See `modules/REWORK_PHASE_B.md`. FE Phase C must consume these contracts before RW go-live.

<!-- MES2_RW_PHASE_C_V1 -->
## RW FE flows (Phase C, 2026-11-11)

ProductionView REWORK -> `POST /rework/open` -> `ReworkWorkbench` -> `POST /rework/add-input` (atomic full-batch FROZEN, BE Phase B), RAW scan/transfer, `POST /rework/progress` (cumulative); RW label output -> AllocationView -> `GET /allocation/balance`, `/allocation/status` -> `POST /allocation/generate {Source:"REWORK"}` -> normal verify/print -> active new Batch.

ONE_TO_ONE shares Production WO, no WO type conversion. BULK creates separate local WO without SAP; AllocationView checks RW registry + source PN before opening it, while ordinary jobs still require SAP validation. Traceability reads `HasRework`, shows RW mark -> RW details; BULK is root only for genealogy, original input evidence remains queryable. Backend Phase B owns validation, concurrency and status; FE is not authoritative for integrity.

<!-- MES2_UTILITIES_V1_20261111 -->
## QC Batch lifecycle (V0003, manual SQL)
`IsFrozen` is permanent RW retired; `IsQCHeld` is reversible QC hold with audit history. Authorized QC/IT mutations require per-action password verification by Backend until MES identity/session architecture is modernized. Batch consumption/allocator/packing gates reject either flag. Trace by Batch queries one canonical Batch + only its verified direct consumption edges. See `modules/BATCH_HOLD_AND_BATCH_TRACE.md`.
