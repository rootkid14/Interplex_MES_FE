# Developer tools — updater compatibility and source collection

## Ownership

- `Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py`: creates module-scoped source archives for LLM handoff. Read-only source collection; inspect archive for secrets.
- `Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py`: applies agent-prepared manifest-and-payload patches with `--scan`, `--apply`, `--rollback`. Backups outside both repositories.
- `Interplex_MES_FE/docs/mes_agent/UPDATER_STANDARD.md` and `COMPATIBILITY_POLICY.md`: mandatory implementation and release gates.

## Compatibility flow

1. User runs updater `--scan` from BE; no files modified.
2. Validate manifest and payload after-hashes; identify unknown source before-hashes.
3. Verify explicit critical compatibility checks including Python/package versions, source function/API markers and JSON config as applicable; record PASS/WARN/REJECT.
4. Any unknown or failing critical check yields REJECT and nonzero exit. `--apply` repeats checks and cannot bypass failure.
5. PASS may proceed to guarded writes with backup and post-change testing; rollback verifies after-hashes.

## Known limitations

These are static/offline compatibility checks: live SQL Server state, hardware, browser integration and runtime API behavior require additional tests. If a patch depends critically on unverified runtime information, agent must reject before release and request current evidence.

## Regression cases

- Wrong source hash: REJECT; no writes.
- Missing declared API function marker: REJECT; no writes.
- Unsupported Python version / package missing: REJECT.
- Unsupported manifest schema or empty checks: REJECT.
- Optional advisory check missing: WARN, may proceed only if all critical checks PASS.
- Fully applied patch: no-op; `when: pre_apply` constraints skipped only in fully applied state.
- Partially applied patch: REJECT.
- Post-apply rollback restores bytes and refuses overwriting later modifications.

## MES2 database migration tracking v1.0

- `developer_tools/IPTH_DBMigrationManager.py` manages SQL Server database schema versions independently from code updaters. `--scan` is read-only; `--init-baseline` requires approved catalog profile and exact database confirmation; `--apply` revalidates and runs future migrations sequentially with SQL Server application lock and transaction.
- Migration files live in BE `database/migrations/VXXXX__...`, and reviewed baseline profiles live in `database/baselines/`. See `docs/mes_agent/database/{DB_MIGRATION_ARCHITECTURE.md,DB_MIGRATION_RUNBOOK.md,DB_MIGRATION_AGENT_HANDOFF.md}`.
- Initial release only registers Dev V0000; no customer profile and no V0001 RAW schema migration yet. Customer adoption is REJECT until independently audited.
