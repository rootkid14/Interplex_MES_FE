#!/usr/bin/env python3
"""MES2 RAW V0001 verifier hotfix (read-only SQL; never connects to SQL Server)."""
import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

RELEASE = "MES2_RAW_V0001_VERIFY_ERRATUM_20261109"
UPDATE_ITEMS = {'Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/02_VERIFY.sql': {'expected': '8e6fbd2a77b222ab32a2b2d89245914988ca8c48156a6b2185f5cbcab1ce8f0c', 'new': "/*\nIPTH MES2 / RAW MATERIAL / V0001 — 02_VERIFY.sql\nREAD-ONLY postcondition audit. Repeat at any time, including customer deployment.\nNever infer that code has been upgraded merely because these tables exist.\n*/\nSET NOCOUNT ON;\n\nSELECT DB_NAME() AS TargetDatabase, @@SERVERNAME AS TargetServer;\n\nIF OBJECT_ID(N'dbo.RawMaterialLots', N'U') IS NULL\n   OR OBJECT_ID(N'dbo.RawMaterialUsage', N'U') IS NULL\nBEGIN\n    RAISERROR(N'V0001 VERIFY REJECT: one or both tables absent.',16,1);\n    RETURN;\nEND;\n\nIF NOT EXISTS (\n    SELECT 1 FROM sys.columns AS c JOIN sys.types AS t ON c.user_type_id=t.user_type_id\n    WHERE c.object_id=OBJECT_ID(N'dbo.RawMaterialLots') AND c.name=N'OriginalQty'\n      AND t.name=N'decimal' AND c.precision=18 AND c.scale=4 AND c.is_nullable=0\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.columns AS c JOIN sys.types AS t ON c.user_type_id=t.user_type_id\n    WHERE c.object_id=OBJECT_ID(N'dbo.RawMaterialLots') AND c.name=N'UOMCode'\n      AND t.name=N'nvarchar' AND c.max_length=20 AND c.is_nullable=0\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.columns AS c JOIN sys.types AS t ON c.user_type_id=t.user_type_id\n    WHERE c.object_id=OBJECT_ID(N'dbo.RawMaterialLots') AND c.name=N'SerialNumber'\n      AND t.name=N'nvarchar' AND c.max_length=200 AND c.is_nullable=0\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.columns AS c JOIN sys.types AS t ON c.user_type_id=t.user_type_id\n    WHERE c.object_id=OBJECT_ID(N'dbo.RawMaterialUsage') AND c.name=N'ReceivedQty'\n      AND t.name=N'decimal' AND c.precision=18 AND c.scale=4 AND c.is_nullable=0\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.columns AS c JOIN sys.types AS t ON c.user_type_id=t.user_type_id\n    WHERE c.object_id=OBJECT_ID(N'dbo.RawMaterialUsage') AND c.name=N'RemainderOutQty'\n      AND t.name=N'decimal' AND c.precision=18 AND c.scale=4 AND c.is_nullable=1\n)\nBEGIN\n    RAISERROR(N'V0001 VERIFY REJECT: key column definitions differ from release.',16,1);\n    RETURN;\nEND;\n\nIF NOT EXISTS (\n    SELECT 1 FROM sys.key_constraints\n    WHERE parent_object_id=OBJECT_ID(N'dbo.RawMaterialLots')\n      AND name=N'UQ_RawMaterialLots_PartNumber_SerialNumber' AND type=N'UQ'\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.indexes\n    WHERE object_id=OBJECT_ID(N'dbo.RawMaterialUsage')\n      AND name=N'UX_RawMaterialUsage_OneCurrentPerLot'\n      AND is_unique=1 AND has_filter=1 AND filter_definition IS NOT NULL\n)\nOR NOT EXISTS (\n    SELECT 1 FROM sys.indexes\n    WHERE object_id=OBJECT_ID(N'dbo.RawMaterialUsage')\n      AND name=N'UX_RawMaterialUsage_NoForkedTransfer'\n      AND is_unique=1 AND has_filter=1 AND filter_definition IS NOT NULL\n)\nBEGIN\n    RAISERROR(N'V0001 VERIFY REJECT: unique identity/current/chain constraints missing.',16,1);\n    RETURN;\nEND;\n\nIF (SELECT COUNT(*) FROM sys.foreign_keys\n    WHERE parent_object_id=OBJECT_ID(N'dbo.RawMaterialUsage')\n      AND name IN (N'FK_RawMaterialUsage_Lot', N'FK_RawMaterialUsage_PreviousSameLot')\n      AND is_disabled=0 AND is_not_trusted=0) <> 2\nBEGIN\n    RAISERROR(N'V0001 VERIFY REJECT: foreign keys missing/disabled/untrusted.',16,1);\n    RETURN;\nEND;\n\nIF (SELECT COUNT(*) FROM sys.check_constraints\n    WHERE parent_object_id=OBJECT_ID(N'dbo.RawMaterialLots')\n      AND name IN (N'CK_RawMaterialLots_PositiveQty', N'CK_RawMaterialLots_NonemptyFields')\n      AND is_disabled=0 AND is_not_trusted=0) <> 2\n   OR (SELECT COUNT(*) FROM sys.check_constraints\n    WHERE parent_object_id=OBJECT_ID(N'dbo.RawMaterialUsage')\n      AND name IN (N'CK_RawMaterialUsage_PositiveQty',N'CK_RawMaterialUsage_Remainder',\n                   N'CK_RawMaterialUsage_State',N'CK_RawMaterialUsage_NotSelfReference')\n      AND is_disabled=0 AND is_not_trusted=0) <> 4\nBEGIN\n    RAISERROR(N'V0001 VERIFY REJECT: check constraints missing/disabled/untrusted.',16,1);\n    RETURN;\nEND;\n\nSELECT N'PASS - V0001 schema verified' AS VerifyVerdict, DB_NAME() AS DatabaseName;\nSELECT N'dbo.RawMaterialLots' AS TableName, COUNT_BIG(*) AS RecordCount FROM dbo.RawMaterialLots\nUNION ALL\nSELECT N'dbo.RawMaterialUsage', COUNT_BIG(*) FROM dbo.RawMaterialUsage;\n"}, 'Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/SHA256SUMS.txt': {'expected': '1717d406b340a77c5839e87ea3269572d702852e2f55241576f4fd27bfe22094', 'new': '8b63d7158561a5ca4700d3090a815f3c09668383a91336f29b9485bfa89ffd9a  00_PRECHECK.sql\nc1649c03050f184cd980a41d9541aa084051afb9c2cdf18291b64cf51b8d643e  01_APPLY.sql\ne42c77dd7fab5967b2f13ea9fb2786d08bf2931397f143a88d12d82855492946  02_VERIFY.sql\n'}, 'Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/RELEASE_NOTES.md': {'expected': 'f52713e35cca1cd3bedce59c9f0ab47ce9487e3f8857a22ca7e7b397b809ce8d', 'new': "# MES2 RAW Material — SQL release V0001\n\n**Release date:** 2026-11-09  \n**Type:** manual SQL, additive schema only  \n**Code change:** none  \n**Status:** package prepared; **not yet executed** on Dev or Customer SQL Server.\n\n## Scope\n\nCreate exactly two new application-owned SQL Server tables:\n\n- `dbo.RawMaterialLots`: one identity per `(PartNumber, SerialNumber)` with `OriginalQty DECIMAL(18,4)`, `UOMCode`, original barcode and registration metadata.\n- `dbo.RawMaterialUsage`: historical allocation of a RAW lot to a WO, with `ReceivedQty`, `RemainderOutQty`, previous usage link, current flag and timestamps.\n\n**Not included:** `MES_UOM` table, UOM conversions, application API changes, scan rule changes, data migration, cleanup or removal of `Raw_Materials_Master`, customer `IPTH_*` schema changes, or automatic migration ledger. `IPTH_BOM_LIST.Unit` remains the authoritative source **for future scan-rule configuration**, but V0001 does not query it to populate individual lots.\n\n## Requirements\n\n- Run on an approved SQL Server database with `compatibility_level >= 100` (the reviewed Dev DB reports 100).\n- Existing `dbo.IPTH_BOM_LIST.Unit` must be `NCHAR(10)`, legacy `dbo.Raw_Materials_Master.QTY` must be `DECIMAL(18,4)` and `dbo.Master_WO_Log.WO` must be `BIGINT`. `dbo.ModelConfigs` must exist. Different customer schema => **stop and audit**, do not weaken guards.\n- The database must not already contain objects named `dbo.RawMaterialLots` or `dbo.RawMaterialUsage`.\n- The operator must have a **tested database backup/restore plan** and permissions to create tables, indexes, constraints.\n- Use a SQL editor with the desired database explicitly selected. The SQL files contain **no `USE` statement** so the identical released bytes can be run on Dev and Customer; `DB_NAME()` is printed and system databases are blocked. **The operator is responsible for verifying database name before running APPLY.**\n\n## Manual run order\n\n1. Choose the intended database in SSMS/Azure Data Studio and note `SELECT @@SERVERNAME, DB_NAME();`. Perform/verify a restorable backup.\n2. Run `00_PRECHECK.sql` **against that database**, require its final `PASS` result and check target name.\n3. Run `01_APPLY.sql` **once** in the same database, require `PASS` and no error. This script rechecks prerequisites, uses `sp_getapplock` and a single explicit DDL transaction. It deliberately rejects re-execution.\n4. Run `02_VERIFY.sql` and require `PASS`. Save text outputs and all three SQL checksums in your private deployment tracker.\n5. Inspect the app and schedule the later **code updater** (RAW Scanner UOM/Serial/Transfer) separately; legacy code continues writing to `Raw_Materials_Master` until then.\n\nIf any script fails, **stop**. Capture the error number and status and inspect whether either target table exists; do not blindly rerun APPLY. Do not execute `DROP TABLE` to 'reset' the release on a production database. For a committed schema update, restore a verified backup or publish an explicitly reviewed corrective SQL version.\n\n## Lot/usage semantics\n\n- `RawMaterialLots` has a unique `(PartNumber,SerialNumber)` identity. A barcode reprint cannot create new stock. `SerialNumber` remains NVARCHAR to preserve leading zeros. Database collation determines case sensitivity; future Backend must define normalization/validation.\n- `UOMCode NVARCHAR(10)` stores **the verified barcode unit** for this lot. `IPTH_BOM_LIST.Unit` is `NCHAR(10)`; in the future configuration/API normalize `TRIM`, uppercase, check BOM-context ambiguity, then persist expected UOM in Model Config. Never convert KG to PCS automatically.\n- `OriginalQty`, `ReceivedQty`, `RemainderOutQty` are `DECIMAL(18,4)`. Use Python `Decimal`; do not use binary float for quantity accounting. FE may display integer-like values such as `2000.0` or fractional values such as `12.7500`.\n- Only one **current** usage per lot (`UX_RawMaterialUsage_OneCurrentPerLot`). Each prior usage can have at most one **successor**, and a predecessor must belong to the same lot (composite FK).\n- On transfer from WO A (received 2000) to WO B (remainder 500), close A (`RemainderOutQty=500`, `IsCurrent=0`, `ClosedReason=TRANSFER`, `ClosedAtUTC=...`), add B (`ReceivedQty=500`, `IsCurrent=1`, `PreviousUsageID=A`). This transaction is application logic to be implemented in the **subsequent code updater**. The balance attributed to A (1500) is not proof of physically measured consumption.\n- Schema constraints are necessary but **not sufficient** for concurrent duplicate/transfer protection; the Backend must lock the lot and recheck the active WO and remainder inside one transaction.\n- If simultaneous allocations to different WOs become a requirement, redesign current-owner invariant in a new version; do not silently permit it.\n\n## Audit/verification limitations\n\nThe SQL has been generated against source/catalog evidence from Dev, but has **not been executed against the live SQL Server** in this chat. `02_VERIFY.sql` verifies key column shapes, key/index names and enabled constraints; it does not exercise production barcode processing or the complete eventual API workflow. Customer DB may differ; always run PRECHECK first.\n\n\n## Verification script erratum — 2026-11-09\n\n- `02_VERIFY.sql` originally used `COUNT_BIG(*) AS RowCount` (a reserved T-SQL keyword) and could fail at parse time. Corrected the output alias to `RecordCount`.\n- **No DDL change**: `00_PRECHECK.sql` and `01_APPLY.sql` remain byte-for-byte identical; their existing hashes are unchanged.\n- This correction only affects the read-only verifier. If V0001 APPLY already succeeded, **do not run APPLY again**; run the corrected VERIFY only.\n- `SHA256SUMS.txt` was updated solely for the corrected verifier. The correction has not yet been executed against the user's SQL Server in this conversation.\n"}}
CHANGE_REL = 'Interplex_MES_FE/docs/mes_agent/changes/2026-11-09-raw-v0001-verify-erratum.md'
CHANGE_TEXT = "# MES2 RAW V0001 — VERIFY syntax hotfix (2026-11-09)\n\n**Affected artifact:** `Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/02_VERIFY.sql`\n\n**Observed:** After `00_PRECHECK.sql` and `01_APPLY.sql` completed successfully, `02_VERIFY.sql` raised `Incorrect syntax near 'RowCount'`.\n\n**Root cause:** T-SQL reserves `ROWCOUNT`; the last SELECT used the unquoted alias `RowCount`. Renamed the SELECT output alias to `RecordCount`.\n\n**Database impact:** None. The verifier is read-only; V0001 schema creation script is **unchanged**. This is a correction to a verification artifact, not a new schema migration.\n\n**Deployment:** Use the verify-hotfix updater (`--scan`, then `--apply`) from the BE working directory, and rerun **only** `02_VERIFY.sql` against the same database where V0001 was applied. Stop and report the full sanitized error if VERIFY fails. Do **not** rerun `01_APPLY.sql`.\n\n**Tracking:** `SHA256SUMS.txt` updates the checksum of `02_VERIFY.sql`, but not PRECHECK/APPLY. Record this verifier erratum with the V0001 release in the manual DB deployment log.\n\n**Evidence:** Original release artifact examined and static assertions tested locally; no live SQL Server execution by the assistant.\n"
CHANGELOG_REL = "Interplex_MES_FE/docs/mes_agent/CHANGELOG.md"
CHANGELOG_MARKER = '<!-- MES2_RAW_V0001_VERIFY_ERRATUM_20261109 -->'
CHANGELOG_APPEND = '\n<!-- MES2_RAW_V0001_VERIFY_ERRATUM_20261109 -->\n- 2026-11-09: MES2 RAW V0001 read-only verifier syntax hotfix: rename reserved alias `RowCount` to `RecordCount`; SQL APPLY and schema unchanged. See `changes/2026-11-09-raw-v0001-verify-erratum.md`.\n'
BASE = "Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/"
PRECHECK_SHA = "8b63d7158561a5ca4700d3090a815f3c09668383a91336f29b9485bfa89ffd9a"
APPLY_SHA = "c1649c03050f184cd980a41d9541aa084051afb9c2cdf18291b64cf51b8d643e"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def reject(text):
    print("[REJECT] " + text)
    raise SystemExit(2)


def roots():
    fe = Path(__file__).resolve().parent
    project = fe.parent
    be = project / "Interplex_MES_BE"
    if fe.name != "Interplex_MES_FE" or not be.is_dir():
        reject("Place this updater at Interplex_MES_FE/ beside Interplex_MES_BE/.")
    if Path.cwd().resolve() != be.resolve():
        reject("Run from Interplex_MES_BE as current working directory.")
    if sys.version_info < (3, 11):
        reject("Python >= 3.11 required.")
    return project


def safe_path(root, rel):
    relpath = Path(rel)
    if relpath.is_absolute() or ".." in relpath.parts or "\\" in rel:
        reject("Unsafe relative path: " + rel)
    path = root / rel
    if not path.resolve().is_relative_to(root.resolve()):
        reject("Target escapes project directory: " + rel)
    if path.is_symlink() or (path.exists() and not path.is_file()):
        reject("Unexpected nonfile or symlink: " + rel)
    return path


def make_plan(root):
    errors = []
    changes = []
    states = []

    # Lock down the DDL of the already-executed V0001 migration.
    for name, expected in [("00_PRECHECK.sql", PRECHECK_SHA), ("01_APPLY.sql", APPLY_SHA)]:
        rel = BASE + name
        path = safe_path(root, rel)
        if not path.is_file() or digest(path.read_bytes()) != expected:
            errors.append(f"Original V0001 {name} missing/modified (no DDL patch permitted).")
        else:
            print("[PASS] Unchanged original SQL: " + name)

    for rel, data in UPDATE_ITEMS.items():
        path = safe_path(root, rel)
        if not path.is_file():
            errors.append("Missing release file: " + rel)
            continue
        prior = path.read_bytes()
        desired = data["new"].encode("utf-8")
        if prior == desired:
            states.append("new")
            print("[SAME] " + rel)
        elif digest(prior) == data["expected"]:
            states.append("old")
            changes.append((rel, prior, desired))
            print("[UPDATE] " + rel)
        else:
            errors.append("SHA256 mismatch: " + rel + " (manual review needed)")

    path = safe_path(root, CHANGE_REL)
    if path.exists():
        if path.read_bytes() == CHANGE_TEXT.encode("utf-8"):
            states.append("new")
            print("[SAME] " + CHANGE_REL)
        else:
            errors.append("Conflicting change-document at " + CHANGE_REL)
    else:
        states.append("old")
        changes.append((CHANGE_REL, None, CHANGE_TEXT.encode("utf-8")))
        print("[CREATE] " + CHANGE_REL)

    path = safe_path(root, CHANGELOG_REL)
    if not path.is_file():
        errors.append("Missing required Markdown changelog: " + CHANGELOG_REL)
    else:
        prior = path.read_bytes()
        if CHANGELOG_MARKER.encode("utf-8") in prior:
            if prior.endswith(CHANGELOG_APPEND.encode("utf-8")):
                states.append("new")
                print("[SAME] " + CHANGELOG_REL)
            else:
                errors.append("Modified verifier changelog marker: " + CHANGELOG_REL)
        else:
            states.append("old")
            changes.append((CHANGELOG_REL, prior, prior + CHANGELOG_APPEND.encode("utf-8")))
            print("[APPEND] " + CHANGELOG_REL)

    if "new" in states and "old" in states:
        errors.append("Partial hotfix installation detected (some files updated, others original).")
    for rel, _, _ in changes:
        if rel.endswith(".md"):
            print("[MARKDOWN] " + rel)
    for err in errors:
        print("[REJECT] " + err)
    if errors:
        print("VERDICT: REJECT — no changes permitted.")
        return None
    print("VERDICT: PASS — source + read-only verifier hotfix compatible.")
    print("DATABASE: NOT ACCESSED. Only rerun 02_VERIFY.sql manually; NEVER rerun 01_APPLY.sql.")
    return changes


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".mes2_verify_", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def apply(root, changes):
    if not changes:
        print("[PASS] Already patched; no changes.")
        return
    back = (Path.home() / ".ipth_mes_updater_backups" / RELEASE /
            dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
    back.mkdir(parents=True, exist_ok=False)
    updated = []
    try:
        # Save all old bytes before any overwrite, so failures can be rolled back.
        for rel, original, _ in changes:
            if original is not None:
                target = back / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(original)
        for rel, original, desired in changes:
            atomic_write(safe_path(root, rel), desired)
            updated.append({"relative_path": rel, "was_present": original is not None,
                            "updated_sha256": digest(desired)})
        (back / "manifest.json").write_text(
            json.dumps({"release": RELEASE, "root": str(root.resolve()), "changes": updated}, indent=2),
            encoding="utf-8")
    except Exception as exc:
        for record in reversed(updated):
            path = safe_path(root, record["relative_path"])
            if record["was_present"]:
                atomic_write(path, (back / record["relative_path"]).read_bytes())
            elif path.exists():
                path.unlink()
        reject("Hotfix failed, completed writes restored: " + type(exc).__name__)
    print("[PASS] V0001 verifier, checksum and Markdown patched; SQL Server untouched.")
    print("Backup: " + str(back))


def rollback(root):
    base = Path.home() / ".ipth_mes_updater_backups" / RELEASE
    manifests = sorted(base.glob("*/manifest.json")) if base.exists() else []
    if not manifests:
        reject("No hotfix backup manifest found.")
    manifest_path = manifests[-1]
    info = json.loads(manifest_path.read_text(encoding="utf-8"))
    if info["root"] != str(root.resolve()):
        reject("Backup belongs to a different project root.")
    for rec in info["changes"]:
        path = safe_path(root, rec["relative_path"])
        if not path.is_file() or digest(path.read_bytes()) != rec["updated_sha256"]:
            reject("Rollback unsafe; patched file was changed: " + rec["relative_path"])
    for rec in reversed(info["changes"]):
        path = safe_path(root, rec["relative_path"])
        if rec["was_present"]:
            atomic_write(path, (manifest_path.parent / rec["relative_path"]).read_bytes())
        else:
            path.unlink()
    manifest_path.rename(manifest_path.with_suffix(".rolled_back"))
    print("[PASS] Hotfix files restored. Database untouched.")


def main():
    parser = argparse.ArgumentParser(description="V0001 VERIFY syntax-only hotfix: files/docs, not SQL execution")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--scan", action="store_true")
    group.add_argument("--apply", action="store_true")
    group.add_argument("--rollback", action="store_true")
    args = parser.parse_args()
    root = roots()
    if args.rollback:
        return rollback(root)
    print("IPTH MES2 V0001 SQL VERIFY hotfix — original APPLY SQL remains unchanged")
    changes = make_plan(root)
    if changes is None:
        raise SystemExit(2)
    if args.apply:
        return apply(root, changes)
    print("SCAN read-only; no filesystem/database changes.")


if __name__ == "__main__":
    main()
