# MES Disk-Based Compatibility — 2026-11-16

## Status / Scope
- Source baseline: `IPTH_DiskBased_Source_20261116T093158Z.zip`, captured from the Backend project.
- Operator SQL metadata audit: database `IPTHData_Dev`, compatibility level `170`;
  `Master_WO_Log` and `Master_WO_Message` are **DISK_BASED**, both have existing
  primary keys; neither `SNAPSHOT_ISOLATION` nor `READ_COMMITTED_SNAPSHOT` is enabled.
- Updater changes **12 existing Backend Python files** and creates **2 new Markdown files**.
- No SQL migration is run, no data is changed by the updater, no FE runtime code is changed.
- Historical SQL files (V0001/V0002/V0003) must NOT be rewritten.

## Changes
1. Strip `WITH (SNAPSHOT)` only from the confirmed WO and Message tables in
   SQLAlchemy `.with_hint(...)` and raw SQL. This includes the dynamic Admin
   Database query hint used for `Master_WO_Log`.
2. `log_cleaner.py`: remove the time-based cleanup target for
   `Master_WO_Message` because it has **no `CreatedAt` or equivalent timestamp**.
   Continue retaining existing cleanup configuration for `DefectsLog` and
   `IPTH_BOM_Change_Queue`. **Existing message rows are preserved.**
3. No changes to WO quantity logic, Batch Allocation, RW, QC Hold, RAW, or APIs.

## Important isolation/concurrency caveats
- Disk-based tables now use whatever transaction isolation is configured by
  their connections/database (`READ COMMITTED` by default in many deployments);
  removing a per-table `SNAPSHOT` hint is **not** equivalent to enabling
  database-level `SNAPSHOT` or `READ_COMMITTED_SNAPSHOT`.
- This updater does **not** introduce `NOLOCK`, `UPDLOCK`, `HOLDLOCK`, or global
  isolation changes. Review test cases for concurrent production updates,
  allocation under contention, multiple workstation refreshes, and message
  acknowledgement. Passing syntax check alone does not establish concurrency safety.
- `Master_WO_Message` will not be automatically purged by the log cleaner until
  a separate retention design is approved (for example a schema timestamp
  migration). Monitor this table for growth on Dev and Production.

## Required safety preconditions
1. On the **specific target DB connection used by the Backend**, verify both
   `dbo.Master_WO_Log` and `dbo.Master_WO_Message` have `is_memory_optimized=0`.
2. Back up code/config and database before deployment.
3. Run `--scan` from `Interplex_MES_BE` and require `VERDICT: PASS`.
4. Stop Backend. Run `--apply` and `--verify`. Restart Backend.
5. Manually test: WO validation/start/finish, OK/NG updates, Batch Allocation,
   Trace by Batch/WO, QC Hold, RW 1-1/Bulk, dashboard message posting/ack,
   log cleaner (DefectsLog / Queue), and parallel updates on the same WO.
6. Verify no `Invalid table hint SNAPSHOT` errors, no loss of data, no duplicate
   allocation, no unhandled deadlocks, and no unexpected 5xx API failures.

## Rollback
`python ../Interplex_MES_FE/IPTH_MES_DiskBased_Compatibility_Updater.py --rollback`
restores only files in the most recent backup if all modified files still match
installer SHA256. It **does not revert the database**. If both tables remain
Disk-Based, old Backend code using `WITH (SNAPSHOT)` will be incompatible;
rollback is therefore an emergency source recovery tool, not a guaranteed
functional restoration after the DB transition.
