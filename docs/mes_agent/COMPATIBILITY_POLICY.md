# MES Updater Compatibility Gate (DevKit v1.1)

**Required for every future patch.** Updater invocation stays unchanged: the `.py` resides in FE and is launched from the BE directory with `--scan` before `--apply`.

## Three outcomes and exit behavior

- **PASS**: mandatory checks have verified compatibility (file baselines, dependencies, declared contracts). Exit 0; apply may proceed.
- **WARN**: a declared *advisory* check fails (e.g. optional utility absent). Scan prints the reason; exit 0 if there are no REJECT results. Warning must not hide a critical requirement.
- **REJECT**: baseline is unknown, target source hash mismatched, a required dependency/contract is missing, patch partly applied, compatibility manifest is missing, or a critical check cannot be evaluated. Exit nonzero (2 for scan verdict); **`--apply` refuses writes**.

> A scan does not prove behavior is correct: static source checks cannot fully validate runtime APIs, SQL Server schemas, browser behavior or hardware. If a critical integration cannot be checked safely offline, it must be listed as **UNVERIFIED / REJECT**, and the agent must request extra code/evidence before releasing an updater; do not classify uncertainty as PASS.

## Mandatory manifest schema

The runner requires `manifest.json` key `compatibility`:

```json
{
  "compatibility": {
    "schema": 1,
    "checks": [
      {"id": "python-311-or-newer", "kind": "python_version", "min": "3.11", "max_exclusive": "3.15", "severity": "critical"},
      {"id": "routing-api-anchor", "kind": "file_contains", "path": "Interplex_MES_BE/app/api/v1/endpoints/routing_modes_api.py", "text": "routing/resolve", "severity": "critical"},
      {"id": "fe-project-json", "kind": "file_exists", "path": "Interplex_MES_FE/package.json", "severity": "critical"},
      {"id": "optional-doc-note", "kind": "file_exists", "path": "Interplex_MES_FE/docs/mes_agent/optional_note.md", "severity": "advisory"}
    ]
  }
}
```

Use **project-specific real anchors**, not a blind example. All `files[]` entries also need matching `before_sha256` (or `null` for a new file) and `after_sha256`. The baseline must match exactly; no auto-overwrite of unexpected code.

Supported compatibility kinds in DevKit v1.1 template:

| Kind | Input fields | Checks |
| --- | --- | --- |
| `file_exists` | `path` | Required FE/BE source exists |
| `file_sha256` | `path`, `accepted_sha256`: array | Source/dependency file matches one of the approved versions |
| `file_contains` | `path`, `text` | Required API/import/function anchor exists (UTF-8 substring) |
| `json_value` | `path`, `keys`: array, `equals` or `one_of` | `package.json` or config exact key value |
| `python_version` | `min`, `max_exclusive` | Current Python interpreter numeric version in range |
| `python_distribution` | `name`, `min`, `max_exclusive` | Installed Python package version in **current** interpreter |
| `git_branch` | `repo`: `FE` or `BE`, `allowed`: array | Active Git branch in explicit allowed set |

Each check needs a unique `id`; `severity` defaults to **critical**, not advisory. `when: "pre_apply"` skips its check *only when every patch payload already matches* (for idempotent re-scan after successful apply). Default `when: "always"` checks even when already applied. Invalid or missing `compatibility` declaration is itself REJECT.

### Important limits

1. `python_distribution` checks the environment running the updater. If production dependencies run under another venv, use its interpreter to invoke the updater or request separate runtime verification.
2. JSON package version strings are compared **exactly** using `json_value`; semantic npm ranges such as `^7.3.1` are not interpreted as installed versions. Read `package-lock.json` or collect runtime evidence when necessary.
3. No database connection and no external network calls are made by the template's scan. A patch that changes SQL contracts must specify how the agent verified them; reject if this is an unverified blocking risk.
4. Do not use a `--force`, `--ignore-version`, or blind overwrite to bypass REJECT. Recollect current files, inspect the diff, and make a compatible new updater.
5. Warnings must only describe conditions with no risk of changing target behavior. An uncertain *critical* condition is REJECT, not WARN.

## Agent handoff on REJECT

Include: updater ID, FE/BE branch, file path, expected SHA256 or interface, observed value, failing check IDs and what new collector source is needed. No files should have changed in `--scan`. Ask the user for the scan log plus collector ZIP; do **not** ask them to rerun `--apply` blindly.
