# Starter instructions to send to a future coding agent

> Continue the IPTH Interplex MES project. The FE and BE are separate Git repositories under `~/IPTH_Traceability`. First read `Interplex_MES_FE/docs/mes_agent/README.md`, `SYSTEM_ARCHITECTURE.md`, `MODULE_INDEX.md`, `SOURCE_INVENTORY.md`, relevant `modules/*.md`, and `UPDATER_STANDARD.md`. Then use the SourceCollector in `Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py` (or provide me a module request JSON) to obtain a **fresh** code snapshot relevant to the task. Treat that snapshot as authoritative. Do not infer unseen modules. Every code change must be delivered as a Python updater **located in FE and run from BE**, with mandatory `--scan` (read-only) and `--apply` (preflight and safe writes), checksum checks, external backup, and module-specific MD + CHANGELOG + dated release note changes in the same patch. Enumerate files and documentation in scan, describe tests, and provide rollback. Never package secrets, database dumps, EXEs, node_modules or caches in source collector archives.

## How to ask the agent for a collection

Tell the agent: "I am modifying [MODULE]. Read source ownership in MODULE_INDEX and give me a collector command (or JSON request) using --module and --path."

## How to provide outcomes

Supply test logs, SQL response samples, or anonymized BOM extracts where needed. Never send `.env`, credentials, customer confidential exports unless explicitly required and appropriately protected.
