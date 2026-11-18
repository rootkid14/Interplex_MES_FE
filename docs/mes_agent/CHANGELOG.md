## 2026-11-18 — QC Hold Workspace v1.3 Bulk Unhold

- Preview/confirm batch bulk QC Unhold with selected or applied-filter scope; preserve permanent RW FROZEN.
- Atomic backend transaction and one audit entry per released Batch. No SQL migration.

# MES agent documentation changelog

| Date (YYYY-MM-DD) | Update | Module docs updated | Code modified? | Release notes |
| --- | --- | --- | --- | --- |
| 2026-11-11 | QC Hold Workspace v1.2: field/status/date filters, all-results CSV export QC/IT protected | `modules/BATCH_HOLD_AND_BATCH_TRACE.md` | FE/BE, no SQL | `changes/2026-11-11-qc-hold-workspace-v1-2-search-csv.md` |
| 2026-11-07 | DB Migration Manager v1.0.1: SQL Server reserved-alias catalog fix and safe per-query error diagnostics | `database/DB_MIGRATION_RUNBOOK.md` | Tooling only; no schema/ledger modifications | `changes/2026-11-07-db-migration-manager-v101-sql-catalog-hotfix.md` |
| 2026-11-07 | DB Migration Manager v1.0: baseline tracking, independent migration runner | `database/DB_MIGRATION_ARCHITECTURE.md`, `database/DB_MIGRATION_RUNBOOK.md`, `database/DB_MIGRATION_AGENT_HANDOFF.md`, `modules/developer_tooling.md` | Tooling only; no MES runtime changes | `changes/2026-11-07-db-migration-manager-v1.md` |
| 2026-11-07 | DevKit v1.1: mandatory fail-closed updater compatibility gate, checked dependencies/contracts | `modules/developer_tooling.md`, `UPDATER_STANDARD.md`, `COMPATIBILITY_POLICY.md` | Updater template only; no MES runtime code | `changes/2026-11-07-agent-devkit-v11-compatibility.md` |
| 2026-11-07 | DevKit v1: baseline handoff, collector, updater contract/template | `modules/routing.md`, `modules/batch_allocator.md`, `modules/outsource_allocator.md`, `modules/workcenters.md`, `modules/label_printing.md`, etc. | No MES runtime code changed | `changes/2026-11-07-agent-devkit-v1.md` |

## Older milestones (from supplied updater/source and prior project decisions)

- Routing v1: standalone routing API, JOB → start PN → FERT destination, candidate list.
- Allocator v1–v3: Next Process export, manual target choice, printer EXE download from FE.
- Allocator v4: candidate FERT combobox and six-column TXT for Inhouse and Outsource; fallback on routing errors.
- Allocator **v4.1**: corrected Outsource route start to **New Part Number (Sau Outsource)**, Current Process literal `Outsource`.
- Printer v4.1: six-column TXT, Current PN/Process and Next Process, Quality blank, compact UI, unchanged 100 × 75 mm physical label.

Dates for individual old patches and whether they are deployed on a particular machine must be verified against Git/logs.


<!-- MES2_RAW_V0001_MANUAL_SQL BEGIN -->
## 2026-11-09 — MES2 RAW Material database V0001 (manual SQL artifacts)

Shipped PRECHECK/APPLY/VERIFY SQL (two new tables: `RawMaterialLots`, `RawMaterialUsage`), checksum file and agent handoff. Operator executes SQL manually. No changes to runtime FE/BE, no legacy data migration, no IPTH_* table changes, no UOM lookup table. The old auto-baseline manager workflow is superseded; see `database/MANUAL_SQL_MIGRATION_STANDARD.md` and `changes/2026-11-09-raw-material-v0001-schema.md`.
<!-- MES2_RAW_V0001_MANUAL_SQL END -->

<!-- MES2_RAW_V0001_VERIFY_ERRATUM_20261109 -->
- 2026-11-09: MES2 RAW V0001 read-only verifier syntax hotfix: rename reserved alias `RowCount` to `RecordCount`; SQL APPLY and schema unchanged. See `changes/2026-11-09-raw-v0001-verify-erratum.md`.

<!-- MES2_RAW_UOM_PHASE_B_v1_20261109 -->
- **2026-11-09** — MES2 RAW UOM Phase B: BOM `Unit` captured/validated on Model Config save; three application source files updated. See `modules/RAW_UOM_MODEL_CONFIG.md` and `changes/2026-11-09-raw-uom-phase-b-v1.md`. No SQL or scanner runtime changes.

<!-- MES2_RAW_PHASE_C_v1_20261109 -->
- **2026-11-09** — MES2 RAW Phase C: strict 4-field scanner, backend serial/UOM validation and transactional remainder; history/traceability/packing reads from V0001 tables; read-only Database Tab. See `modules/RAW_MATERIAL_PHASE_C.md` and `changes/2026-11-09-raw-phase-c-v1.md`. No SQL DDL.

<!-- BEGIN MES2_RW_PHASE0_20261111 -->
### 2026-11-11 — MES2 RW architecture audit tooling

Added read-only RW source/DB auditor, collector request, SQL metadata query and `rework/` design documentation. No runtime or DB schema changes; next step is validating current source and then drafting manual RW DDL.
<!-- END MES2_RW_PHASE0_20261111 -->


[MES2 RW Phase A V0002] 2026-11-11 — Manual SQL release: MES_ReworkJobs, MES_ReworkInputs, MES_ReworkOutputs and Batches_Master freeze lifecycle. Apply DB SQL separately. [MES2_RW_PHASE_A_V0002]


[MES2_RW_V0002_SQL_COMPILE_ERRATUM_20261111] 2026-11-11 - RW V0002 SQL erratum: defer CHECK binding with sp_executesql; verify diagnostic safeguards; manual SQL only.

[MES2_RW_V0002_MEMORY_OPTIMIZED_FK_ERRATUM_20261111] Correct RW V0002 cross-storage FK for memory-optimized Master_WO_Log (SQL Server 10778); 4 supported FKs retained; manual SQL only.

<!-- MES2_RW_PHASE_B_V1 -->
**2026-11-11 — MES2 RW Phase B Backend:** new RW registry/open/input/progress/detail/complete/reopen APIs, permanent whole-Batch freeze guards, separate NORMAL/REWORK allocation pool, trace genealogy mark/root, and BULK RAW ModelNO fallback. Code only, SQL V0002 verified separately; no FE changes. Module: `modules/REWORK_PHASE_B.md`; release: `changes/2026-11-11-rw-phase-b-v1.md`.

<!-- MES2_RW_PHASE_C_V1 -->
- **2026-11-11** — MES2 RW Phase C FE: `/rework/open` UI, whole-batch freeze confirmation, cumulative output, RAW remainder, dual allocation source, Bulk no-SAP registry entry and Traceability RW mark/detail. Docs `modules/REWORK_PHASE_C.md`, `modules/traceability_rework.md`, `modules/batch_allocator.md`, `modules/workorders.md`; release `changes/2026-11-11-rw-phase-c-v1.md`. No DB or BE changes.

<!-- MES2_UTILITIES_V1_20261111 -->
- **2026-11-11** — MES2 Utilities V1: QC/IT audited hold/unhold (manual V0003), exact Batch trace, keyboard-only numeric inputs, complete Details CSV, hold-aware print/reprint checks. See `changes/2026-11-11-mes2-utilities-v1.md` and `modules/BATCH_HOLD_AND_BATCH_TRACE.md`.


<!-- MES2_QC_HOLD_WORKSPACE_V1_1_20261111 -->
- 2026-11-11 — QC Batch Hold Workspace v1.1: full dark full-viewport 2-panel layout,
  credential-protected paginated currently-held list, re-authenticated actions and selected
  Batch audit. No SQL migration or changes to RW Frozen semantics.
  See `changes/2026-11-11-qc-hold-workspace-v1-1.md`.
