#!/usr/bin/env python3
"""MES2 RW V0002: isolate the FK failure without committing database changes.

Usage from Interplex_MES_BE:
  python ../Interplex_MES_FE/developer_tools/IPTH_RW_V0002_FK_Diagnostic.py --scan
  python ../Interplex_MES_FE/developer_tools/IPTH_RW_V0002_FK_Diagnostic.py --probe

--scan is entirely read-only. --probe performs transactional DDL on IPTHData_Dev
and ALWAYS calls rollback, including on success. Do not run on production.
"""
import argparse
import os
import re
import sys
from pathlib import Path

TARGET_DB = "IPTHData_Dev"
PROBE_TABLE = "dbo.__IPTH_RW_V0002_FK_DIAGNOSTIC"
PROBE_PK = "PK__IPTH_RW_V0002_FK_DIAG"
PROBE_UQ = "UQ__IPTH_RW_V0002_FK_DIAG_WO"
PROBE_FK = "FK__IPTH_RW_V0002_FK_DIAG_WO"


def load_database_url():
    value = os.environ.get("DATABASE_URL", "").strip()
    if value:
        return value
    for path in (Path.cwd() / ".env", Path(__file__).resolve().parents[2] / "Interplex_MES_BE" / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped.startswith("export "):
                stripped = stripped[len("export "):].strip()
            if stripped.startswith("DATABASE_URL="):
                return stripped.partition("=")[2].strip().strip('"\'')
    raise RuntimeError("DATABASE_URL not found in environment or Backend .env")


def safe_error(error, password):
    pieces = getattr(error, "args", (str(error),))
    for i, arg in enumerate(pieces, start=1):
        s = str(arg)
        if password:
            s = s.replace(password, "[REDACTED]")
        s = re.sub(r"(?i)(PWD|Password)\s*=\s*[^;\s]+", r"\1=[REDACTED]", s)
        s = re.sub(r"(?i)(mssql\+pyodbc://)[^\s]+", "[CONNECTION_URL_REDACTED]", s)
        print(f"  ODBC diagnostic {i}: {s[:5000]}")


def scalar(cur, sql):
    cur.execute(sql)
    row = cur.fetchone()
    return row[0] if row else None


def verify_target(cur):
    cur.execute("SELECT DB_NAME(), CAST(@@SERVERNAME AS NVARCHAR(256))")
    database, server = cur.fetchone()
    print(f"TARGET: server={server} database={database}")
    if database != TARGET_DB:
        raise RuntimeError(f"REJECT: only {TARGET_DB} is permitted")
    objects = ("dbo.Master_WO_Log", "dbo.MES_ReworkJobs", "dbo.MES_ReworkInputs", "dbo.MES_ReworkOutputs", PROBE_TABLE)
    cur.execute("SELECT " + ", ".join("OBJECT_ID(N'" + name + "', N'U')" for name in objects))
    ids = list(cur.fetchone())
    if ids[0] is None:
        raise RuntimeError("REJECT: dbo.Master_WO_Log does not exist")
    if any(x is not None for x in ids[1:]):
        raise RuntimeError("REJECT: RW V0002 table(s) or probe table already exist; do not probe this state")
    return server


def show_parent_schema(cur):
    print("\nPARENT WO KEY METADATA (read-only):")
    cur.execute("""
        SELECT c.name, TYPE_NAME(c.user_type_id), c.max_length,
               c.is_nullable, c.is_computed, t.is_memory_optimized,
               t.temporal_type_desc
        FROM sys.tables t
        JOIN sys.columns c ON c.object_id=t.object_id
        WHERE t.object_id=OBJECT_ID(N'dbo.Master_WO_Log',N'U')
          AND c.name=N'WO'
    """)
    for row in cur.fetchall():
        print("  column=%s type=%s length=%s nullable=%s computed=%s memory_optimized=%s temporal=%s" % tuple(row))
    cur.execute("""
        SELECT i.name, i.is_primary_key, i.is_unique,
               i.is_disabled, i.is_hypothetical, i.has_filter,
               ic.key_ordinal, c.name
        FROM sys.indexes i
        JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
        JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
        WHERE i.object_id=OBJECT_ID(N'dbo.Master_WO_Log',N'U')
          AND (i.is_primary_key=1 OR i.is_unique=1)
        ORDER BY i.index_id, ic.key_ordinal
    """)
    for row in cur.fetchall():
        print("  key=%s PK=%s unique=%s disabled=%s hypothetical=%s filtered=%s ordinal=%s column=%s" % tuple(row))


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--scan", action="store_true", help="Read-only schema inspection")
    mode.add_argument("--probe", action="store_true", help="Transactional FK test; always rollback")
    args = parser.parse_args()
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.engine import make_url
    except ImportError:
        print("REJECT: sqlalchemy missing from active Python environment")
        return 2
    try:
        raw_url = make_url(load_database_url())
        if raw_url.drivername != "mssql+pyodbc":
            raise RuntimeError("REJECT: only mssql+pyodbc URLs are supported")
        db_name = raw_url.database
        if db_name != TARGET_DB:
            raise RuntimeError(f"REJECT: DATABASE_URL targets {db_name!r}, not {TARGET_DB}")
        if raw_url.host in ("0.0.0.0", "::"):
            raw_url = raw_url.set(host="127.0.0.1")
            print("[INFO] Normalized local DB host to 127.0.0.1")
        password = raw_url.password or ""
        engine = create_engine(raw_url, connect_args={"timeout": 6}, pool_pre_ping=True)
        connection = engine.raw_connection()
        connection.autocommit = False
        cursor = connection.cursor()
        try:
            verify_target(cursor)
            show_parent_schema(cursor)
            connection.rollback()
            if args.scan:
                print("\nVERDICT: READ-ONLY SCAN COMPLETE; no DDL executed.")
                return 0

            print("\nBEGIN FK PROBE (temporary transactional schema DDL; always rollback).")
            steps = [
                ("create probe table", f"CREATE TABLE {PROBE_TABLE} (RW_ID BIGINT IDENTITY(1,1) NOT NULL, WO BIGINT NOT NULL)"),
                ("create probe PK", f"ALTER TABLE {PROBE_TABLE} ADD CONSTRAINT {PROBE_PK} PRIMARY KEY (RW_ID)"),
                ("create probe UNIQUE WO", f"ALTER TABLE {PROBE_TABLE} ADD CONSTRAINT {PROBE_UQ} UNIQUE (WO)"),
                ("create probe FK WO -> Master_WO_Log", f"ALTER TABLE {PROBE_TABLE} ADD CONSTRAINT {PROBE_FK} FOREIGN KEY (WO) REFERENCES dbo.Master_WO_Log(WO)"),
            ]
            failed = False
            for step, query in steps:
                print(f"[TRY] {step}", flush=True)
                try:
                    cursor.execute(query)
                    print(f"[PASS] {step}", flush=True)
                except Exception as exc:
                    failed = True
                    print(f"[FAIL] {step} | type={type(exc).__name__}")
                    safe_error(exc, password)
                    break
            if not failed:
                print("[PASS] Probe FK created within uncommitted transaction")
            return_code = 1 if failed else 0
            return return_code
        finally:
            try:
                connection.rollback()
                print("[ROLLBACK] DBAPI connection rolled back; no probe DDL committed.")
            except Exception as exc:
                print(f"[WARN] rollback call failed ({type(exc).__name__}); inspect connection and probe table.")
            try:
                cursor.close()
            except Exception:
                pass
            connection.close()
            if args.probe:
                # Fresh connection validates that the test object did not persist.
                with engine.connect() as check:
                    probe_exists = check.exec_driver_sql(
                        f"SELECT OBJECT_ID(N'{PROBE_TABLE}',N'U')"
                    ).scalar()
                    if probe_exists is None:
                        print("[PASS] Probe table absent after rollback")
                    else:
                        print("[ALERT] Probe table still exists: STOP and investigate; do not run migration")
    except Exception as exc:
        print(f"REJECT: diagnostic could not run ({type(exc).__name__})")
        if 'password' in locals():
            safe_error(exc, password)
        return 2


if __name__ == "__main__":
    sys.exit(run())
