#!/usr/bin/env python3
"""IPTH MES2 RW Phase 0: strictly read-only source and SQL catalog audit.

--scan : inspect source and (unless --no-db) DB metadata, no writes.
--audit : write a ZIP report into Downloads / explicit --output-dir.
No SQL DDL/DML and no business-row extraction.
"""
from __future__ import annotations

import argparse
import ast
import datetime as datetime
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

VERSION = "1.0.0"
CORE = {
    "Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py": ["is_rework", "Master_WO_Log", "Batches_Consumption_Log"],
    "Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py": ["Batches_Master", "QTY_OK", "generate_batches"],
    "Interplex_MES_BE/app/api/v1/endpoints/traceability.py": ["Batches_Consumption_Log", "build_wo_tree", "build_reverse_trace_graph"],
    "Interplex_MES_FE/src/components/production/ActiveJobView.jsx": ["rework", "validateWorkOrder"],
    "Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx": ["QTY_OK", "Allocated", "Wait Allocate"],
    "Interplex_MES_FE/src/components/traceability/TraceabilityView.jsx": ["node.Type", "Rework"],
}
EXTRA = [
    "Interplex_MES_BE/app/api/v1/api.py",
    "Interplex_MES_BE/app/api/v1/endpoints/smart_repair.py",
    "Interplex_MES_BE/app/api/v1/endpoints/packing_master.py",
    "Interplex_MES_BE/app/api/v1/endpoints/logPacking.py",
    "Interplex_MES_BE/app/models/legacy/masterWOlog.py",
    "Interplex_MES_BE/app/schemas/WoValidationResponse.py",
    "Interplex_MES_FE/src/api/workstationApi.js",
    "Interplex_MES_FE/src/api/traceabilityAPI.js",
    "Interplex_MES_FE/src/components/production/AllocationView.jsx",
    "Interplex_MES_FE/src/components/production/FrameMachiningProc.jsx",
    "Interplex_MES_FE/src/components/production/FrameAssyPackingMaster.jsx",
    "Interplex_MES_FE/src/components/production/SmartRepair.jsx",
    "Interplex_MES_FE/src/store/productionStore.js",
]
TERMS = [
    "rework", "Batches_Master", "Batches_Consumption_Log", "QTY_OK",
    "Born_by_WO", "getAllocationStatus", "generate_batches", "Status =",
    "build_wo_tree", "build_reverse_trace_graph", "RawMaterial", "logInputMain",
    "transferInputBatch", "validateWorkOrder", "Master_WO_Log", "frozen",
]
REQUIRED_DB = {
    "Master_WO_Log": {"WO", "Type", "QTY_OK", "Status"},
    "Batches_Master": {"ID", "Batch", "QTY", "Born_by_WO", "Status"},
    "Batches_Consumption_Log": {"ID", "Batch_ID", "Used_by_WO", "Used_QTY", "IsCurrent"},
}
CANDIDATE_TABLES = [
    "Master_WO_Log", "Batches_Master", "Batches_Consumption_Log",
    "Box_Master", "ModelConfigs", "RawMaterialLots", "RawMaterialUsage",
]


def project_root(script: Path) -> Path:
    candidates = [Path.cwd(), *Path.cwd().parents, script.resolve().parent, *script.resolve().parents]
    for base in candidates:
        if (base / "Interplex_MES_FE").is_dir() and (base / "Interplex_MES_BE").is_dir():
            return base
    raise RuntimeError("Required sibling directories Interplex_MES_FE and Interplex_MES_BE were not found")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def source_inventory(root: Path):
    issues, files, markers = [], [], []
    required_paths = list(CORE) + [x for x in EXTRA if x not in CORE]
    for relative in required_paths:
        path = root / relative
        if not path.is_file():
            issues.append({"severity": "REJECT" if relative in CORE else "WARN", "code": "MISSING_FILE", "path": relative})
            continue
        content = path.read_bytes()
        txt = content.decode("utf-8", errors="replace")
        missing = [anchor for anchor in CORE.get(relative, []) if anchor not in txt]
        for anchor in missing:
            issues.append({"severity": "REJECT", "code": "REQUIRED_SOURCE_ANCHOR_MISSING", "path": relative, "anchor": anchor})
        files.append({"path": relative, "bytes": len(content), "sha256": sha256_bytes(content), "missing_anchors": missing})
        for i, line in enumerate(txt.splitlines(), 1):
            terms = [kw for kw in TERMS if kw.lower() in line.lower()]
            if terms:
                markers.append({"path": relative, "line": i, "terms": terms})
    return files, markers, issues


def get_database_url(root: Path) -> str | None:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    for candidate in [root / "Interplex_MES_BE" / ".env", root / "Interplex_MES_BE" / ".env.local"]:
        if not candidate.is_file():
            continue
        for line in candidate.read_text("utf-8", errors="replace").splitlines():
            match = re.match(r"^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.+?)\s*$", line)
            if match:
                v = match.group(1).strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
                    v = v[1:-1]
                return v
    return None


def get_db_metadata(root: Path):
    url = get_database_url(root)
    if not url:
        return None, "DATABASE_URL is not configured (no credentials included in report)"
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.engine import make_url
        parsed = make_url(url)
        if parsed.drivername != "mssql+pyodbc":
            return None, "Unsupported driver (expected mssql+pyodbc)"
        if (parsed.host or "") in ("0.0.0.0", "::", "[::]"):
            parsed = parsed.set(host="127.0.0.1")
        # SQLAlchemy 2.x and ODBC; read-only SELECT statements below.
        engine = create_engine(parsed, pool_pre_ping=True, connect_args={"timeout": 8})
        with engine.connect() as conn:
            info = dict(conn.execute(text("""
                SELECT DB_NAME() AS database_name,
                       CAST(SERVERPROPERTY('ServerName') AS nvarchar(255)) AS server_name,
                       CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(40)) AS engine_version,
                       d.compatibility_level
                FROM sys.databases d WHERE d.name = DB_NAME()
            """)).mappings().first())
            objects = [dict(r) for r in conn.execute(text("""
                SELECT s.name AS schema_name, t.name AS table_name, c.name AS column_name,
                       typ.name AS data_type, c.max_length, c.precision, c.scale,
                       c.is_nullable, c.is_identity
                FROM sys.tables t
                JOIN sys.schemas s ON s.schema_id=t.schema_id
                JOIN sys.columns c ON c.object_id=t.object_id
                JOIN sys.types typ ON typ.user_type_id=c.user_type_id
                WHERE (s.name = 'dbo' AND t.name IN
                  ('Master_WO_Log','Batches_Master','Batches_Consumption_Log',
                   'Box_Master','ModelConfigs','RawMaterialLots','RawMaterialUsage'))
                   OR (s.name = 'dbo' AND t.name LIKE 'MES_Rework%')
                ORDER BY t.name, c.column_id
            """)).mappings().all()]
            indexes = [dict(r) for r in conn.execute(text("""
                SELECT t.name AS table_name, i.name AS index_name,
                       i.is_unique, i.is_primary_key, i.has_filter, i.filter_definition,
                       col.name AS column_name, ic.key_ordinal
                FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id AND i.index_id>0
                LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
                LEFT JOIN sys.columns col ON col.object_id=ic.object_id AND col.column_id=ic.column_id
                WHERE t.name IN ('Master_WO_Log','Batches_Master','Batches_Consumption_Log','Box_Master')
                   OR t.name LIKE 'MES_Rework%'
                ORDER BY t.name,i.name,ic.key_ordinal
            """)).mappings().all()]
            fk = [dict(r) for r in conn.execute(text("""
                SELECT fk.name AS fk_name, OBJECT_NAME(fk.parent_object_id) AS source_table,
                       OBJECT_NAME(fk.referenced_object_id) AS target_table
                FROM sys.foreign_keys fk
                WHERE OBJECT_NAME(fk.parent_object_id) IN ('Batches_Consumption_Log','Batches_Master')
                   OR OBJECT_NAME(fk.parent_object_id) LIKE 'MES_Rework%'
                ORDER BY source_table,fk_name
            """)).mappings().all()]
            estimates = [dict(r) for r in conn.execute(text("""
                SELECT t.name AS table_name, SUM(p.rows) AS estimated_rows
                FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
                WHERE t.name IN ('Master_WO_Log','Batches_Master','Batches_Consumption_Log','Box_Master')
                   OR t.name LIKE 'MES_Rework%'
                GROUP BY t.name
            """)).mappings().all()]
        engine.dispose()
        issues=[]
        for table, expected in REQUIRED_DB.items():
            current={r['column_name'] for r in objects if r['table_name'].lower()==table.lower()}
            missing=sorted(expected-current)
            if missing:
                issues.append({"severity":"REJECT","code":"REQUIRED_DB_COLUMNS_MISSING","table":table,"columns":missing})
        return {"info":info, "columns":objects,"indexes":indexes,"foreign_keys":fk,"row_estimates":estimates,"issues":issues}, None
    except Exception as exc:
        # Expose only exception type and SQLSTATE. Never stringify DB exceptions,
        # which can embed connection strings and passwords on some drivers.
        state=""
        origin=getattr(exc,"orig",None)
        args=getattr(origin,"args",())
        if args and isinstance(args[0],str) and re.fullmatch(r"[A-Z0-9]{5}",args[0]):
            state=f" (SQLSTATE {args[0]})"
        return None, f"{type(exc).__name__}{state} during read-only SQL catalog audit"


def md_report(files, markers, issues, db, db_error, include_source):
    version = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    status = "PASS" if not any(x['severity']=="REJECT" for x in issues) and db is not None and not db['issues'] else "INCOMPLETE_OR_REJECT"
    out=["# MES2 Rework — Phase 0 Live Audit", "",f"- Collected UTC: `{version}`", f"- Audit verdict: **{status}**", f"- Source files inspected: **{len(files)}**",f"- Source references matched: **{len(markers)}**",f"- Full source included: **{'YES, explicit opt-in' if include_source else 'NO'}**","", "## Evidence & limitations", "", "This report uses current FE/BE source and (if accessible) read-only SQL Server system catalogs. It does not inspect business rows, prove business workflows through end-to-end tests or modify the database.", "", "## Source compatibility checks", ""]
    if issues:
        for issue in issues: out.append(f"- **{issue['severity']}** `{issue['code']}` — `{issue.get('path') or issue.get('table')}` {issue.get('anchor') or ''}")
    else: out.append("- **PASS** Required source paths and anchor strings are present.")
    out.extend(["", "## Source files and SHA256", "", "| File | Bytes | SHA256 |", "|---|---:|---|"])
    for f in files: out.append(f"| `{f['path']}` | {f['bytes']} | `{f['sha256']}` |")
    out.extend(["", "## Critical code anchors (current source line numbers)", "", "Detailed reference locations are in `SOURCE_REFERENCES.json`. Only nonsecret keywords and line numbers are included.", ""])
    for fn,find in [
      ("Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py", "is_rework"),
      ("Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py", "Batches_Master"),
      ("Interplex_MES_BE/app/api/v1/endpoints/traceability.py", "Batches_Consumption_Log"),
      ("Interplex_MES_FE/src/components/production/ActiveJobView.jsx", "rework"),
      ("Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx", "QTY_OK"),
      ("Interplex_MES_FE/src/components/traceability/TraceabilityView.jsx", "rework"),
    ]:
        hits=[m for m in markers if m['path']==fn and any(find.lower()==term.lower() for term in m['terms'])]
        ln=','.join(str(m['line']) for m in hits[:15])
        out.append(f"- `{fn}` — `{find}` at line(s): {ln or 'not seen'}")
    out.extend(["", "## Database compatibility", ""])
    if not db:
        out.extend(["- **DATABASE_AUDIT_INCOMPLETE**: " + (db_error or 'not attempted'), "- Do not infer schema compatibility from code or previous snapshots."])
    else:
        out.append(f"- Database: `{db['info']['database_name']}` / Server: `{db['info']['server_name']}` / Engine: `{db['info']['engine_version']}` / compat: `{db['info']['compatibility_level']}`")
        for table, expected in REQUIRED_DB.items():
            got={c['column_name'] for c in db['columns'] if c['table_name'].lower()==table.lower()}
            absent=sorted(expected-got)
            out.append(f"- **{'REJECT' if absent else 'PASS'}** `{table}` required fields: {', '.join(absent) if absent else 'present'}")
        tables=sorted({c['table_name'] for c in db['columns']})
        out.append("- Relevant tables detected: "+", ".join(f"`{t}`" for t in tables))
        out.append("- Exact column/index/FK metadata in `DB_RW_CATALOG.json`. Row counts are only estimates.")
    out.extend(["", "## Architectural consequences", "", "- Avoid changing production WO `Type` to Rework for ONE_TO_ONE; use separate persistent RW type.", "- Treat Bulk RW as a genealogy traversal stop, preserving RW input records in detail view.", "- Track batch lifecycle validity independently from print status 0/1/2.", "- Audit every batch receiving/transferring/printing endpoint before freezing input batches.", "- Keep normal allocation and reworked allocation separate to avoid double counting.", "", "## Next action", "", "Review current-source code against `RW_SOURCE_IMPACT.md` and this report. Confirm open rules, then author manual SQL for RW Phase A (no auto DB migration).", ""])
    return '\n'.join(out)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    run=p.add_mutually_exclusive_group(required=True)
    run.add_argument('--scan',action='store_true',help='Read-only inspect source and SQL catalogs; no report written')
    run.add_argument('--audit',action='store_true',help='Generate zipped Markdown/JSON report under Downloads')
    p.add_argument('--no-db',action='store_true',help='Skip DB connection, marks audit incomplete')
    p.add_argument('--include-source',action='store_true',help='Explicitly include selected source files in the ZIP')
    p.add_argument('--output-dir',type=Path,help='Where to write audit ZIP (default ~/Downloads)')
    args=p.parse_args()
    try:
        root=project_root(Path(__file__))
    except RuntimeError as e:
        print(f'[REJECT] {e}');return 2
    files, markers, issues=source_inventory(root)
    print(f'IPTH RW Architecture Auditor v{VERSION} | Project: {root.name}')
    print(f'SOURCE: {len(files)} source files inspected; {len(markers)} relevant line references')
    for issue in issues:
        print(f"[{issue['severity']}] {issue['code']} {issue.get('path','')} {issue.get('anchor','')}")
    db=None;db_error='Audit intentionally skipped by --no-db' if args.no_db else None
    if not args.no_db:
        db,db_error=get_db_metadata(root)
    if db is None: print(f'[WARN] DATABASE_AUDIT_INCOMPLETE: {db_error}')
    else:
        print(f"[PASS] DB metadata: {db['info']['database_name']} | compatibility {db['info']['compatibility_level']} | {len(db['columns'])} relevant columns")
        for issue in db['issues']:
            issues.append(issue)
            print(f"[{issue['severity']}] {issue['code']}: {issue['table']} ({','.join(issue['columns'])})")
    rejected=any(i['severity']=='REJECT' for i in issues)
    if args.scan:
        print('VERDICT: '+('REJECT' if rejected else 'PASS' if db else 'PASS WITH WARNINGS — DB not verified')+' (read-only; no files written)')
        return 2 if rejected else 0
    dest=args.output_dir or Path.home()/"Downloads"
    dest.mkdir(parents=True,exist_ok=True)
    now=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    zipfile_path=dest/f'IPTH_RW_Phase0_Audit_{now}.zip'
    report=md_report(files,markers,issues,db,db_error,args.include_source)
    manifest={
       'tool':'IPTH_RW_ArchitectureAuditor', 'version':VERSION,
       'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'source_only':db is None, 'source_files':len(files),
       'database_audit_complete':db is not None, 'overall_reject':rejected,
       'includes_source':args.include_source,
       'scope':'metadata and source references; no SQL row data',
    }
    with zipfile.ZipFile(zipfile_path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('RW_PHASE0_LIVE_AUDIT.md',report)
        z.writestr('SOURCE_INVENTORY.json',json.dumps(files,ensure_ascii=False,indent=2))
        z.writestr('SOURCE_REFERENCES.json',json.dumps(markers,ensure_ascii=False,indent=2))
        z.writestr('DB_RW_CATALOG.json',json.dumps(db if db else {'status':'INCOMPLETE','reason':db_error},ensure_ascii=False,indent=2,default=str))
        z.writestr('ISSUES.json',json.dumps(issues,ensure_ascii=False,indent=2))
        z.writestr('AUDIT_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
        if args.include_source:
            for file in files:
                z.write(root / file['path'],arcname='SOURCE/'+file['path'])
    print(f'[OUTPUT] {zipfile_path}')
    print('VERDICT: '+('REJECT — inspect issues before implementing RW' if rejected else 'AUDIT COMPLETE' if db else 'AUDIT INCOMPLETE — DB metadata unavailable'))
    return 2 if rejected or db is None else 0


if __name__=='__main__':
    sys.exit(main())
