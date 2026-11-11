# MES2 RW — Phase 0 Audit Runbook

## What the updater does

Creates a dedicated **read-only** RW architecture auditor, SQL metadata inspection script, Collector request and Markdown documentation. Does not modify FE/BE runtime modules, create DB tables, edit `Master_WO_Log` or freeze batches.

## Installation (from Backend working directory)

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/IPTH_MES2_RW_Phase0_Updater.py --scan
python ../Interplex_MES_FE/IPTH_MES2_RW_Phase0_Updater.py --apply
```

The updater scans required source anchors and is idempotent. `--apply` repeats checks. On `REJECT`, do not bypass. `--rollback` safely restores only unchanged installed files from a backup outside Git repositories.

## Run Audit

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/developer_tools/IPTH_RW_ArchitectureAuditor.py --scan
python ../Interplex_MES_FE/developer_tools/IPTH_RW_ArchitectureAuditor.py --audit
```

Audit reads current FE/BE source, SQL Server **system catalogs only** (if DB accessible), and generates `~/Downloads/IPTH_RW_Phase0_Audit_<timestamp>.zip`. No production rows, SQL credentials or `.env` content are collected. The ZIP contains architecture summaries, source reference locations/hashes and DB schema metadata for RW-critical tables; no full source unless the optional `--include-source` is provided.

If SQL Server temporarily unavailable, use `--no-db --audit`: report marked `DATABASE_AUDIT_INCOMPLETE`; do not assume schema compatibility based on source alone.

## Collect full current source when agent needs it

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py \
  --request ../Interplex_MES_FE/developer_tools/requests/rw_phase0.json --scan
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py \
  --request ../Interplex_MES_FE/developer_tools/requests/rw_phase0.json --collect
```

Inspect ZIP before sharing, since even ordinary source files might contain embedded secrets. This collector is separate from the DB audit and does not include environment files by default.

## Optional manual SQL metadata inspection

Open `Interplex_MES_BE/database/sql_audits/RW_PHASE0_READONLY.sql` in your SQL client and execute against the intended **Dev** database. Script contains `SELECT` only and does not extract business rows.

## What to send agent

1. `IPTH_RW_Phase0_Audit_<timestamp>.zip`.
2. Collector ZIP if actual source changes or full logic review is required.
3. Any SQL client errors from `RW_PHASE0_READONLY.sql` (redact secrets).

## Next work package

**RW Phase A:** design manual SQL PRECHECK/APPLY/VERIFY for new RW tables and batch lifecycle validity, grounded in current audit; **RW Phase B/C:** backend and frontend updaters. Never run automatic DB schema modifications from the code updater.
