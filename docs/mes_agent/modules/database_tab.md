# Database tab — **requires fresh source collection**

**Known:** `Interplex_MES_BE/app/api/v1/api.py` registers `db_engine.router` under prefix `/dbengine`. A user requested showing `WorkCenter_Master` in the FE Database tab, but a full copy of Database tab FE/BE implementation was **not provided in the verified v4.1 ZIP**.

Do **not** assert the allowlist is frontend-only or backend-only until reading the real files. Use:

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module database_tab --scan
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module database_tab --collect
```

Look for: table registry/allowlist, read/query/edit/delete permissions, column metadata, pagination, schema name `dbo`, and API SQL identifier escaping. A table appearing in the dropdown does not automatically mean it is safe to allow write access.
