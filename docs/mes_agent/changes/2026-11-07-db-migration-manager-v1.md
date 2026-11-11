# 2026-11-07 — MES DB Migration Manager v1.0 / V0000 adoption

**Category:** Development infrastructure + additive migration tracking. **No MES runtime code or existing business tables changed by updater.**

- Added FE tool `developer_tools/IPTH_DBMigrationManager.py` supporting `--scan`, `--status`, `--history`, `--verify-package`, `--init-baseline`, `--apply`, `--check-release`.
- Added BE migration chain starting with immutable `V0000__baseline` manifest and Dev-only catalog profile from `IPTHData_Dev` audit (six managed tables).
- Added operator runbook, architecture specification and agent handoff. Updated `MODULE_INDEX.md`, `CHANGELOG.md`, and `modules/developer_tooling.md`.
- `--scan` is SQL read-only, and `--init-baseline` explicitly registers one V0000 receipt in a newly created ledger only if schema matches (after operator backup confirmation). Customer baseline is intentionally unavailable without its own audit/profile.
- Future transactional migrations must use reviewed hashed `up.sql`, `precheck.sql` and `verify.sql`; runner refuses edits, missing versions and non-reviewed operations.
- Testing: offline profile fingerprint, package validation, rejection gates and mocked manager flows; no live SQL Server migration executed in ChatGPT sandbox.

**Release state:** Tooling is ready for Dev preflight; **no RAW Material feature/schema migrations yet**. Both code and DB migrations remain separate operator steps.
