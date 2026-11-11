# Agent DevKit v1.1 — fail-closed updater compatibility scan

**Date:** 2026-11-07. **Motivation:** user requires `--scan` to reject incompatible updater versions/dependencies, not only list changed files.

## Changes

- Modified `developer_tools/IPTH_Updater_Template.py` to require `compatibility.schema=1` and at least one critical check, evaluate explicit version, hash, API-marker, config and branch checks, and report PASS/WARN/REJECT.
- `--apply` reruns all checks and refuses incompatibilities, unknown source hashes, and partly applied patches. Both commands are launched from BE while updater resides in FE.
- Added `COMPATIBILITY_POLICY.md`, this release note and `modules/developer_tooling.md`; updated standard, README, index and changelog.

## No runtime MES changes

Does not modify MES FE application code, BE endpoints, SQL Server tables, printer software, CSV contracts or deployments.

## Test matrix

- Python syntax compile, missing manifest rejects, wrong source hash rejects, missing critical API marker rejects, optional advisory emits WARN, successful scan/apply/rollback and idempotency on synthetic isolated project. No live deployment or SQL Server test is claimed.

## Risk / rollback

Existing v1 updater does not automatically learn the v1.1 compatibility gate. Install v1.1 on top of unmodified v1 DevKit. Changes to v1 tooling/docs since initial installation should trigger conflict and stop; recollect those files for agent review. Rollback restores exact pre-v1.1 bytes from backup outside FE/BE repos.
