# MES2 RW V0002 — SQL Erratum (2026-11-11)

## Symptom
`Msg 207 Invalid column name 'IsFrozen' / 'FrozenAtUTC'` during `01_APPLY.sql`, or when running the old VERIFY against an un-migrated schema.

## Root cause and fix
The initial V0002 APPLY added two `Batches_Master` columns and then defined a CHECK constraint referring to them in the same compiled T-SQL batch. SQL Server can bind those identifiers before the ALTER has executed. The CHECK DDL is now compiled later using `sys.sp_executesql`, *within the existing TRY/TRANSACTION and application lock*. VERIFY also defers its references to these columns.

## Manual SQL workflow
1. The Python updater patches files and docs only (`--scan`, `--apply` from BE); it never connects to SQL Server.
2. Execute `03_DIAGNOSE_STATE.sql` (read-only) on the intended database. If no objects exist, backup, execute `00_PRECHECK.sql`, then corrected `01_APPLY.sql` **once**, followed by corrected `02_VERIFY.sql`.
3. If all six schema components exist, run only VERIFY. If partial/inconsistent, stop and investigate (no automatic repair/drop).
4. Record the APPLY/VERIFY results and checksums for dev and customer deployment; do not run outdated SQL.

## Untouched
`00_PRECHECK.sql`, all `IPTH_*` customer tables, application runtime and production data. **No SQL has been executed in the assistant environment.**
