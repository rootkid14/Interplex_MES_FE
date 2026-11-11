# MES2 RAW V0001 — VERIFY syntax hotfix (2026-11-09)

**Affected artifact:** `Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/02_VERIFY.sql`

**Observed:** After `00_PRECHECK.sql` and `01_APPLY.sql` completed successfully, `02_VERIFY.sql` raised `Incorrect syntax near 'RowCount'`.

**Root cause:** T-SQL reserves `ROWCOUNT`; the last SELECT used the unquoted alias `RowCount`. Renamed the SELECT output alias to `RecordCount`.

**Database impact:** None. The verifier is read-only; V0001 schema creation script is **unchanged**. This is a correction to a verification artifact, not a new schema migration.

**Deployment:** Use the verify-hotfix updater (`--scan`, then `--apply`) from the BE working directory, and rerun **only** `02_VERIFY.sql` against the same database where V0001 was applied. Stop and report the full sanitized error if VERIFY fails. Do **not** rerun `01_APPLY.sql`.

**Tracking:** `SHA256SUMS.txt` updates the checksum of `02_VERIFY.sql`, but not PRECHECK/APPLY. Record this verifier erratum with the V0001 release in the manual DB deployment log.

**Evidence:** Original release artifact examined and static assertions tested locally; no live SQL Server execution by the assistant.
