# RW V0002 — Memory-optimized WO Foreign Key Compatibility Erratum (2026-11-11)

## Evidence (live Dev)

- `IPTH_RW_V0002_FK_Diagnostic.py --probe` on `IPTHData_Dev`: `Master_WO_Log` has `is_memory_optimized=1`; PK `WO` BIGINT.
- `ALTER TABLE ... ADD FK` from disk-based rework header to memory-optimized WO fails with SQL Server **10778** (ODBC SQLSTATE 42000), followed by generic 1750.
- Probe transaction rolled back and confirmed no probe objects; `03_DIAGNOSE_STATE.sql` previously returned `NOT_APPLIED`.

## Decisions

1. V0002 keeps disk-based `MES_ReworkJobs`, `MES_ReworkInputs`, `MES_ReworkOutputs`.
2. Remove only `FK_MES_ReworkJobs_WO`; preserve `WO BIGINT NOT NULL`, `UNIQUE(WO)`, remaining four valid FKs and batch freeze constraints.
3. New backend RW APIs **must check WO existence** before INSERT and before any new/continued RW operation, including Bulk creation. Avoid SQL writes that assume FK enforcement.
4. Database PRECHECK/APPLY explicitly reject memory-optimized `Batches_Master` because disk-based batch FK/freeze ALTER is required.
5. `02_VERIFY` expects four supported FKs, not five, and validates their parent/target relationships and trusted status.
6. No migration/cleanup of Legacy data; no modifications to `Master_WO_Log` or customer `IPTH_*` tables.

## Operator instructions

After Python updater `--scan` and `--apply` succeeds, on a backed-up Dev DB run the corrected `03_DIAGNOSE_STATE.sql`; only when `NOT_APPLIED`, run corrected `00_PRECHECK.sql`, `01_APPLY.sql`, `02_VERIFY.sql` in that order. Stop on any REJECT. Never run SQL automatically from the Python updater.

## Verification limits

Static SQL checks and updater install/rollback tested offline. Corrected DDL has **not been run against the user's live SQL Server**. Live verification is required before reusing on customer DB.
