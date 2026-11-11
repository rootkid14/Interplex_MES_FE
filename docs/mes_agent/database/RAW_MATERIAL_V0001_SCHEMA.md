# MES2 RAW Material — DB design V0001 (manual SQL)

**Date:** 2026-11-09  
**Evidence:** `IPTH_MES2_Audit_20261107T032555Z(1).zip` metadata; `IPTH_Source_20261107_033151Z.zip` FE/BE source.  
**Status:** SQL release ready for operator review; **not applied** on Dev/Customer. Do not claim runtime feature enabled.

## 1. Reasons for redesign

Legacy `dbo.Raw_Materials_Master` mixes barcode/PN/quantity with `Used_by_WO`; it lacks dedicated Serial, UOM and transfer-history structure. Existing `/logRawMaterial` inserts without a serial identity/ownership check; `getLoggedMaterials` and Machining, Assembly, Assy Packing use the old contract. `RawMaterialLog` is referenced from Packing source but was absent from the reviewed Dev schema. Legacy RAW data will be cleaned at go-live per customer agreement; **V0001 does not delete or migrate it**.

## 2. New tables

### dbo.RawMaterialLots

| Column | SQL type | Detail |
|---|---|---|
| LotID | BIGINT IDENTITY | PK |
| PartNumber | NVARCHAR(100) | NOT NULL |
| SerialNumber | NVARCHAR(100) | NOT NULL; preserve leading zeros |
| OriginalQty | DECIMAL(18,4) | >0; first barcode quantity |
| UOMCode | NVARCHAR(10) | NOT NULL; unit validated against scan rule in later code |
| RawBarcode | NVARCHAR(500) | Original scan string |
| RegisteredAtUTC | DATETIME2(3) | UTC default |
| RegisteredBy | NVARCHAR(100) | optional operator |

UNIQUE `(PartNumber,SerialNumber)`, index on `SerialNumber`. No `MES_UOM` lookup table and no modifications to customer `IPTH_BOM_LIST`.

### dbo.RawMaterialUsage

| Column | SQL type | Detail |
|---|---|---|
| UsageID | BIGINT IDENTITY | PK |
| LotID | BIGINT | FK to lots |
| WorkOrder | BIGINT | WO; no FK to legacy WO pending lifecycle review |
| ReceivedQty | DECIMAL(18,4) | >0; quantity allocated to WO |
| RemainderOutQty | DECIMAL(18,4) NULL | sent to next WO when closed |
| PreviousUsageID | BIGINT NULL | link to previous usage of **same lot** |
| IsCurrent | BIT | only one current row per lot |
| ReceivedAtUTC | DATETIME2(3) | UTC default |
| ClosedAtUTC | DATETIME2(3) NULL | close timestamp |
| ClosedReason | NVARCHAR(30) NULL | `TRANSFER`, `COMPLETED`, etc. |
| OperatorID | NVARCHAR(100) NULL | optional operator |

Constraints: positive quantity, remainder between zero and received, current/open or closed/complete state consistency, composite self-FK preventing cross-lot predecessor, unique index on `PreviousUsageID` preventing transfer forks, unique filtered index `(LotID) WHERE IsCurrent=1`.

This is **one active WO per RAW lot**, per the agreed Batch-like model. `ReceivedQty - RemainderOutQty` is only quantity attributed to prior WO, **not measured consumption**. The application must implement transfer atomically with row locks; database constraints alone cannot prevent all races or validate barcode rules.

## 3. UOM policy (not part of SQL V0001 code)

1. User enables a `RAW_QTY` scan rule on a specific BOM node in Model Config.
2. FE/BE resolves `Unit` from the **appropriate context** in `dbo.IPTH_BOM_LIST` (`NCHAR(10)`); trim padded spaces, normalize case, reject ambiguous/missing UOM.
3. Persist `expected_uom` in Model Config JSON (field name illustrative until code contract finalized).
4. During scanning, parse `PN;QTY;UOM;SERIAL` strictly; verify PN and UOM against the saved scan rule. No automatic conversions.
5. Use SQL `DECIMAL(18,4)` and Python `Decimal` for quantity, although the UI may display `x.0`/`x.xxxx`.

**V0001 does not modify Model Config JSON or scanner APIs.** Those require a later coordinated code updater with its own `--scan`/`--apply`, live schema compatibility check, tests, and MD change note.

## 4. Old table and dependency status

| Object | V0001 decision |
|---|---|
| dbo.Raw_Materials_Master | Unchanged; legacy API continues to use it |
| dbo.IPTH_BOM_LIST | Read-only prerequisite for BOM Unit; never altered |
| dbo.ModelConfigs | Unchanged; future code may persist UOM in JSON |
| dbo.Master_WO_Log | Unchanged |
| dbo.Batches_Master / Batches_Consumption_Log | Unchanged |
| dbo.RawMaterialLog | Not created; resolve Packing discrepancy in code phase |
| dbo.RawMaterialLots / RawMaterialUsage | Created manually by V0001 SQL |

## 5. Next phase checklist

- Confirm V0001 SQL PRECHECK / APPLY / VERIFY with operator evidence on Dev; separately on Customer when scheduled.
- Backend `Decimal` request validation; new lot registration and transfer endpoints; status/error semantics.
- FE scan rule UOM propagation from BOM; scanner updates across Machining, Assembly, Assy Packing.
- Update `getLoggedMaterials`, Traceability and Packing RAW queries to new usage history; resolve `RawMaterialLog` dependency.
- Verify duplicate scan same WO, conflict different PN/UOM/OriginalQty, serial leading zeros, fractional KG/M, transfer concurrently, backward compatibility before cut-over.

## 6. Deployment and version management

The manual SQL release is under `Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/`. Operator alone chooses the database and runs PRECHECK → APPLY → VERIFY. Track exact `SHA256SUMS.txt` and outputs in private manual deployment register. **The Python code updater installs scripts/docs only, never executes SQL.** Historic auto-baseline V0000 was not confirmed as initialized and is not required by this release.
