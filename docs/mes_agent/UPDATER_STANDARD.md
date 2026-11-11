# Required updater standard — IPTH MES

## Hard requirements

1. **Location:** Python updater is delivered/copied to `Interplex_MES_FE` (or `Interplex_MES_FE/developer_tools`).
2. **Invocation cwd:** user runs from `Interplex_MES_BE`, e.g.
   ```bash
   cd ~/IPTH_Traceability/Interplex_MES_BE
   python ../Interplex_MES_FE/IPTH_Feature_vX_Updater.py --scan
   python ../Interplex_MES_FE/IPTH_Feature_vX_Updater.py --apply
   ```
   Must locate project root by **filesystem markers**, not current script directory assumptions or hardcoded username.
3. **Mandatory `--scan` with fail-closed compatibility gate:** no writes, no DB updates, no backups created; print patch version, detected Git branches if available, each source file state (current/expected/after SHA256), **each `.md` file**, and every declared compatibility check (PASS / WARN / REJECT) with observed/expected values. Return nonzero for any REJECT. Missing required compatibility evidence is REJECT, not a warning. See `COMPATIBILITY_POLICY.md`.
4. **Mandatory `--apply`:** repeat all source hash, version, dependency and interface checks, refuse REJECT, unknown source or partial installs, back up exact original bytes **outside BOTH Git repositories** (e.g. `~/.ipth_mes_updater_backups`), atomically write code and documentation, roll back partial writes on failure. Never blindly overwrite developer modifications.
5. **Idempotency:** fully applied patch should be recognized; repeated `--apply` should be a no-op, not re-apply or make duplicate backups.
6. **Scope:** no database/data migrations, destructive resets, .env/secret modification, udev/permission changes, or broad Git operations unless the user separately authorizes them.
7. **Docs are part of the patch**; a code-only updater is **incomplete** under this standard. Don't publish new code without corresponding module docs and release note.
8. **Testing:** run Python compile or JSX lint/build as applicable, plus module-specific unit/manual cases. Describe untested runtime integrations honestly.
9. **Rollback:** preferably support `--rollback`/`--remove`, checking hashes to avoid overwriting subsequent work; show backup location.
10. **Required compatibility declaration:** every updater manifest or self-contained script records approved source baselines and explicit critical compatibility checks for applicable APIs, schema contracts, Python/Node dependencies and Git expectations. Treat unknown critical states as REJECT. No automatic bypass option. Scans must identify which checks were actually performed, not claim complete semantic compatibility.
11. **Result contract:** PASS or PASS WITH WARNINGS only when all critical checks succeeded; REJECT must prevent `--apply`, with actionable reasons and required source collection.

## Required documentation per patch

- Update the affected `docs/mes_agent/modules/<module>.md` with **behavior, data flow, API endpoints, FE/BE ownership, error handling, and regression tests**.
- Update `docs/mes_agent/CHANGELOG.md` with version, date, changed module docs and a link to release note.
- Add `docs/mes_agent/changes/YYYY-MM-DD-<short-id>.md` with **problem, requirement, source paths, before/after behavior, API and CSV contracts, tests/results, migration/deployment risks and rollback**.
- Refresh `MODULE_INDEX.md` if source ownership or new API changed; refresh `SYSTEM_ARCHITECTURE.md` if data flow changed.
- List **all** existing docs reviewed (even unchanged) separately from docs modified in each `--scan` report. Distinguish verified source and assumptions.
- Add source provenance (collector ZIP name or Git SHA, observation date); do not claim live production equivalence without verification.

## Patch manifest/template

`developer_tools/IPTH_Updater_Template.py` is a functional **manifest-driven runner**. A future agent prepares a patch directory containing:

```text
my_patch/
  manifest.json
  files/
    Interplex_MES_FE/src/...changed.jsx
    Interplex_MES_FE/docs/mes_agent/modules/...md
    Interplex_MES_FE/docs/mes_agent/CHANGELOG.md
    Interplex_MES_FE/docs/mes_agent/changes/YYYY-MM-DD-id.md
    Interplex_MES_BE/app/...changed.py
```

Manifest structure:

```json
{
  "update_id": "2026-11-07-my-module-v1",
  "summary": "One concise sentence describing change",
  "compatibility": {
    "schema": 1,
    "checks": [
      {"id": "python-version", "kind": "python_version", "min": "3.11", "max_exclusive": "3.15", "severity": "critical"},
      {"id": "fe-package-exists", "kind": "file_exists", "path": "Interplex_MES_FE/package.json", "severity": "critical"}
    ]
  },
  "files": [
    {"path": "Interplex_MES_FE/src/...", "before_sha256": "<64-digit-sha256>", "after_sha256": "<64-digit-sha256>"},
    {"path": "Interplex_MES_FE/docs/mes_agent/changes/2026-11-07-my-module-v1.md", "before_sha256": null, "after_sha256": "<64-digit-sha256>"}
  ],
  "documentation": {
    "updated": [
      "Interplex_MES_FE/docs/mes_agent/modules/batch_allocator.md",
      "Interplex_MES_FE/docs/mes_agent/CHANGELOG.md",
      "Interplex_MES_FE/docs/mes_agent/changes/2026-11-07-my-module-v1.md"
    ],
    "reviewed_unchanged": ["Interplex_MES_FE/docs/mes_agent/SYSTEM_ARCHITECTURE.md"],
    "release_note": "Interplex_MES_FE/docs/mes_agent/changes/2026-11-07-my-module-v1.md"
  }
}
```

For **every** changed file, put content at exact matching relative path below `files/` and calculate `after_sha256` for bytes. For an existing file, `before_sha256` must equal exact current bytes before patch. For new file, set `before_sha256: null`. The template enforces the docs list, verifies every payload hash, and **rejects** patches without a valid nonempty `compatibility.checks` declaration. The example checks above are illustrative; each real patch must identify and test its own critical dependencies and contracts.

Run from BE:

```bash
python ../Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py --scan --patch-dir ~/Downloads/my_patch
python ../Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py --apply --patch-dir ~/Downloads/my_patch
python ../Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py --rollback --update-id 2026-11-07-my-module-v1
```

A future agent can also package a **single self-contained updater .py** with embedded payloads, as older IPTH patches did; it must adhere to the same preflight/docs/backups rules.

## Git safety

`Interplex_MES_FE` and `Interplex_MES_BE` were operated as separate repositories. Before publishing inspect each branch: `git status -sb; git branch --show-current; git remote -v`. Committing to `phase2` then executing `git push origin main` does **not** push `phase2`. To publish current branch prefer `git push -u origin HEAD`, after reviewing the target branch. Never `git add .` blindly when prior backups, EXEs, ZIPs or dist artifacts may be present.


<!-- MES2_RAW_V0001_MANUAL_SQL BEGIN -->
## Manual SQL release policy (effective 2026-11-09)

For DB-impacting releases, the **Python updater may install versioned SQL files and Markdown, but MUST NOT execute DDL/DML**. It must make clear whether its scan verdict covers only local source/artifacts or the actual database. DB changes are executed by the operator, using `00_PRECHECK.sql` then `01_APPLY.sql` then `02_VERIFY.sql` after backup, tracking SHA256 per environment. The previous automatic V0000 DB migration process is historical only. Refer to `database/MANUAL_SQL_MIGRATION_STANDARD.md`.
<!-- MES2_RAW_V0001_MANUAL_SQL END -->
