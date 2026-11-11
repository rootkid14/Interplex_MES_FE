# MES2 — DB Migration Architecture (Manager v1 implemented)

**Implementation:** `Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py`, version `1.0.0` (2026-11-07).
**Evidence:** IPTHData_Dev catalog audit (`DB_CATALOG.json` in the 2026-11-07 reviewed audit); 2026-11-07 source collection. Customer database **not audited**. No RAW schema migration is implemented or applied by this package.

## 1. Strict separation

- **Code updater** is a standalone `.py` in FE, run with `--scan/--apply` from BE. It modifies source/docs only. Its scan must validate its own source hashes and the DB schema version required by the release. It never runs DDL.
- **DB Migration Manager** in FE/developer_tools is invoked independently from BE. It reads SQL Server URL from BE `.env` or process env (`DATABASE_URL` for dev, `MES_CUSTOMER_DATABASE_URL` for customer). It never modifies FE/BE source.
- **Release manifest** specifies `supported_db_schema_min`, `supported_db_schema_max`, `required_migrations`. `--check-release --release-manifest FILE` validates actual database history only. The code updater must independently validate source/Git state; DB tool alone does **not** prove code compatibility.

## 2. File layout

```text
Interplex_MES_FE/
  developer_tools/IPTH_DBMigrationManager.py
  docs/mes_agent/database/DB_MIGRATION_ARCHITECTURE.md
  docs/mes_agent/database/DB_MIGRATION_RUNBOOK.md
  docs/mes_agent/database/DB_MIGRATION_AGENT_HANDOFF.md
  docs/mes_agent/changes/2026-11-07-db-migration-manager-v1.md
Interplex_MES_BE/
  database/baselines/dev_ipthdata_20261107.json
  database/migrations/V0000__baseline/manifest.json
  database/migrations/V0000__baseline/README.md
```

The baseline is **not** a SQL snapshot restoration; it registers a validated starting point. Future migrations will be `V0001__...`, `V0002__...`, each with a `manifest.json`, `up.sql`, `precheck.sql`, `verify.sql`, and README. The runner checks contiguous ordering and artifact SHA256 hashes.

## 3. State and history

Manager creates `dbo.MES_SchemaMigrationHistory` only with explicit `--init-baseline` after matching the reviewed profile. History fields: `MigrationID`, `Description`, `ChecksumSHA256`, `AppliedAtUTC`, `AppliedBy`, `ToolVersion`, `ReleaseID`, `BeforeFingerprint`, `AfterFingerprint`, `DurationMs`, `BaselineProfileID`, `BaselineProfileSHA256`.

Uninitialized database: `--scan` verifies the candidate profile and reports **REJECT** because the ledger is not yet initialized; it provides the exact action needed. `--status` and `--history` can report uninitialized without writing. The profile is restricted to its target name + database name + compatibility level.

Applied migrations must be a **contiguous prefix** of the local migration chain. A missing/unknown ID or edited applied manifest/profile results in REJECT. All successfully committed versions are retained as receipts in SQL Server, not guessed from files. Once released/applied, migration SQL and manifests must never be edited; fix forward with a NEW migration.

## 4. Baseline scope and limitations

The initial **Dev-only** V0000 profile is derived from 2026-11-07 SQL catalog metadata of six tables: `Raw_Materials_Master`, `Batches_Master`, `Batches_Consumption_Log`, `Master_WO_Log`, `ModelConfigs`, `AssyPackingLinkage`.

For each of these, compare column type/size/nullability/identity/default PRESENCE/collation, index name/columns/uniqueness/filtered FLAG, FK metadata and CHECK existence/enabled/trusted status. It does **not** include the other ~91 tables, business rows, filtered-index expressions, check definitions or default expressions. Do not call it an exact fingerprint of the entire production database.

A **customer DB must have its own audited/approved profile**. `--target customer` refuses this Dev-only profile, even when the shapes happen to match. Profiles are independent immutable files: adding a new customer profile does not rewrite V0000 manifest. The history V0000 row records the particular profile hash and fingerprint. Never mark a database V0000 without proof.

The audit found potential application/schema mismatch (`DBRawMaterialsMaster` ORM primary key vs physical `ID`) and missing `RawMaterialLog` in the Dev DB although Packing source references it. These are research concerns, NOT an automatic invitation to modify tables.

## 5. Command semantics and safety

| Mode | Reads DB? | Writes DB? | Notes |
| --- | --- | --- | --- |
| `--verify-package` | No | No | Check structure/continuity/files/hashes offline |
| `--scan --target dev` | Yes | **No** | Prints actual server/DB/version and compatibility verdict; checks baseline or receipt and pending first precondition |
| `--status`, `--history` | Yes | **No** | Shows actual DB state; no bootstrapping |
| `--init-baseline` | Yes | **Only ledger** | Requires reviewed profile, exact `--confirm-server` + `--confirm-server`, `--confirm-database`, `--backup-confirmed`; exclusive session application lock + transaction |
| `--apply` | Yes | **Yes, pending approved migrations only** | Rechecks under lock, one transaction + verified receipt per step; rerun no-op on applied steps |
| `--check-release` | Yes | **No** | Checks DB schema version against a code-release manifest; not FE/BE code hashes |

No `--force` or `--skip-checks` switch exists. A rejected scan blocks apply. If SQL connection fails, verify target, ODBC Driver 18, firewall and credentials locally; do not paste secrets into chat. Audit logs/console never print connection string or password.

**Lock:** uses `sys.sp_getapplock` with `@LockOwner='Session'` in selected database, released in `finally`; negative return code is a blocker. **Transactions:** for each *explicitly reviewed transactional SQL migration* it executes `precheck.sql` (must return scalar 1), all `GO` batches inside one SQL transaction, `verify.sql` (scalar 1), computes fingerprint for affected tables, and inserts success row in the same transaction. On failure roll back and stop. `SET XACT_ABORT ON` enabled for the transaction. No automatic reversal of committed schema changes.

**Intentional limitations:** Unsupported resumable backfills, non-transaction-safe operations, destructive migrations, upgrades which require data repair, and changing customer-owned `IPTH_*` tables must use a separately reviewed/manual migration procedure. The tool does not silently treat arbitrary SQL as safe. `--scan` evaluates the first pending precheck; later prechecks are performed immediately before each step while holding the lock because they depend on preceding migrations. This is not an exhaustive proof of all application behavior.

## 6. Future migration manifest contract

```json
{
  "format": 1,
  "migration_id": "V0001",
  "parent": "V0000",
  "kind": "transactional_sql",
  "min_compatibility_level": 100,
  "description": "Reviewed additive MES-owned schema change",
  "release_id": "MES2_RAW_R1",
  "reviewed_for_transactional_execution": true,
  "backup_required": true,
  "customer_approved": false,
  "affected_objects": ["dbo.ExampleMESOwnedTable"],
  "up": {"file": "up.sql", "sha256": "SHA256_OF_UP_SQL"},
  "precheck": {"file": "precheck.sql", "sha256": "SHA256_OF_READONLY_SELECT"},
  "verify": {"file": "verify.sql", "sha256": "SHA256_OF_READONLY_SELECT"}
}
```

`precheck.sql` and `verify.sql` must each be a single read-only `SELECT` returning exactly `1` when their conditions are met. Scripts must be reviewed for target DB compatibility, lock duration, and correctness. `GO` is supported as a batch separator in `up.sql`. NEVER mutate an already applied migration artifact: create a new version for corrections.

## 7. Deployment order

1. Audit customer schema (on a restored replica if possible), author and independently review customer baseline profile. Confirm existing DB backup and tested restore.
2. `--scan --target customer` → `--init-baseline` if eligible; otherwise REJECT, investigate before writes.
3. When later migration releases exist: scan pending V0001...Vn, backup, execute `--apply` **in order** in maintenance window; verify `--history`.
4. Run Code Updater `--scan` (including schema release requirements), then `--apply`. Restart FE/BE and execute production smoke tests.
5. For non-additive changes use expand → code → backfill → contract across separately approved releases. Never assume code rollback reverses DB.

## 8. Acceptance and still-required verification

Offline unit tests: fingerprint vs audit, drift rejection, artifact hash and chain rejection, ledger tampering and version gating, read-only SQL artifact checks. **Not yet live-tested on SQL Server** in this ChatGPT environment; verify on `IPTHData_Dev` and a disposable customer DB clone before production. Test lock contention, transaction rollback, ODBC driver behavior, and exact baseline match in real SQL Server.
