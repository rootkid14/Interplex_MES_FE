# IPTH MES — Manual SQL Migration Standard v1.0

**Date:** 2026-11-09  
**Status:** Adopted workflow decision — manual database changes, automated code-only updater.  
**Priority:** This policy **supersedes** the previously proposed `IPTH_DBMigrationManager.py` V0000 auto-baseline/migration workflow. Previously distributed documents describing automatic `--init-baseline`/`--apply` on SQL Server are historical proposals, **not the active deployment procedure**.

## 1. Separation of responsibilities

**Code changes:** Agent supplies a self-contained Python updater in `Interplex_MES_FE`, invoked from `Interplex_MES_BE` with `--scan` and `--apply`. It patches only FE/BE source and documentation, never executes DDL/DML, never initializes migration ledgers, and never edits a database. `--scan` is strictly read-only; `--apply` re-checks local source compatibility, backs up source outside repositories, and records documentation changes. Code updater MUST not auto-run included SQL.

**Database changes:** Agent supplies reviewed SQL files. The user performs all SQL actions manually on each authorized database, including dev/customer, in explicit order. The agent never assumes dev schema equals customer schema and cannot claim a customer's migration was executed without evidence.

**Database audit:** The read-only DB audit/collector tools can connect using a local environment variable (never hardcode or print credentials) and collect *schema metadata* (tables, columns, types, constraints, indexes, views, triggers, dependencies), code-to-table references and aggregate health checks when separately authorized. Audit does not mutate DB, create history tables, or read/export business records by default. Keep source and database provenance explicit.

## 2. Release layout

Store versioned SQL in `Interplex_MES_BE/database/sql_updates/`. For example:

```text
Interplex_MES_BE/database/sql_updates/
  README.md
  V0001__raw_lot_registry/
    00_PRECHECK.sql
    01_APPLY.sql
    02_VERIFY.sql
    RELEASE_NOTES.md
  V0002__raw_consumption_log/
    ...
```

A numbered release is **immutable once used on any database**. A correction must be a **new version**. Do not repurpose filenames or silently edit SQL already executed on the customer. Include SHA256 for `01_APPLY.sql`, prerequisites (prior SQL IDs, code versions), scope, risk classification, backup/restore plan, expected results, and post-deployment checks.

## 3. Workflow for each schema change

1. **Collect current source and audit target schema (read-only).** Inventory affected tables, consumers and API/data contracts; collect metadata for every target deployment database when possible.
2. **Design:** Agent specifies intended schema delta, backfill/data consequences, and safe order relative to the app release. If business schema is ambiguous or data-dependent, stop and ask for more audit evidence.
3. **Publish three SQL artifacts:** `00_PRECHECK.sql` (read-only, fails on wrong database, wrong starting schema, duplicates/null conflicts); `01_APPLY.sql` (fully explicit, re-validates prerequisites, atomic transaction when supported, fails closed, never hides errors); `02_VERIFY.sql` (read-only postconditions, integrity checks). Publish `RELEASE_NOTES.md` with the exact order.
4. **Dev:** Operator backs up and tests recovery, runs PRECHECK -> APPLY -> VERIFY, saves outputs and records the exact SQL checksum in the manual deployment tracker. Run integration tests before releasing the code updater.
5. **Customer:** Operator selects customer DB explicitly, checks schema and backup, runs **only pending** SQL scripts *in numeric order*, confirms VERIFY after each, records the result, and only then applies/activates compatible code. Never automatically assume that a customer DB has the Dev V0000 baseline.
6. **Handoff:** Update MES docs (`docs/mes_agent`), changelog, source inventory, SQL history and compatibility notes; clearly distinguish verified deployments from planned ones.

Suggested ordering for backward-compatible features is **DB expand -> code release -> data backfill (if any) -> later contract cleanup**. Actual order must be written per release. Schedule downtime where old and new software cannot coexist safely.

## 4. Guardrails and rejection behavior

- A precheck must verify target database name, supported starting structure, necessary data conditions, and prior migration evidence; if these cannot be verified: **REJECT**, do not run APPLY. Ensure SQL APPLY repeats necessary checks to avoid stale precheck results.
- A code updater affecting DB contracts must specify required tables/columns/types/indexes/API contract. Its `--scan` should verify safely using **read-only** SQL inspection when a DB is available; otherwise report **REJECT / UNVERIFIED** for critical compatibility, not a false PASS. It cannot execute schema-changing SQL.
- Each SQL APPLY should be reviewed for idempotence/re-run protection. Prefer **fail-on-second-execution** plus a separate diagnostic over silently skipping work. Require explicit post-verification. Do not infer success from zero exceptions alone.
- Do not automate rollback of committed migrations; use a separately reviewed rollback/restore plan. A transaction protects only work inside its successful transactional boundary.
- Do not modify `IPTH_*` customer-owned objects unless the particular change has been approved and audited. Keep destructive migrations separate from ordinary additive changes.
- Retain SHA256 and execution evidence per environment. A manual tracker is **not** self-verifying; scan must inspect actual DB state rather than trusting checkmarks in a document.
- If any SQL script fails midway, **stop**. Inspect transactional state and VERIFY; never simply rerun APPLY until the state is understood.

## 5. Manual deployment tracker

The operator maintains a file or release register containing: environment/database identifier (no passwords), SQL migration ID, filename, SHA256, execution timestamp/operator, precheck result, postcheck result, code release, and backup reference. Recommended template: `DB_MANUAL_DEPLOYMENT_TRACKER.csv`. Do not commit customer identifiers, credentials or sensitive records to a public repository.

## 6. Existing V0000 state at policy switch

As of the latest user-shared logs, `IPTHData_Dev` matched the **six-table Dev baseline**, but the DB ledger did not exist; attempted `--init-baseline` returned `OperationalError`. **Do not claim V0000 was registered. Do not run `--init-baseline` again as part of this new workflow.** No additional DB write can be inferred from that log; confirm state with a read-only check when needed. The manual SQL release sequence starts with the first actual schema-changing SQL file (e.g., `V0001`). A database-only history table is optional, not required in this manual model.

## 7. Required agent deliverables for each MES2 change

- Source collector request and source versions/hashes; read-only DB audit summary plus uncertainties.
- Code updater `.py` (`--scan`, `--apply`) only if code changes are needed, with docs and changelog.
- Three SQL files plus release notes whenever DB changes are needed (never bundled for auto-execution).
- Schema compatibility matrix, regression test plan/results, and manual deployment tracker instructions.
- Concise handoff describing exact state of Dev and Customer as **verified**, **reported**, or **unknown**.


## V0001 release

See `RAW_MATERIAL_V0001_SCHEMA.md` and `Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/RELEASE_NOTES.md`. There is no automatically initialized V0000 ledger; V0001 is the first manual schema release.
