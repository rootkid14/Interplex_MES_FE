# MES2 DB Migration Manager v1.0.1 — SQL catalog read-only hotfix

Date: 2026-11-07. This update modifies only `Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py` and Markdown documentation. No application runtime changes, no SQL migrations, and no database writes by the installer.

## Observed trigger

`--scan --target dev` confirmed SQL Server connectivity (`@@SERVERNAME`, `DB_NAME()`, version 17.x and compatibility 100), returned `DATABASE STATUS: UNINITIALIZED`, and then returned a generic error without query context. The failure occurred during candidate V0000 catalog inspection; the *exact SQL Server error has not yet been captured*.

## Suspected root cause and changes

- The original `sys.columns` query contained `c.is_identity AS identity` without identifier escaping. `IDENTITY` is a reserved SQL Server keyword; changed to `AS [identity]`. Other potentially ambiguous catalog aliases are now bracket-quoted while keeping Python field names unchanged.
- Every catalog query for columns, indexes, foreign keys and check constraints now reports a stage label and *sanitized* error type, SQLSTATE, native SQL Server error code and category. It never prints SQL statements, ODBC connection strings, parameter values or passwords.
- Baseline inspection lists the six managed tables as it checks them to distinguish failure locations.
- Kept the V0000 manifest, baseline profile and fingerprints **unaltered**. Schema mismatch still produces REJECT. `--scan` remains read-only and baseline registration requires a separate explicit command and backup confirmation.

## Compatibility / known limitations

- Supports installing over exactly the Manager v1.0.0 file hash `95b514d6b44bcd96b62fc005a21cb3ca81fb0d9dc8ed81c412761d37885a2f6f` in the originally delivered package. A modified manager is REJECTED until reviewed by an agent.
- `--scan` of the *code updater* checks local source and dependency compatibility and does not connect to SQL Server. Run the Manager's `--scan --target dev` after applying to verify the real database.
- SQL Server connectivity and the suspected alias parser issue have not been exercised against a live SQL Server from this environment. An additional database error may be revealed after this fix.

## Next command

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --scan --target dev
```

Do **not** run `--init-baseline` until the six-table fingerprint check passes and an independently verified DB backup is available.
