# Module index and code ownership

`✅` = file and function observed in supplied source; `⚠️` = route or filename observed, but full implementation not inspected; `?` = locate with collector.

| Module | Owner paths (repository-relative) | Documentation | Confidence |
| --- | --- | --- | --- |
| FE request client | `Interplex_MES_FE/src/api/client.js`, `src/api/workstationApi.js` | `modules/workorders.md` | ✅ |
| WO validation / selection | `Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py`, `Interplex_MES_FE/src/**/WctrSelectionModal.jsx` | `modules/workorders.md`, `modules/workcenters.md` | ✅ |
| Inhouse Batch Allocator | `Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx` | `modules/batch_allocator.md` | ✅ v4.1 updater payload |
| Outsource Allocator | `Interplex_MES_FE/src/components/production/FrameOutSourceAllocator.jsx` | `modules/outsource_allocator.md` | ✅ v4.1 updater payload |
| Routing / BOM | `Interplex_MES_BE/app/api/v1/endpoints/routing_modes_api.py`, `bom.py` | `modules/routing.md` | ✅ routing v4.1; legacy BOM partly inspected |
| Batch allocation server | `Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py` | `modules/batch_allocator.md` | ✅ supplied source exists; individual routes require targeted review |
| Common CSV / routing parsing | `Interplex_MES_FE/src/utils/allocatorRoutingV4.js` | `modules/label_printing.md` | ✅ v4.1 payload |
| Printer executable source | uploaded `LambdaMES_BatchLabelPrinter_v41.py`; server copy may be `Interplex_MES_BE/app/test_may_in_next_process.py` | `modules/label_printing.md` | ✅ upload; actual deployed EXE not inspected |
| Database tab | `Interplex_MES_BE/app/api/v1/endpoints/db_engine.py` registered in router; FE path not confirmed | `modules/database_tab.md` | ⚠️ |
| Package / Traceability / Warehouse | `logPacking.py`, `packing_master.py`, `traceability.py`, `warehouse.py` from router | `modules/other_modules.md` | ⚠️ |
| DB connection | `Interplex_MES_BE/app/db/session.py` | `SYSTEM_ARCHITECTURE.md` | ⚠️ session called, credentials/config not inspected |

## How to update this index

For each updater, identify exactly which paths were read, changed, newly created, removed, and merely referenced. Update owner paths and confidence using a fresh collector archive. A file mentioned by a frontend import does not imply its implementation is fully understood.

## Developer tooling (DevKit v1.1)

- `Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py`: manifest-driven scan/apply/rollback with mandatory compatibility gates.
- `Interplex_MES_FE/docs/mes_agent/COMPATIBILITY_POLICY.md`: approved check types, fail-closed behavior and limits.
- `Interplex_MES_FE/docs/mes_agent/modules/developer_tooling.md`: ownership and regression tests.

## Database migration infrastructure — MES2 v1.0

- `Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py` — DB runner: `--scan`, `--init-baseline`, `--apply`, `--status`, `--history`; invoked from BE.
- `Interplex_MES_BE/database/migrations/V0000__baseline/manifest.json` — immutable baseline migration chain root.
- `Interplex_MES_BE/database/baselines/dev_ipthdata_20261107.json` — approved **Dev-only** catalog profile; customer profile still pending audit.
- `Interplex_MES_FE/docs/mes_agent/database/DB_MIGRATION_RUNBOOK.md` — commands and safety steps; refer to `DB_MIGRATION_ARCHITECTURE.md` for implementation details.


<!-- MES2_RAW_V0001_MANUAL_SQL BEGIN -->
## MES2 RAW V0001 — SQL-only schema release

- Schema artifacts: `Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/`.
- New planned tables (after manual SQL execution): `dbo.RawMaterialLots`, `dbo.RawMaterialUsage`.
- Design: `Interplex_MES_FE/docs/mes_agent/database/RAW_MATERIAL_V0001_SCHEMA.md`.
- UOM source for next code change: `dbo.IPTH_BOM_LIST.Unit`, read during configuration and persisted in Scan Rule; **not implemented in V0001**.
- Future source owners: `WoValidation.py`, `WoValidationResponse.py`, `BomConfig.jsx`, `ModelConfigStore.js`, `FrameMachiningProc.jsx`, `FrameAssemblyProc.jsx`, `FrameAssyPackingMaster.jsx`, `traceability.py`, `packing_master.py`. Current source still writes legacy RAW.
<!-- MES2_RAW_V0001_MANUAL_SQL END -->

<!-- MES2_RAW_UOM_PHASE_B_v1_20261109 -->
## MES2 RAW UOM Phase B (2026-11-09)

| Module | FE/BE owner | Module documentation | Source confidence |
| --- | --- | --- | --- |
| RAW UOM Model Config | `Interplex_MES_FE/src/store/ModelConfigStore.js`, `src/pages/BomConfig.jsx`; `Interplex_MES_BE/app/api/v1/endpoints/modelconfigs.py` | `modules/RAW_UOM_MODEL_CONFIG.md` | Verified from 2026-11-07 collector; runtime not yet verified |

<!-- MES2_RAW_PHASE_C_v1_20261109 -->
## MES2 RAW Phase C — Scanner / Serial / Remainder (2026-11-09)

| Module | Key files | Documentation |
| --- | --- | --- |
| RAW runtime | `app/services/raw_material_service.py`, `WoValidation.py`, `traceability.py`, `packing_master.py`; FE `useRawMaterialFlow.jsx`, `FrameMachiningProc.jsx`, `FrameAssemblyProc.jsx`, `FrameAssyPackingMaster.jsx` | `modules/RAW_MATERIAL_PHASE_C.md` |

<!-- BEGIN MES2_RW_PHASE0_20261111 -->
## Rework (MES2 Phase 0)

- Business rules: `rework/RW_RULES_LOCKED.md`.
- Architecture proposal: `rework/RW_ARCHITECTURE_PROPOSAL.md`.
- Source findings: `rework/RW_SOURCE_IMPACT.md`.
- Open decisions: `rework/RW_OPEN_DECISIONS.md`.
- Runbook: `rework/RW_PHASE0_RUNBOOK.md`.
- Source+DB read-only audit tool: `developer_tools/IPTH_RW_ArchitectureAuditor.py`.
- Collector request: `developer_tools/requests/rw_phase0.json`.
- SQL metadata inspection: `Interplex_MES_BE/database/sql_audits/RW_PHASE0_READONLY.sql`.

Phase 0 **does not change** the production application or SQL schema.
<!-- END MES2_RW_PHASE0_20261111 -->


### RW Phase A (2026-11-11) [MES2_RW_PHASE_A_V0002]
- `docs/mes_agent/rework/RW_PHASE_A_SCHEMA.md`: RW schema and contracts.
- Backend `database/sql_updates/V0002__rework_registry`: 00_PRECHECK / 01_APPLY / 02_VERIFY.

<!-- MES2_RW_PHASE_B_V1 -->
### RW Backend Phase B — new ownership

| Owner | Source | Documentation |
| --- | --- | --- |
| Rework API + transaction service | `Interplex_MES_BE/app/api/v1/endpoints/rework.py`, `app/services/rework_service.py` | `modules/REWORK_PHASE_B.md` |
| Freeze guards and allocation pools | `WoValidation.py`, `batchallocation.py`, `packing_master.py`, `raw_material_service.py` | `modules/REWORK_PHASE_B.md`, `modules/batch_allocator.md`, `modules/workorders.md` |
| Genealogy | `traceability.py` | `modules/REWORK_PHASE_B.md` |

<!-- MES2_RW_PHASE_C_V1 -->
## RW Phase C FE ownership (pinned to 2026-11-11 source)

| Component | Owner | API / Docs |
| --- | --- | --- |
| Rework entry + Workbench | `src/components/production/ActiveJobView.jsx`, `src/components/rework/ReworkWorkbench.jsx` | `src/api/reworkAPI.js`; `modules/REWORK_PHASE_C.md` |
| Batch Allocation RW/Normal | `src/components/production/AllocationView.jsx`, `FrameBatchAllocator.jsx` | `/allocation/balance`, `/allocation/generate`; `modules/batch_allocator.md` |
| RW Traceability mark/detail | `src/components/traceability/TraceabilityView.jsx`, `src/components/rework/RWDetailsTables.jsx` | `GET /rework/details`; `modules/traceability_rework.md` |

Backend services remain pinned to Phase B; no BE files were modified in Phase C.

<!-- MES2_UTILITIES_V1_20261111 -->
### QC Batch Hold / Exact Batch Trace / CSV / Numeric UI
- FE: `src/components/utilities/BatchHoldView.jsx`, `src/components/layout/Sidebar.jsx`, `src/components/traceability/TraceabilityView.jsx`, `src/utils/keyboardOnlyNumericInputs.js`.
- BE: `app/api/v1/endpoints/qc_batch_hold.py`, `traceability.py`, `app/services/rework_service.py`; manual `V0003__qc_batch_hold`.
- See `modules/BATCH_HOLD_AND_BATCH_TRACE.md`.
