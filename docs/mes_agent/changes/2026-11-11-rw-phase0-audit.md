# MES2 — RW Phase 0 architecture audit tooling (2026-11-11)

- Adds `developer_tools/IPTH_RW_ArchitectureAuditor.py` for read-only RW source/SQL catalog audit, producing a zipped Markdown/JSON handoff.
- Adds `developer_tools/requests/rw_phase0.json` for collecting RW-related source with the established collector.
- Adds `BE/database/sql_audits/RW_PHASE0_READONLY.sql` with metadata-only SQL statements.
- Adds `docs/mes_agent/rework/*`: locked business rules, verified 07/11 findings, architecture proposal, open decisions and runbook.
- Updates `MODULE_INDEX.md` and `CHANGELOG.md` additively.
- No runtime application code is changed. No SQL migration performed. Phase A is the next step after current-source audit.
