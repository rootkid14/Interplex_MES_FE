#!/usr/bin/env python3
"""IPTH MES SQL Server migration manager v1.0.1.

Commands (launch from Interplex_MES_BE, with its Python environment):
  python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --scan --target dev
  python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --init-baseline --target dev \
      --profile dev_ipthdata_20261107 --confirm-database IPTHData_Dev --backup-confirmed
  python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --status --target dev
  python ../Interplex_MES_FE/developer_tools/IPTH_DBMigrationManager.py --apply --target dev \
      --confirm-database IPTHData_Dev --backup-confirmed

--scan / --status / --history / --verify-package / --check-release do NOT write SQL or files.
The baseline command only creates the migration ledger after strict catalog verification;
it does not modify any MES business tables. Never put DB credentials in this script.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

TOOL_VERSION = "1.0.1"
REGISTRY = "dbo.MES_SchemaMigrationHistory"
LOCK_NAME = "IPTH_MES_DB_SCHEMA_MIGRATIONS_v1"
ID_RE = re.compile(r"^V(\d{4})$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
PROFILE_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{2,100}$")
GO_LINE = re.compile(r"^\s*GO(?:\s+--.*)?\s*$", re.I | re.M)
FORBIDDEN_TXN_SQL = re.compile(
    r"\b(?:USE|BEGIN\s+TRAN(?:SACTION)?|COMMIT(?:\s+TRAN(?:SACTION)?)?|ROLLBACK|"
    r"SAVE\s+TRAN|ALTER\s+DATABASE|DROP\s+DATABASE|BACKUP|RESTORE|"
    r"CREATE\s+LOGIN|ALTER\s+LOGIN|EXECUTE\s+AS|SP_CONFIGURE|XP_CMDSHELL|"
    r"DROP|TRUNCATE|DELETE|UPDATE|MERGE|EXEC(?:UTE)?|GRANT|REVOKE|DENY|"
    r"BULK|OPENROWSET|OPENDATASOURCE)\b", re.I
)
FORBIDDEN_VERIFY_SQL = re.compile(
    r"\b(?:INSERT|UPDATE|DELETE|MERGE|INTO|CREATE|ALTER|DROP|TRUNCATE|EXEC(?:UTE)?|"
    r"GRANT|DENY|REVOKE|BACKUP|RESTORE|DBCC|OPENROWSET|OPENDATASOURCE|"
    r"WAITFOR|BEGIN|COMMIT|ROLLBACK)\b", re.I
)


class Reject(Exception):
    """Compatibility or safety gate failed; user must not apply."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def root_from(start: Path) -> Path:
    for part in (start.resolve(), *start.resolve().parents):
        if (part / "Interplex_MES_FE").is_dir() and (part / "Interplex_MES_BE").is_dir():
            return part
    raise Reject("Cannot locate both Interplex_MES_FE and Interplex_MES_BE. Run from BE or use --root.")


def safe_file(directory: Path, name: str) -> Path:
    """All declared artifact names are simple filenames, not arbitrary paths."""
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}", name) or name in {".", ".."}:
        raise Reject("Unsafe artifact filename")
    path = directory / name
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(directory.resolve()):
        raise Reject(f"Missing/unsafe artifact: {path}")
    return path


@dataclass(frozen=True)
class Migration:
    id: str
    parent: str | None
    description: str
    kind: str
    folder: Path
    sha: str
    content: dict
    sql: dict[str, str]


def _checked_sql(sql: str, kind: str, name: str):
    if not sql.strip():
        raise Reject(f"Empty {name}")
    # Conservative removal for token checks; artifacts still require human review.
    no_comments = re.sub(r"/\*.*?\*/|--[^\n]*", " ", sql, flags=re.S)
    no_literals = re.sub(r"N?'(?:''|[^'])*'", "''", no_comments)
    if kind == "read":
        if GO_LINE.search(sql):
            raise Reject(f"{name}: read-only verification must be ONE SELECT, no GO")
        stripped = no_literals.strip().rstrip(";").strip()
        if not re.match(r"^SELECT\b", stripped, re.I) or ";" in stripped:
            raise Reject(f"{name}: must be a single SELECT returning 1 when true")
        if FORBIDDEN_VERIFY_SQL.search(stripped):
            raise Reject(f"{name}: prohibited operation in read-only verification SQL")
    else:
        if FORBIDDEN_TXN_SQL.search(no_literals):
            raise Reject(f"{name}: operation incompatible with managed transaction or unsafe for generic runner")
        # A transaction must be controlled exclusively by this runner.


def load_migrations(base: Path) -> list[Migration]:
    if not base.is_dir():
        raise Reject(f"Missing migrations folder: {base}")
    dirs = sorted(p for p in base.iterdir() if p.is_dir() and p.name.startswith("V"))
    migrations = []
    for folder in dirs:
        if folder.is_symlink() or not re.fullmatch(r"V\d{4}__[a-z0-9_]+", folder.name):
            raise Reject(f"Malformed migration directory: {folder.name}")
        mf = safe_file(folder, "manifest.json")
        raw = mf.read_bytes()
        obj = json.loads(raw)
        ver = obj.get("migration_id")
        if not isinstance(ver, str) or not ID_RE.fullmatch(ver) or not folder.name.startswith(ver + "__"):
            raise Reject(f"Bad migration ID in {folder.name}")
        if obj.get("format") != 1 or obj.get("kind") not in {"baseline", "transactional_sql"}:
            raise Reject(f"Unsupported migration format/kind: {ver}")
        if not isinstance(obj.get("description"), str) or not obj["description"].strip():
            raise Reject(f"Missing description in {ver}")
        if not isinstance(obj.get("min_compatibility_level"), int):
            raise Reject(f"Missing min_compatibility_level in {ver}")
        if not isinstance(obj.get("parent"), (str, type(None))):
            raise Reject(f"Invalid parent for {ver}")
        sql_files: dict[str, str] = {}
        if obj["kind"] == "transactional_sql":
            if not obj.get("reviewed_for_transactional_execution") or not obj.get("backup_required"):
                raise Reject(f"{ver}: missing mandatory reviewed/backup declarations")
            if not isinstance(obj.get("affected_objects"), list) or not obj["affected_objects"]:
                raise Reject(f"{ver}: affected_objects required")
            for key, role in (("up", "write"), ("precheck", "read"), ("verify", "read")):
                declared = obj.get(key)
                if not isinstance(declared, dict) or not isinstance(declared.get("file"), str):
                    raise Reject(f"{ver}: missing {key} file+sha256")
                path = safe_file(folder, declared["file"])
                b = path.read_bytes()
                if digest(b) != declared.get("sha256"):
                    raise Reject(f"{ver}: {key} SHA256 mismatch")
                s = b.decode("utf-8-sig")
                _checked_sql(s, role, f"{ver}/{key}")
                sql_files[key] = s
        else:
            if ver != "V0000" or obj.get("parent") is not None:
                raise Reject("Only V0000 may be a baseline")
        migrations.append(Migration(ver, obj.get("parent"), obj["description"], obj["kind"], folder, digest(raw), obj, sql_files))
    if not migrations or migrations[0].id != "V0000":
        raise Reject("The immutable migration chain must start with V0000")
    for n, m in enumerate(migrations):
        expected = f"V{n:04d}"
        if m.id != expected or m.parent != (f"V{n-1:04d}" if n else None):
            raise Reject(f"Missing/out-of-order migration at {expected}: got {m.id} parent={m.parent}")
    return migrations


def baseline_profiles(folder: Path) -> dict[str, tuple[dict, str]]:
    if not folder.is_dir():
        raise Reject("Missing database/baselines folder")
    out = {}
    for file in sorted(folder.glob("*.json")):
        if file.is_symlink():
            raise Reject("Symlink baseline profile forbidden")
        blob = file.read_bytes()
        profile = json.loads(blob)
        ident = profile.get("profile_id")
        if not isinstance(ident, str) or not PROFILE_RE.fullmatch(ident) or file.stem != ident:
            raise Reject(f"Invalid baseline profile filename/id: {file.name}")
        if profile.get("format") != 1 or not isinstance(profile.get("tables"), list) or not profile["tables"]:
            raise Reject(f"Malformed profile {ident}")
        if not isinstance(profile.get("allowed_targets"), list) or not profile["allowed_targets"]:
            raise Reject(f"Profile {ident} missing allowed_targets")
        if not isinstance(profile.get("expected_database"), str):
            raise Reject(f"Profile {ident} missing expected_database")
        if not isinstance(profile.get("compatibility_levels"), list) or not profile["compatibility_levels"]:
            raise Reject(f"Profile {ident} missing compatibility_levels")
        if not SHA_RE.fullmatch(str(profile.get("fingerprint_sha256", ""))) or fingerprint(profile["tables"]) != profile["fingerprint_sha256"]:
            raise Reject(f"Baseline {ident} has an inconsistent embedded schema fingerprint")
        out[ident] = (profile, digest(blob))
    if not out:
        raise Reject("No reviewed baseline profiles found")
    return out


def _columns(rows: list[dict]) -> list[dict]:
    fields = ("name", "type", "max_length", "precision", "scale", "nullable", "identity", "computed", "has_default", "collation")
    return sorted([{x: r.get(x) for x in fields} for r in rows], key=lambda v: v["name"].lower())


def _indexes(rows: list[dict]) -> list[dict]:
    fields = ("name", "type", "unique", "primary", "unique_constraint", "filtered")
    return sorted([{
        **{k: r.get(k) for k in fields},
        "keys": sorted(r["keys"], key=lambda k: k["ordinal"]),
        "includes": sorted(r["includes"]),
    } for r in rows], key=lambda r: r["name"].lower())


def normalized_table(obj: dict) -> dict:
    return {
        "schema": obj["schema"], "name": obj["name"],
        "columns": _columns(obj.get("columns", [])),
        "indexes": _indexes(obj.get("indexes", [])),
        "foreign_keys": sorted(obj.get("foreign_keys", []), key=lambda x: (x["name"], x["ordinal"])),
        "checks": sorted(obj.get("checks", []), key=lambda x: x["name"]),
    }


def fingerprint(tables: list[dict]) -> str:
    return digest(canonical(sorted([normalized_table(t) for t in tables], key=lambda t: (t["schema"], t["name"]))))


def describe_drift(expected: list[dict], observed: list[dict]) -> list[str]:
    emap = {(v["schema"], v["name"]): normalized_table(v) for v in expected}
    amap = {(v["schema"], v["name"]): normalized_table(v) for v in observed}
    output = []
    for key in sorted(emap):
        label = f"{key[0]}.{key[1]}"
        if key not in amap:
            output.append(f"{label}: MISSING TABLE")
            continue
        for field in ("columns", "indexes", "foreign_keys", "checks"):
            if emap[key][field] != amap[key][field]:
                output.append(f"{label}: {field} DIFFER (column/index/constraint metadata)")
    return output


def _as_bool(x) -> bool:
    return bool(x)


def _safe_db_failure(exc: Exception) -> str:
    """Classify DBAPI failures without printing SQL, parameters or credentials."""
    root_error = getattr(exc, "orig", None) or exc
    parts = getattr(root_error, "args", ())
    state = str(parts[0]) if parts and re.fullmatch(r"[A-Z0-9]{5}", str(parts[0])) else "unknown"
    driver_message = str(parts[1]) if len(parts) > 1 else ""
    codes = re.findall(r"\((\d{2,6})\)", driver_message)
    native = codes[0] if codes else "unknown"
    msg = driver_message.lower()
    if "syntax" in msg or "incorrect syntax" in msg:
        category = "T-SQL syntax rejected"
    elif "invalid column" in msg or "invalid object" in msg:
        category = "missing/renamed SQL catalog object or column"
    elif "permission" in msg or "denied" in msg:
        category = "SQL Server permission denied"
    elif "timeout" in msg or "timed out" in msg:
        category = "SQL Server operation timed out"
    else:
        category = "database driver query failure"
    return (f"{category}; driver={type(root_error).__name__}; "
            f"SQLSTATE={state}; native_code={native}. "
            "SQL text, parameters and connection secrets were not printed.")


def _query_rows(conn, sql: str, args: dict | None = None, *, stage: str = "read-only metadata") -> list[dict]:
    from sqlalchemy import text
    try:
        result = conn.execute(text(sql), args or {})
        return [dict(r._mapping) for r in result]
    except Exception as exc:
        raise Reject(f"{stage}: {_safe_db_failure(exc)}") from None


def query_table(conn, schema: str, table: str) -> dict | None:
    p = {"schema": schema, "tab": table}
    exists = _query_rows(conn, """
SELECT t.object_id FROM sys.tables AS t
JOIN sys.schemas AS s ON t.schema_id=s.schema_id
WHERE s.name=:schema AND t.name=:tab
""", p)
    if not exists:
        return None
    cols = _query_rows(conn, """
SELECT c.name AS name, LOWER(ty.name) AS [type], c.max_length AS [max_length],
 c.precision AS [precision], c.scale AS [scale], c.is_nullable AS [nullable],
 c.is_identity AS [identity], c.is_computed AS [computed],
 CASE WHEN c.default_object_id=0 THEN 0 ELSE 1 END AS has_default,
 c.collation_name AS collation
FROM sys.columns c JOIN sys.types ty ON ty.user_type_id=c.user_type_id
JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE s.name=:schema AND t.name=:tab
ORDER BY c.column_id
""", p, stage=f"{schema}.{table} / columns")
    for r in cols:
        for k in ("nullable", "identity", "computed", "has_default"):
            r[k] = _as_bool(r[k])
        for k in ("max_length", "precision", "scale"):
            r[k] = int(r[k])
    idx_raw = _query_rows(conn, """
SELECT i.name AS [name], i.type_desc AS [type], i.is_unique AS [unique_flag],
 i.is_primary_key AS primary_flag, i.is_unique_constraint AS uq_flag,
 i.has_filter AS [filtered], ic.key_ordinal AS [ordinal], ic.is_included_column AS [included],
 c.name AS [column_name]
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id
JOIN sys.schemas s ON s.schema_id=t.schema_id
LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE s.name=:schema AND t.name=:tab AND i.name IS NOT NULL
ORDER BY i.name, ic.key_ordinal, c.name
""", p, stage=f"{schema}.{table} / indexes")
    index_map: dict[str, dict] = {}
    for row in idx_raw:
        name = row["name"]
        if name not in index_map:
            index_map[name] = {
                "name": name, "type": row["type"],
                "unique": _as_bool(row["unique_flag"]), "primary": _as_bool(row["primary_flag"]),
                "unique_constraint": _as_bool(row["uq_flag"]), "filtered": _as_bool(row["filtered"]),
                "keys": [], "includes": [],
            }
        col = row["column_name"]
        if col is not None:
            if _as_bool(row["included"]):
                index_map[name]["includes"].append(col)
            elif row["ordinal"] and int(row["ordinal"]) > 0:
                index_map[name]["keys"].append({"ordinal": int(row["ordinal"]), "name": col})
    fks = _query_rows(conn, """
SELECT fk.name AS name, fkc.constraint_column_id AS ordinal, pc.name AS from_column,
 rs.name AS to_schema, rt.name AS to_table, rc.name AS to_column,
 fk.delete_referential_action_desc AS on_delete, fk.update_referential_action_desc AS on_update,
 fk.is_disabled AS disabled, fk.is_not_trusted AS untrusted
FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id=fkc.constraint_object_id
JOIN sys.tables t ON fk.parent_object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id
JOIN sys.columns pc ON pc.object_id=t.object_id AND pc.column_id=fkc.parent_column_id
JOIN sys.tables rt ON rt.object_id=fkc.referenced_object_id
JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fkc.referenced_column_id
WHERE s.name=:schema AND t.name=:tab ORDER BY fk.name, fkc.constraint_column_id
""", p, stage=f"{schema}.{table} / foreign keys")
    for row in fks:
        row["ordinal"] = int(row["ordinal"])
        for k in ("disabled", "untrusted"):
            row[k] = _as_bool(row[k])
    checks = _query_rows(conn, """
SELECT cc.name AS name, cc.is_disabled AS disabled, cc.is_not_trusted AS untrusted
FROM sys.check_constraints cc JOIN sys.tables t ON cc.parent_object_id=t.object_id
JOIN sys.schemas s ON t.schema_id=s.schema_id
WHERE s.name=:schema AND t.name=:tab ORDER BY cc.name
""", p, stage=f"{schema}.{table} / check constraints")
    for row in checks:
        for k in ("disabled", "untrusted"):
            row[k] = _as_bool(row[k])
    return normalized_table({"schema": schema, "name": table, "columns": cols,
                             "indexes": list(index_map.values()), "foreign_keys": fks, "checks": checks})


def inspect_baseline(conn, profile: dict) -> tuple[bool, str, list[str]]:
    expected = profile["tables"]
    actual = []
    for idx, item in enumerate(expected, 1):
        print(f"[CHECK] V0000 table {idx}/{len(expected)}: {item['schema']}.{item['name']}")
        observed = query_table(conn, item["schema"], item["name"])
        if observed is not None:
            actual.append(observed)
    diffs = describe_drift(expected, actual)
    value = fingerprint(actual)
    return not diffs and value == profile["fingerprint_sha256"], value, diffs


def parse_env(root: Path):
    """Read secrets locally without executing code, without logging them."""
    path = root / "Interplex_MES_BE" / ".env"
    values = {}
    if path.is_file():
        for line in path.read_text("utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if not re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", key):
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            values[key] = value
    return values


def db_engine(root: Path, target: str):
    try:
        import sqlalchemy
        from sqlalchemy.engine import make_url
        import pyodbc  # noqa: F401
    except ImportError as exc:
        raise Reject("Missing SQLAlchemy or pyodbc in current Python environment. Activate BE venv.") from exc
    key = "DATABASE_URL" if target == "dev" else "MES_CUSTOMER_DATABASE_URL"
    secret_url = os.environ.get(key) or parse_env(root).get(key)
    if not secret_url:
        raise Reject(f"Missing {key} in process environment or Interplex_MES_BE/.env")
    try:
        parsed = make_url(secret_url)
        if parsed.drivername != "mssql+pyodbc" or not parsed.database:
            raise ValueError("expected mssql+pyodbc with a database name")
        if parsed.host in ("0.0.0.0", "::"):
            print("[WARN] Client host 0.0.0.0/:: normalized to 127.0.0.1 (local SQL Server).")
            parsed = parsed.set(host="127.0.0.1")
        # Never echo the URL: it can contain a database credential.
        return sqlalchemy.create_engine(parsed, future=True, pool_pre_ping=True, connect_args={"timeout": 10})
    except Exception as exc:
        raise Reject("Invalid DB connection URL/driver configuration (credentials redacted).") from exc


def db_identity(conn) -> dict:
    rec = _query_rows(conn, """
SELECT CAST(@@SERVERNAME AS nvarchar(256)) AS server_name,
 CAST(DB_NAME() AS nvarchar(256)) AS database_name,
 CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(100)) AS engine_version,
 CAST(ORIGINAL_LOGIN() AS nvarchar(256)) AS login_name
""")[0]
    compat = _query_rows(conn, "SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()")
    if not compat:
        raise Reject("Cannot read current database compatibility level")
    rec["compatibility_level"] = int(compat[0]["compatibility_level"])
    return rec


def identity_guard(identity: dict, expected_database: str | None = None):
    if expected_database is not None and identity["database_name"] != expected_database:
        raise Reject(f"Connected DB {identity['database_name']} differs from requested {expected_database}")
    print(f"TARGET SERVER: {identity['server_name']} | DB: {identity['database_name']} | "
          f"Engine: {identity['engine_version']} | Compatibility: {identity['compatibility_level']}")


def ledger_exists(conn) -> bool:
    return bool(_query_rows(conn, "SELECT OBJECT_ID(N'dbo.MES_SchemaMigrationHistory', N'U') AS oid")[0]["oid"])


def read_history(conn) -> list[dict] | None:
    if not ledger_exists(conn):
        return None
    columns = _query_rows(conn, """
SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.MES_SchemaMigrationHistory', N'U')
""")
    mandatory = {"MigrationID", "Description", "ChecksumSHA256", "AppliedAtUTC", "AppliedBy", "ToolVersion",
                 "ReleaseID", "BeforeFingerprint", "AfterFingerprint", "DurationMs", "BaselineProfileID", "BaselineProfileSHA256"}
    if not mandatory.issubset({r["name"] for r in columns}):
        raise Reject("Existing MES_SchemaMigrationHistory has incompatible columns; DBA review required")
    return _query_rows(conn, """
SELECT MigrationID, Description, ChecksumSHA256, AppliedAtUTC, AppliedBy,
 ToolVersion, ReleaseID, BeforeFingerprint, AfterFingerprint, DurationMs,
 BaselineProfileID, BaselineProfileSHA256
FROM dbo.MES_SchemaMigrationHistory ORDER BY MigrationID
""")


def checked_history(hist: list[dict], migrations: list[Migration], profiles: dict) -> int:
    if not hist:
        raise Reject("Migration ledger exists but contains no V0000 baseline receipt")
    if len(hist) > len(migrations):
        raise Reject("Database has migrations newer than local package; update migration package first")
    for i, row in enumerate(hist):
        if row["MigrationID"] != migrations[i].id:
            raise Reject(f"Ledger has gaps/out-of-order/unknown ID: {row['MigrationID']!r}; expected {migrations[i].id}")
        if row["ChecksumSHA256"] != migrations[i].sha:
            raise Reject(f"Checksum mismatch for applied {row['MigrationID']}; migration artifact was edited")
    first = hist[0]
    profile_id = first.get("BaselineProfileID")
    if profile_id not in profiles:
        raise Reject(f"Baseline profile {profile_id} missing from deployment package")
    if profiles[profile_id][1] != first.get("BaselineProfileSHA256"):
        raise Reject(f"Baseline profile {profile_id} checksum mismatch (immutable applied profile)")
    if first["AfterFingerprint"] != profiles[profile_id][0]["fingerprint_sha256"]:
        raise Reject("Database V0000 receipt fingerprint does not match baseline profile")
    for row in hist[1:]:
        if not SHA_RE.fullmatch(str(row["AfterFingerprint"])):
            raise Reject(f"Invalid schema fingerprint receipt for {row['MigrationID']}")
    return len(hist) - 1


def read_check(conn, sql: str, label: str) -> bool:
    """Verified read-only scalar query MUST return one row with first field 1."""
    from sqlalchemy import text
    result = conn.execute(text(sql))
    first = result.fetchone()
    second = result.fetchone()
    if first is None or second is not None or len(first) != 1 or first[0] not in (True, 1):
        raise Reject(f"{label} did not return exactly one scalar value 1")
    return True


def verify_previous_state(conn, hist: list[dict], migrations: list[Migration], profiles: dict):
    """At V0000 compare baseline; at later versions check the last managed postcondition.

    This is not a universal full-db drift detector. Every new migration must explicitly
    declare checks for the objects its behavior requires.
    """
    current = len(hist) - 1
    if current == 0:
        profile = profiles[hist[0]["BaselineProfileID"]][0]
        ok, current_hash, diffs = inspect_baseline(conn, profile)
        if not ok:
            raise Reject("Live V0000 managed schema drift: " + "; ".join(diffs[:12]) +
                         f" (observed fingerprint {current_hash[:12]}...)")
        print(f"[PASS] V0000 managed-object schema fingerprint: {current_hash[:16]}...")
    else:
        last = migrations[current]
        if last.kind != "transactional_sql":
            raise Reject("Last recorded migration kind unsupported")
        read_check(conn, last.sql["verify"], f"Latest applied {last.id} verification")
        scoped = []
        for item in last.content["affected_objects"]:
            schema, name = item.split(".", 1)
            observed = query_table(conn, schema, name)
            if observed is None:
                raise Reject(f"Latest migration {last.id} affected table {item} no longer exists")
            scoped.append(observed)
        if fingerprint(scoped) != hist[-1]["AfterFingerprint"]:
            raise Reject(f"Current {last.id} managed-schema fingerprint differs from committed receipt")
        print(f"[PASS] Current {last.id} postcondition + scoped fingerprint")


def release_check(version: str, hist: list[dict], path: Path):
    obj = json.loads(path.read_text("utf-8"))
    required = ("release_id", "supported_db_schema_min", "supported_db_schema_max", "required_migrations")
    if any(k not in obj for k in required):
        raise Reject("Release manifest missing schema compatibility fields")
    if not ID_RE.fullmatch(str(obj["supported_db_schema_min"])) or not ID_RE.fullmatch(str(obj["supported_db_schema_max"])):
        raise Reject("Release manifest schema version format invalid")
    if not (obj["supported_db_schema_min"] <= version <= obj["supported_db_schema_max"]):
        raise Reject(f"Release {obj['release_id']} needs database {obj['supported_db_schema_min']}.."
                     f"{obj['supported_db_schema_max']}; currently {version}")
    present = {x["MigrationID"] for x in hist}
    missing = [x for x in obj["required_migrations"] if x not in present]
    if missing:
        raise Reject(f"Release {obj['release_id']} missing required DB migrations: {missing}")
    print(f"[PASS] Release schema requirement for {obj['release_id']} at {version} "
          "(this validates DB version, NOT FE/BE source hashes)")


DDL_LEDGER = """
CREATE TABLE dbo.MES_SchemaMigrationHistory (
 MigrationID NVARCHAR(80) NOT NULL PRIMARY KEY,
 Description NVARCHAR(255) NOT NULL,
 ChecksumSHA256 CHAR(64) NOT NULL,
 AppliedAtUTC DATETIME2(3) NOT NULL CONSTRAINT DF_MES_SchemaMigrationHistory_AppliedAt DEFAULT SYSUTCDATETIME(),
 AppliedBy NVARCHAR(128) NOT NULL,
 ToolVersion NVARCHAR(32) NOT NULL,
 ReleaseID NVARCHAR(80) NOT NULL,
 BeforeFingerprint CHAR(64) NULL,
 AfterFingerprint CHAR(64) NOT NULL,
 DurationMs INT NOT NULL,
 BaselineProfileID NVARCHAR(128) NULL,
 BaselineProfileSHA256 CHAR(64) NULL
)
"""
INSERT_LEDGER = """
INSERT INTO dbo.MES_SchemaMigrationHistory (
 MigrationID, Description, ChecksumSHA256, AppliedBy, ToolVersion, ReleaseID,
 BeforeFingerprint, AfterFingerprint, DurationMs, BaselineProfileID, BaselineProfileSHA256
) VALUES (
 :id, :description, :checksum, ORIGINAL_LOGIN(), :tool, :release,
 :before, :after, :duration, :profile, :profile_sha
)
"""


def exclusive_lock(conn):
    from sqlalchemy import text
    result = conn.execute(text("""
SET NOCOUNT ON;
DECLARE @code INT;
EXEC @code = sys.sp_getapplock @Resource=:lockname, @LockMode=N'Exclusive',
    @LockOwner=N'Session', @LockTimeout=0, @DbPrincipal=N'public';
SELECT @code AS code;
"""), {"lockname": LOCK_NAME}).scalar_one()
    if int(result) < 0:
        conn.rollback()
        raise Reject(f"Cannot obtain DB migration lock (sp_getapplock={result}); another migration may be running")
    conn.commit()


def release_lock(conn):
    from sqlalchemy import text
    try:
        if conn.in_transaction():
            conn.rollback()
        conn.execute(text("""
SET NOCOUNT ON;
DECLARE @code INT;
EXEC @code = sys.sp_releaseapplock @Resource=:lockname,
    @LockOwner=N'Session', @DbPrincipal=N'public'; SELECT @code AS code;
"""), {"lockname": LOCK_NAME})
        conn.commit()
    except Exception:
        # The SQL connection itself releases session locks when it is disconnected.
        conn.invalidate()
        raise


def run_init(conn, identity: dict, mig: list[Migration], profiles: dict, args):
    if not args.profile or args.profile not in profiles:
        raise Reject("Specify reviewed --profile NAME; available: " + ", ".join(sorted(profiles)))
    profile, psha = profiles[args.profile]
    if args.target not in profile["allowed_targets"]:
        raise Reject(f"Profile {args.profile} not approved for target {args.target}")
    if identity["database_name"] != profile["expected_database"]:
        raise Reject("Baseline profile database name mismatch")
    if identity["compatibility_level"] not in profile["compatibility_levels"]:
        raise Reject("Baseline profile SQL database compatibility level mismatch")
    ok, h, diffs = inspect_baseline(conn, profile)
    if not ok:
        raise Reject("V0000 baseline schema mismatch: " + "; ".join(diffs[:15]))
    if ledger_exists(conn):
        raise Reject("Migration history already exists; will not reinitialize")
    conn.commit()
    exclusive_lock(conn)
    try:
        start = time.monotonic()
        with conn.begin():
            if ledger_exists(conn):
                raise Reject("Another process already initialized migration history")
            ok, h, diffs = inspect_baseline(conn, profile)
            if not ok:
                raise Reject("Baseline changed between preflight and locking: " + "; ".join(diffs[:15]))
            from sqlalchemy import text
            conn.execute(text(DDL_LEDGER))
            conn.execute(text(INSERT_LEDGER), {
                "id": "V0000", "description": mig[0].description, "checksum": mig[0].sha,
                "tool": TOOL_VERSION, "release": "MES_MIGRATION_MANAGER_V1",
                "before": h, "after": h, "duration": int((time.monotonic()-start)*1000),
                "profile": args.profile, "profile_sha": psha,
            })
        print("[PASS] Initialized V0000 ledger atomically. No business tables modified.")
    finally:
        release_lock(conn)


def split_sql_batches(sql: str) -> list[str]:
    return [b.strip() for b in GO_LINE.split(sql) if b.strip()]


def run_apply(conn, mig: list[Migration], profiles: dict, args, identity: dict):
    conn.commit()
    exclusive_lock(conn)
    try:
        hist = read_history(conn)
        if hist is None:
            raise Reject("No V0000 migration ledger. Run --init-baseline first (after schema review).")
        current = checked_history(hist, mig, profiles)
        verify_previous_state(conn, hist, mig, profiles)
        conn.commit()
        through = args.through or mig[-1].id
        ids = {x.id: i for i, x in enumerate(mig)}
        if through not in ids:
            raise Reject(f"Unknown target migration {through}")
        target_idx = ids[through]
        if target_idx < current:
            raise Reject(f"Target {through} is older than applied {mig[current].id}; no down migrations")
        if target_idx == current:
            print(f"[PASS] No pending migrations through {through}; NO-OP")
            return
        to_apply = mig[current+1:target_idx+1]
        # Check ALL declared static compatibility constraints before first write.
        for m in to_apply:
            if identity["compatibility_level"] < m.content["min_compatibility_level"]:
                raise Reject(f"{m.id} needs SQL compatibility >= {m.content['min_compatibility_level']}")
            if args.target == "customer" and not m.content.get("customer_approved", False):
                raise Reject(f"{m.id} is not approved for customer database")
        for m in to_apply:
            if m.kind != "transactional_sql":
                raise Reject(f"Unsupported pending kind {m.kind} for {m.id}")
            if args.target == "customer" and not m.content.get("customer_approved", False):
                raise Reject(f"{m.id} is not approved for customer database")
            print(f"APPLYING {m.id}: {m.description}")
            start = time.monotonic()
            with conn.begin():
                from sqlalchemy import text
                conn.execute(text("SET XACT_ABORT ON"))
                read_check(conn, m.sql["precheck"], f"{m.id} precondition")
                # SQL source is a reviewed immutable, hashed release artifact.
                for statement in split_sql_batches(m.sql["up"]):
                    conn.exec_driver_sql(statement)
                read_check(conn, m.sql["verify"], f"{m.id} postcondition")
                # Fingerprint on explicitly managed objects affected by this migration.
                scoped = []
                for item in m.content["affected_objects"]:
                    schema, name = item.split(".", 1)
                    t = query_table(conn, schema, name)
                    if t is None:
                        raise Reject(f"{m.id}: declared object {item} missing after migration")
                    scoped.append(t)
                after_sha = fingerprint(scoped)
                conn.execute(text(INSERT_LEDGER), {
                    "id": m.id, "description": m.description, "checksum": m.sha,
                    "tool": TOOL_VERSION, "release": m.content.get("release_id", "UNSPECIFIED"),
                    "before": None, "after": after_sha,
                    "duration": int((time.monotonic()-start)*1000),
                    "profile": None, "profile_sha": None,
                })
            # Only committed success receipts count. No blind rollback of committed steps.
            print(f"[PASS] {m.id} committed with receipt {after_sha[:16]}...")
    finally:
        release_lock(conn)


def print_history(hist: list[dict] | None, mig: list[Migration]):
    if hist is None:
        print("DATABASE STATUS: UNINITIALIZED (no ledger)")
    else:
        print(f"DATABASE STATUS: {hist[-1]['MigrationID']} | {len(hist)} applied (including baseline)")
        for h in hist:
            print(f"  APPLIED {h['MigrationID']}  sha256={h['ChecksumSHA256'][:16]}...  "
                  f"at={h['AppliedAtUTC']}  release={h['ReleaseID']}")
    start = len(hist or [])
    for m in mig[start:]:
        print(f"  PENDING {m.id}  {m.description}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="IPTH MES DB migration manager (read-only scan, explicit writes)")
    actions = parser.add_mutually_exclusive_group(required=True)
    for action in ("scan", "status", "history", "init-baseline", "apply", "verify-package", "check-release"):
        actions.add_argument("--" + action, action="store_true")
    parser.add_argument("--target", choices=("dev", "customer"))
    parser.add_argument("--root", type=Path)
    parser.add_argument("--profile", help="Reviewed baseline profile ID for --init-baseline")
    parser.add_argument("--confirm-database", help="Exact DB_NAME() required for every write action")
    parser.add_argument("--confirm-server", help="Exact @@SERVERNAME from --scan, required for every write")
    parser.add_argument("--backup-confirmed", action="store_true", help="Operator confirms independently verified backup")
    parser.add_argument("--through", help="Stop --apply after this migration ID (inclusive)")
    parser.add_argument("--release-manifest", type=Path, help="Required for --check-release")
    args = parser.parse_args(argv)
    try:
        root = root_from(args.root or Path(__file__).resolve())
        if sys.version_info < (3, 11):
            raise Reject("Python >= 3.11 required")
        mroot = root / "Interplex_MES_BE" / "database" / "migrations"
        profiles = baseline_profiles(root / "Interplex_MES_BE" / "database" / "baselines")
        migrations = load_migrations(mroot)
        print(f"IPTH DB Migration Manager v{TOOL_VERSION} | release artifacts: "
              f"V0000..{migrations[-1].id} | profiles={','.join(profiles)}")
        if args.verify_package:
            print("[PASS] Immutable package structure, migration sequence, SHA256 files and profiles are syntactically valid.")
            return 0
        if not args.target:
            raise Reject("--target dev|customer is required (never infer target from hostname)")
        write = args.init_baseline or args.apply
        if write and (not args.confirm_database or not args.confirm_server or not args.backup_confirmed):
            raise Reject("WRITE requires --confirm-server EXACT_SERVER, --confirm-database EXACT_NAME and --backup-confirmed")
        engine = db_engine(root, args.target)
        try:
            with engine.connect() as conn:
                identity = db_identity(conn)
                identity_guard(identity, args.confirm_database if write else None)
                if write and identity["server_name"] != args.confirm_server:
                    raise Reject("Connected @@SERVERNAME does not match --confirm-server; wrong SQL instance")
                if identity["compatibility_level"] < 100:
                    raise Reject("SQL Server DB compatibility level below 100 unsupported")
                hist = read_history(conn)
                if args.init_baseline:
                    if hist is not None:
                        raise Reject("Already initialized: refusing baseline rewrite")
                    run_init(conn, identity, migrations, profiles, args)
                    return 0
                if hist is None:
                    print_history(None, migrations)
                    if args.status or args.history:
                        return 0
                    # An uninitialized scan must still evaluate the candidate baseline:
                    # this tells the operator WHY it can/cannot be initialized.
                    choices = [p for p, (prof, _) in profiles.items()
                               if args.target in prof["allowed_targets"]
                               and prof["expected_database"] == identity["database_name"]
                               and identity["compatibility_level"] in prof["compatibility_levels"]]
                    if args.profile:
                        choices = [x for x in choices if x == args.profile]
                    if len(choices) != 1:
                        raise Reject("No single reviewed baseline profile matches target+DB+compatibility. "
                                     "A customer-specific audited profile is required for customer deployment.")
                    prof = profiles[choices[0]][0]
                    baseline_ok, current_hash, diffs = inspect_baseline(conn, prof)
                    if not baseline_ok:
                        raise Reject("Candidate V0000 schema mismatch: " + "; ".join(diffs[:15]) +
                                     f" (current={current_hash[:12]}...)" )
                    print(f"[PASS] Candidate baseline {choices[0]} exactly matches the six-table scope "
                          f"(SHA256={current_hash[:16]}...)")
                    raise Reject("UNINITIALIZED: baseline eligible, but registration requires explicit --init-baseline "
                                 "with --confirm-database and --backup-confirmed. Scan has done zero writes.")
                current_idx = checked_history(hist, migrations, profiles)
                active_profile = profiles[hist[0]["BaselineProfileID"]][0]
                if (args.target not in active_profile["allowed_targets"] or
                        active_profile["expected_database"] != identity["database_name"] or
                        identity["compatibility_level"] not in active_profile["compatibility_levels"]):
                    raise Reject("Recorded V0000 baseline profile is not approved for the selected target/DB/compatibility")
                print_history(hist, migrations)
                verify_previous_state(conn, hist, migrations, profiles)
                if args.check_release:
                    if args.release_manifest is None or not args.release_manifest.is_file():
                        raise Reject("--check-release requires --release-manifest FILE")
                    release_check(hist[-1]["MigrationID"], hist, args.release_manifest)
                if args.apply:
                    run_apply(conn, migrations, profiles, args, identity)
                elif args.scan and current_idx < len(migrations)-1:
                    first = migrations[current_idx+1]
                    if identity["compatibility_level"] < first.content["min_compatibility_level"]:
                        raise Reject(f"{first.id} requires higher compatibility level")
                    if args.target == "customer" and not first.content.get("customer_approved", False):
                        raise Reject(f"{first.id} not approved for customer")
                    read_check(conn, first.sql["precheck"], f"{first.id} precondition")
                    print("[WARN] Later migration prechecks are validated immediately before each step, under lock.")
                print("VERDICT: PASS (scan/read-only; schema gate is scoped to managed objects)")
                return 0
        finally:
            engine.dispose()
    except Reject as exc:
        print("VERDICT: REJECT — " + str(exc), file=sys.stderr)
        return 2
    except Exception as exc:
        # No SQL query strings, URLs, or driver exception repr; they may include credentials.
        print("VERDICT: REJECT — unexpected failure: " + type(exc).__name__ +
              ". See SQLSTATE/stage details above if available; no credentials are printed.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
