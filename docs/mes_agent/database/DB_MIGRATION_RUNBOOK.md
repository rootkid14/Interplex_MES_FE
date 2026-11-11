# IPTH MES — DB Migration Manager operator runbook (v1.0)

## A. Install files (NO database change)

Copy the standalone code updater into FE and run **from the BE directory**:

```bash
cp ~/Downloads/IPTH_DBMigration_DevKit_v1_Updater.py ~/IPTH_Traceability/Interplex_MES_FE/
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/IPTH_DBMigration_DevKit_v1_Updater.py --scan
python ../Interplex_MES_FE/IPTH_DBMigration_DevKit_v1_Updater.py --apply
```

If `--scan` rejects, do not force it: copy the scan output to the agent. Installer does NOT alter FE runtime, BE runtime or DB. Verify the two database packages are available in the BE virtual environment: `python -c 'import sqlalchemy,pyodbc'`. Keep `.env` off Git and out of chat.

## B. Dev DB: establish V0000 *once*, after DB backup

`DATABASE_URL` is read from `Interplex_MES_BE/.env` or process env. Legacy URL with host `0.0.0.0` is normalized to `127.0.0.1` as a client destination. Confirm this DB is really local; if it is remote, use its actual hostname.

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --verify-package
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --scan --target dev
```

The **first** scan should show candidate profile compatibility and `VERDICT: REJECT — UNINITIALIZED`; that is an intentional confirmation gate, NOT proof the tool is broken. On mismatch, stop and send the report to the agent. The Dev audit baseline covers only six critical tables, not the whole DB.

After you have independently backed up `IPTHData_Dev` and checked the backup, execute:

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py \
  --init-baseline --target dev --profile dev_ipthdata_20261107 \
  --confirm-server 'SERVER_NAME_SHOWN_BY_SCAN' \
  --confirm-database IPTHData_Dev --backup-confirmed
```

The operation creates ONLY `dbo.MES_SchemaMigrationHistory` and records `V0000`. It does **not** add RAW Lot tables, change business data, fix Packing or modify any `IPTH_*` tables.

Confirm:

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --status --target dev
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --scan --target dev
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --history --target dev
```

After successful V0000, current package has no further migrations, so `--apply` is a no-op; you do not need to run it now.

## C. Customer deployment (not ready for baseline registration yet)

Set a **separate** `MES_CUSTOMER_DATABASE_URL` in customer BE `.env` or process environment. A customer database must first be audited and have a specific approved baseline profile with `allowed_targets:["customer"]`. This release does **not** provide one: customer initialization deliberately rejects. Do not repurpose the Dev profile or rename it without an agent review.

Once customer schema audit and profile are approved, follow backup/maintenance steps, then use `--scan --target customer` and `--init-baseline --target customer --profile <approved_id> --confirm-server "<@@SERVERNAME from scan>" --confirm-database <exact DB_NAME()> --backup-confirmed`. Subsequent deployment updates replay V0001..Vn sequentially and preserve receipts, never replay successful versions.

## D. Troubleshooting

- `REJECT missing DATABASE_URL`: activate correct BE virtual environment and place URL in BE `.env` (never print password).
- `REJECT no migration ledger`: expected before init; inspect candidate baseline verification, then explicitly initialize.
- `REJECT baseline schema mismatch`: source DB changed since audit. Ask agent for new audited evidence; do **not** bypass profile check.
- `REJECT checksum mismatch`: an already released migration/profile was edited, or local files are stale. Recover original package and compare with agent.
- `REJECT at dbo.Table / columns|indexes|foreign keys`: copy the *sanitized* SQLSTATE/native_code and stage to the agent. Migration Manager v1.0.1 quotes reserved T-SQL aliases (especially `[identity]`) and reports the failing metadata query stage without exposing database URL or SQL parameters. Do not edit the baseline profile to make it pass.
- `SAWarning: Unrecognized server version info` for SQL Server 17.x is a SQLAlchemy dialect warning, not proof of a failed login. The actual catalog verification result determines whether the baseline is eligible.
- `REJECT lock` or DB operation failed: another operator may be migrating, or SQL permission/ODBC/transaction issue. Check locally and do not rerun blindly after unknown connection loss.
- `--apply` needs `--confirm-server`, `--confirm-database` and `--backup-confirmed` (even when no pending versions). Database backup/restore is performed by operator/DBA, NOT by this tool.

## E. Reporting back to the agent

Safe to share `--scan`, `--status`, `--history` output with passwords removed. Do not upload `.env`, SQL credentials, full business records or unreviewed customer data. Source and schema documentation is in `docs/mes_agent/database/`.
