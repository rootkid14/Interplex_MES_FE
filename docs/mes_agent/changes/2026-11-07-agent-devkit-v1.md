# Agent DevKit v1 — 2026-11-07

## Goal

Provide persistent, source-grounded MES architecture handoff notes and reusable collector/updater tooling so another LLM agent can resume without relying on chat history.

## Changed / added files

- `docs/mes_agent/README.md`, `SYSTEM_ARCHITECTURE.md`, `MODULE_INDEX.md`, `SOURCE_INVENTORY.md`, `CHANGELOG.md`, `SOURCE_COLLECTOR.md`, `UPDATER_STANDARD.md`, `AGENT_STARTER_PROMPT.md`
- `docs/mes_agent/modules/*.md`
- `docs/mes_agent/changes/2026-11-07-agent-devkit-v1.md`
- `developer_tools/IPTH_SourceCollector.py`, `IPTH_Updater_Template.py`, and `requests/allocator_routing.example.json`

## Behavior

**No runtime FE/BE application code or DB schema/data changed.** The DevKit adds developer-only tools and docs under the FE repo. The collector reads only selected source and writes a ZIP outside the repos by default. The template patcher requires docs updates with every code patch and stores backups outside both Git repos.

## Test plan

Run from `Interplex_MES_BE`: collector `--list`, `--scan`, `--collect`; inspect ZIP manifest. Run DevKit installer `--scan` then `--apply`. Test updater template against a synthetic patch on a temporary project: scan/apply/rollback. Verify no app code changed.

## Rollback

Use DevKit installer's `--rollback` only if files match the installed versions; its backups are kept outside Git repos. For future patches use the per-updater rollback mechanism. Do not use `git reset --hard` as a routine update strategy on deployment machines.
