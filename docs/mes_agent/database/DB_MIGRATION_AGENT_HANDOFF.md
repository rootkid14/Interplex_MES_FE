# Agent handoff — MES DB migrations

**Last reviewed:** 2026-11-07; Manager v1.0 implemented; Dev/customer database not modified within this chat.

## Current facts

- Two independent lifecycles: FE/BE code updater (`--scan/--apply`), SQL Server migration runner (`--scan/--init-baseline/--apply/--status/--history`). They coordinate via a release manifest, not shared mutable version strings.
- Database metadata is from `IPTHData_Dev` (SQL compatibility level 100, 97 tables in audit). Baseline V0000 is **Dev-only** and compares six RAW/Batch/MES tables: `Raw_Materials_Master`, `Batches_Master`, `Batches_Consumption_Log`, `Master_WO_Log`, `ModelConfigs`, `AssyPackingLinkage`.
- The user requires **customer DB deployment to replay every migration since adoption**, without manually remembering SQL scripts. No real migration >V0000 is shipped yet.
- `Raw_Materials_Master.QTY` already `DECIMAL(18,4)`; original RAW API takes Python float and lacks Serial/UOM/remainder control. Source `packing_master.py` references RawMaterialLog absent in Dev audit. Do not invent a table to repair this without reviewing packing.
- Baseline index filter expressions, CHECK and default SQL definitions were NOT included in audit; the v1 fingerprint checks their flags/presence and core catalog metadata, not those expressions. Real DB integration tests still required.

## Implemented paths

- `Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py`
- `Interplex_MES_BE/database/migrations/V0000__baseline/{manifest.json,README.md}`
- `Interplex_MES_BE/database/baselines/dev_ipthdata_20261107.json`
- `Interplex_MES_FE/docs/mes_agent/database/{DB_MIGRATION_ARCHITECTURE.md,DB_MIGRATION_RUNBOOK.md,DB_MIGRATION_AGENT_HANDOFF.md}`
- `Interplex_MES_FE/docs/mes_agent/changes/2026-11-07-db-migration-manager-v1.md`

## Immediately next

1. Install source/docs with code updater and get `--scan` log on real dev machine.
2. Run DB `--verify-package`, `--scan --target dev`. For uninitialized DB: baseline match should PASS but overall REJECT pending manual `--init-baseline`.
3. Take verified Dev DB backup; run `--init-baseline` only if schema matches and exact DB identity verified; inspect history.
4. Audit the customer's DB separately; author a customer-specific *reviewed* baseline profile, never clone the Dev approval blindly.
5. Design V0001+ for RAW Material only after resolving serial identity, UOM, decimal allocations, transfers, and packing/traceability compatibility.
6. Every future migration: reviewed SQL, precheck & verify scalar SELECT 1, hash-locked artifacts, transactional tests, immutable version, changelog and module Markdown update, release schema contract.

## Compatibility rejection protocol

If scan REJECTS, require specific path/contract mismatch and a fresh collector zip. Never use `--force`, never edit applied SQL, never erase a migration receipt to make a new script run. A committed DB migration cannot be blindly rolled back by FE/BE code rollback; use restore or reviewed forward fix.
