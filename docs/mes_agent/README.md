# IPTH / Interplex MES — Agent Handoff (start here)

**Documentation snapshot:** 2026-11-07. **Source baseline used:** user-provided `ipth_allocator_routing_v4_sources.zip` and v4.1 updater payload from 2026-10; additional uploaded `WoValidation.py`, `WctrSelectionModal.jsx`, Zebra printer v4.1, and SQL scripts. **Not** an automatic scan of the currently deployed repositories. Source code in a fresh collector archive always takes precedence over this document.

## Read order for any new agent

1. `SYSTEM_ARCHITECTURE.md` — subsystems, process and data flow.
2. `MODULE_INDEX.md` — ownership and exact filenames, with verified vs uncertain status.
3. Relevant `modules/*.md` — contracts, user workflows, pitfalls, tests.
4. `UPDATER_STANDARD.md` and `COMPATIBILITY_POLICY.md` — **mandatory** updater requirements `--scan` / `--apply`, MD documentation updates, safe backup.
5. `CHANGELOG.md` and latest `changes/*.md` — why the design changed.
6. Request **current code** with `developer_tools/IPTH_SourceCollector.py`; don't modify from this document alone.

## Current user requirements (recorded)

- Project root commonly `~/IPTH_Traceability`; independent subdirectories/repos `Interplex_MES_FE` and `Interplex_MES_BE`.
- Every future updater must be **placed in FE** and run **from BE** using Python, e.g.
  ```bash
  cd ~/IPTH_Traceability/Interplex_MES_BE
  python ../Interplex_MES_FE/IPTH_SomeUpdater_vX.py --scan
  python ../Interplex_MES_FE/IPTH_SomeUpdater_vX.py --apply
  ```
- `--scan` is strictly read-only, requires explicit version/dependency/API preflight checks (PASS/WARN/REJECT), rejects unknown critical states, and must detail all code and Markdown files to be affected; `--apply` checks the same preconditions, backs up original bytes outside FE/BE Git repos and then modifies files.
- **Every release updates module documentation and changelog** along with source; a new agent should reconstruct purpose, API contracts, impacts and rollback without rereading chat.
- Inhouse Allocator: show automatically discovered FERT target PN list (combobox, sorted), first PN selected by default; selected destination affects downstream Next Process. Manual fallback on routing failures; empty fallback prints `-`.
- Outsource Allocator: **Current PN = New Part Number (Sau Outsource)**, not original `ModelNO`; **Current Process = `Outsource`**. Resolve downstream from this Current PN using the same target FERT selection as Inhouse.
- Both Allocators export **six columns** `BARCODE,WO,QTY,CURRENT_PN,CURRENT_PROCESS,NEXT_PROCESS` via correctly quoted CSV text.
- Zebra printer: 100×75 mm, 300 DPI, Code128; QUALITY field **blank** for QA handwriting; compact UI for small displays; Windows `win32print` packaged for EXE.

## Collector examples (run from BE)

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --list
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --module batch_allocator --scan
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --module batch_allocator --collect
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --request ../Interplex_MES_FE/developer_tools/requests/allocator_routing.example.json --collect
```

Collector packages selected text/code paths, existing Markdown docs, SHA256 checksums, and a manifest. It does **not** read `.env`, `.git`, binary assets, DB dumps, ZIPs, or Python caches. Review archives before sharing; a code file can itself contain sensitive literals.

## Boundaries

- Some modules (Database tab, all FE pages, auth/security configuration, DB schema) have **not** been comprehensively inspected. See `modules/database_tab.md` and inventory; do not infer missing behavior.
- A successful unit test or synthetic BOM trial is **not** equivalent to production validation.


<!-- MES2_RAW_V0001_MANUAL_SQL BEGIN -->
## MES2 RAW V0001 (2026-11-09): MANUAL SQL workflow

The active DB deployment policy is **manual SQL**, not the old `IPTH_DBMigrationManager.py` V0000 ledger workflow. An operator runs `database/sql_updates/V0001__raw_material_lots_usage/{00_PRECHECK,01_APPLY,02_VERIFY}.sql` in the explicitly selected database after backup. The code updater copies SQL/docs only and does **not** execute SQL. See `database/MANUAL_SQL_MIGRATION_STANDARD.md` and `database/RAW_MATERIAL_V0001_SCHEMA.md`. The runtime RAW scanners are **not yet upgraded** by this SQL-only release.
<!-- MES2_RAW_V0001_MANUAL_SQL END -->
