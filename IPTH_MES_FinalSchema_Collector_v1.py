#!/usr/bin/env python3
"""IPTH MES — FINAL schema deployment-readiness collector v1, READ-ONLY.

Installation (place in FE/developer_tools, execute from BE):
    python ../Interplex_MES_FE/IPTH_MES_FinalSchema_Collector_v1.py --scan
    python ../Interplex_MES_FE/IPTH_MES_FinalSchema_Collector_v1.py --audit

The audit never runs INSERT/UPDATE/DELETE/DDL and never modifies either repository.
DATABASE_URL is read from the process environment or BE .env; credentials are
never printed or written to output. Does not read customer data rows.

--scan: preflight incl. DB connectivity; no file writes.
--audit: repeat preflight, inventory all source, inspect SQL Server catalog,
         create Markdown + JSON reports in ~/Downloads as a ZIP and a folder.
--source-only: explicitly allow partial audit if DB cannot be reached.
"""
from __future__ import annotations

import argparse
import ast
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile

FE = "Interplex_MES_FE"
BE = "Interplex_MES_BE"
EXT = {".py", ".jsx", ".js", ".ts", ".tsx", ".sql"}
SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "dist", "build", "__pycache__",
             ".pytest_cache", ".mypy_cache", ".next", ".ipth_updater_backups",
             ".ipth_allocator_next_process_v1", ".ipth_allocator_next_process_v2",
             ".ipth_allocator_printer_download_v3", "backups", "coverage", "out"}
SKIP_PARTIAL = (".ipth_",)
MAX_FILE_BYTES = 1_500_000
MAX_SOURCE_FILES = 12000
RAW_TERMS = re.compile(
    r"raw[_\s-]?materials?|rawmateriallog|raw_materials_master|raw_qty|"
    r"logRawMaterial|getLoggedMaterials|transferInputBatch|Batches_Consumption_Log|"
    r"LogRawMaterialRequest|materialstracebywo|barcode|workcenter_master|"
    r"serialnumber|serial_number|\bUOM\b|unit_of_measure", re.I)
API_DECORATOR = re.compile(r"^(get|post|put|patch|delete|api_route)$", re.I)
TABLE_REF = re.compile(
    r"\b(?:from|join|update|into|delete\s+from)\s+(?:dbo\.)?\[?([\w]+)\]?",
    re.I)
SECRET_LINE = re.compile(r"(?:password|passwd|api[_-]?key|secret|token|database_url|connection_string)", re.I)

# Catalog-only SQL. No customer row data, no procedure/view source definitions.
QUERIES = {
    "database": """
        SELECT DB_NAME() AS database_name,
               CAST(DATABASEPROPERTYEX(DB_NAME(),'Updateability') AS nvarchar(32)) AS updateability,
               CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(64)) AS sql_server_version,
               d.compatibility_level, d.is_read_committed_snapshot_on,
               HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') AS has_view_definition
        FROM sys.databases d WHERE d.name = DB_NAME()
    """,
    "objects": """
        SELECT SCHEMA_NAME(o.schema_id) AS schema_name, o.name AS object_name,
               o.type, o.type_desc, o.object_id, o.create_date, o.modify_date
        FROM sys.objects o
        WHERE o.is_ms_shipped=0 AND o.type IN ('U','V','P','FN','IF','TF','TR','SN')
        ORDER BY schema_name,object_name
    """,
    "columns": """
        SELECT SCHEMA_NAME(o.schema_id) AS schema_name, o.name AS object_name,
               o.type AS object_type, c.column_id, c.name AS column_name,
               ty.name AS data_type, c.max_length, c.precision, c.scale,
               c.is_nullable, c.is_identity, c.is_computed,
               CAST(CASE WHEN c.default_object_id<>0 THEN 1 ELSE 0 END AS bit) AS has_default,
               c.collation_name
        FROM sys.objects o JOIN sys.columns c ON c.object_id=o.object_id
        JOIN sys.types ty ON ty.user_type_id=c.user_type_id
        WHERE o.is_ms_shipped=0 AND o.type IN ('U','V')
        ORDER BY schema_name,object_name,c.column_id
    """,
    "foreign_keys": """
        SELECT fk.name AS fk_name,
               SCHEMA_NAME(src.schema_id) AS from_schema,src.name AS from_table, sc.name AS from_column,
               SCHEMA_NAME(dst.schema_id) AS to_schema,dst.name AS to_table,dc.name AS to_column,
               fkc.constraint_column_id AS ordinal, fk.delete_referential_action_desc AS on_delete,
               fk.update_referential_action_desc AS on_update, fk.is_disabled, fk.is_not_trusted
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
        JOIN sys.tables src ON src.object_id=fkc.parent_object_id
        JOIN sys.columns sc ON sc.object_id=src.object_id AND sc.column_id=fkc.parent_column_id
        JOIN sys.tables dst ON dst.object_id=fkc.referenced_object_id
        JOIN sys.columns dc ON dc.object_id=dst.object_id AND dc.column_id=fkc.referenced_column_id
        ORDER BY from_schema,from_table,fk_name,ordinal
    """,
    "indexes": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name,t.name AS table_name,
               i.name AS index_name,i.index_id,i.type_desc,i.is_primary_key,i.is_unique,
               i.is_unique_constraint,i.has_filter,
               ic.key_ordinal,ic.is_included_column,c.name AS column_name
        FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id
        LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
        LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
        WHERE t.is_ms_shipped=0 AND i.index_id>0 AND i.is_hypothetical=0
        ORDER BY schema_name,table_name,i.index_id,ic.key_ordinal,ic.index_column_id
    """,
    "checks": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name,t.name AS table_name,
               c.name AS constraint_name,c.is_disabled,c.is_not_trusted
        FROM sys.check_constraints c JOIN sys.tables t ON t.object_id=c.parent_object_id
        WHERE t.is_ms_shipped=0
        ORDER BY schema_name,table_name,constraint_name
    """,
    "triggers": """
        SELECT SCHEMA_NAME(t.schema_id) AS parent_schema,t.name AS parent_table,
               tr.name AS trigger_name,tr.is_disabled,tr.is_instead_of_trigger
        FROM sys.triggers tr JOIN sys.tables t ON t.object_id=tr.parent_id
        WHERE tr.parent_class=1
        ORDER BY parent_schema,parent_table,trigger_name
    """,
    "dependencies": """
        SELECT SCHEMA_NAME(o.schema_id) AS referencing_schema,o.name AS referencing_object,
               o.type_desc AS referencing_type,
               COALESCE(d.referenced_schema_name,SCHEMA_NAME(ref.schema_id)) AS referenced_schema,
               COALESCE(d.referenced_entity_name,ref.name) AS referenced_object,
               d.is_ambiguous
        FROM sys.sql_expression_dependencies d
        JOIN sys.objects o ON o.object_id=d.referencing_id
        LEFT JOIN sys.objects ref ON ref.object_id=d.referenced_id
        WHERE o.is_ms_shipped=0
        ORDER BY referencing_schema,referencing_object,referenced_object
    """,
    "row_estimates": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name,t.name AS table_name,
               SUM(p.rows) AS estimated_rows
        FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
        WHERE t.is_ms_shipped=0
        GROUP BY t.schema_id,t.name ORDER BY schema_name,table_name
    """,
}


def safe_name(value):
    """Never echo secrets or external connection URLs in errors / artifacts."""
    s = str(value)
    s = re.sub(r"(?i)(password|pwd|pass|token|secret)=([^;&\s]+)", r"\1=[REDACTED]", s)
    s = re.sub(r"(?i)mssql\+pyodbc://[^\s'\"]+", "[REDACTED_DATABASE_URL]", s)
    return s[:1200]


def find_root(start: Path) -> Path:
    for p in (start, *start.parents):
        if (p / FE).is_dir() and (p / BE).is_dir():
            return p.resolve()
    raise RuntimeError("REJECT: cannot locate sibling FE and BE directories")


def env_url(root: Path, custom_env: Path | None):
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"], "process environment"
    paths = [custom_env] if custom_env else [root / BE / ".env", root / BE / ".env.local", root / ".env"]
    for p in paths:
        if p is None or not p.is_file():
            continue
        for line in p.read_text(encoding="utf-8-sig", errors="replace").splitlines():
            m = re.match(r"^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$", line)
            if m:
                val = m.group(1).strip()
                if val.startswith(('"', "'")) and val.endswith(val[0]):
                    val = val[1:-1]
                return val, f"local env file: {p.name}"
    return None, "missing DATABASE_URL in env or BE .env"


def build_engine(url_value):
    from sqlalchemy import create_engine
    from sqlalchemy.engine import make_url
    url = make_url(url_value)
    if not url.drivername.startswith("mssql+"):
        raise RuntimeError("REJECT: DATABASE_URL must use mssql+pyodbc")
    normalized = False
    if url.host in ("0.0.0.0", "::", "[::]"):
        url = url.set(host="127.0.0.1")
        normalized = True
    engine = create_engine(url, connect_args={"timeout": 8}, pool_pre_ping=True, hide_parameters=True)
    return engine, normalized


def db_read(engine, query):
    from sqlalchemy import text
    with engine.connect() as con:
        con.execute(text("SET LOCK_TIMEOUT 5000"))
        result = con.execute(text(query)).mappings().all()
        return [dict(row) for row in result]


def jsonable(o):
    if isinstance(o, (datetime,)):
        return o.isoformat()
    if isinstance(o, Path):
        return o.as_posix()
    return str(o)


def preflight(root, url, source_only, quiet=False):
    checks = []
    def add(status, item, detail):
        checks.append({"status":status,"item":item,"detail":detail})
        if not quiet: print(f"[{status}] {item}: {detail}")
    for repo in (FE,BE):
        expected = root/repo/("src" if repo==FE else "app")
        add("PASS" if expected.is_dir() else "REJECT", repo+" source", "found" if expected.is_dir() else "missing")
    if not url:
        add("WARN" if source_only else "REJECT", "Database URL", "not provided (contents never displayed)")
        return checks, None
    try:
        import sqlalchemy  # noqa
        import pyodbc  # noqa
        add("PASS", "SQLAlchemy + pyodbc", "available")
    except ImportError:
        add("WARN" if source_only else "REJECT", "SQLAlchemy + pyodbc", "not installed in selected Python")
        return checks, None
    try:
        engine, normalized = build_engine(url)
        row = db_read(engine, "SELECT DB_NAME() AS dbname")
        add("PASS", "SQL Server connection", f"connected to DB {row[0]['dbname']!r}" +
            (" (0.0.0.0 mapped locally to 127.0.0.1)" if normalized else ""))
        # This check prevents reporting zero objects when SQL Server metadata is nonempty.
        count_row = db_read(engine, "SELECT COUNT_BIG(*) AS user_tables FROM sys.tables WHERE is_ms_shipped=0")
        table_count = int(count_row[0]["user_tables"])
        add("PASS" if table_count else "REJECT", "SQL Server catalog visibility",
            f"{table_count} user tables visible in current database")
        return checks, engine
    except Exception as exc:
        add("WARN" if source_only else "REJECT", "SQL Server connection",
            safe_name(type(exc).__name__ + ": " + str(exc)))
        return checks, None


def git_state(repo):
    def cmd(*args):
        return subprocess.run(["git", "-C", str(repo), *args], capture_output=True,
                              text=True, timeout=6, check=True).stdout.strip()
    try:
        return {"branch":cmd("branch","--show-current"),"commit":cmd("rev-parse","HEAD"),
                "dirty_tracked": bool(cmd("status","--porcelain","--untracked-files=no"))}
    except Exception:
        return {"status":"unavailable"}


def is_allowed(path, root):
    try: rel = path.relative_to(root)
    except ValueError: return False
    if not path.is_file() or path.is_symlink() or path.suffix.lower() not in EXT:
        return False
    if any(part in SKIP_DIRS or any(part.startswith(x) for x in SKIP_PARTIAL)
           for part in rel.parts): return False
    if path.name.lower().startswith(".env") or "secret" in path.name.lower() or "credential" in path.name.lower():
        return False
    return path.stat().st_size <= MAX_FILE_BYTES


def python_routes(textval, path):
    if not path.endswith(".py"):
        return []
    try: tree=ast.parse(textval)
    except SyntaxError: return []
    out=[]
    for node in ast.walk(tree):
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and API_DECORATOR.match(dec.func.attr):
                    arg=dec.args[0] if dec.args else None
                    route=arg.value if isinstance(arg,ast.Constant) and isinstance(arg.value,str) else "<dynamic>"
                    out.append({"file":path,"line":node.lineno,"handler":node.name,
                                "method":dec.func.attr.upper(),"path":route})
    return out


def source_audit(root, known_tables):
    indexed=[]; evidence=[]; routes=[]; source_refs=defaultdict(list); errors=[]
    qnames={n.lower():n for n in known_tables}
    match_pat=None
    if qnames:
        match_pat=re.compile(r"(?<![\w])("+"|".join(re.escape(n) for n in sorted(qnames,key=len,reverse=True)) +r")(?![\w])",re.I)
    for folder in (root/FE/"src",root/BE/"app"):
        if not folder.is_dir(): continue
        for p in folder.rglob("*"):
            if not is_allowed(p,root):continue
            rel=p.relative_to(root).as_posix()
            try:
                raw=p.read_bytes()
                txt=raw.decode("utf-8",errors="replace")
            except OSError as exc:
                errors.append({"file":rel,"error":safe_name(exc)});continue
            hits=[]
            for num,line in enumerate(txt.splitlines(),1):
                if RAW_TERMS.search(line):
                    hits.append({"line":num,"keywords":sorted({m.group(0).lower() for m in RAW_TERMS.finditer(line)})[:8],
                                 "maybe_secret":bool(SECRET_LINE.search(line))})
            indexed.append({"file":rel,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),
                            "raw_references":len(hits)})
            if hits:
                evidence.append({"file":rel,"references":hits[:250],"total_references":len(hits)})
            routes.extend(python_routes(txt,rel))
            refs=set()
            if match_pat:
                refs={qnames[m.group(1).lower()] for m in match_pat.finditer(txt)}
            refs|={m.group(1) for m in TABLE_REF.finditer(txt) if m.group(1).lower() in qnames}
            for name in sorted(refs):source_refs[name].append(rel)
            if len(indexed)>MAX_SOURCE_FILES:
                raise RuntimeError("REJECT: more than 12000 source files; restrict scope")
    return {"files":sorted(indexed,key=lambda x:x["file"]),
            "evidence":sorted(evidence,key=lambda x:x["file"]),
            "api_routes":sorted(routes,key=lambda x:(x["file"],x["line"])),
            "db_object_file_references":dict(sorted(source_refs.items())),
            "warnings":errors,
            "limits":{"source_extensions":sorted(EXT),"max_file_bytes":MAX_FILE_BYTES,
                      "scanned_roots":[f"{FE}/src",f"{BE}/app"],
                      "excluded":"env files, git, venv, build/dist, backups, secrets/credentials filenames"}}


def inspect_database(engine):
    result={}; errors=[]
    for key,q in QUERIES.items():
        try:result[key]=db_read(engine,q)
        except Exception as exc:
            result[key]=[]
            errors.append({"section":key,"error":safe_name(type(exc).__name__+": "+str(exc))})
    result["warnings"]=errors
    result["scope"]=("Read-only SQL Server system catalog. No business table rows read. "
                     "No stored procedure/view definitions exported. Row counts estimated from sys.partitions.")
    return result


def md_cell(x):
    return str(x if x is not None else "-").replace("|","\\|").replace("\n"," ").replace("\r"," ")


def table_md(rows, columns, max_rows=None):
    lines=["| " + " | ".join(columns) + " |", "| " + " | ".join("---" for _ in columns) + " |"]
    for row in (rows[:max_rows] if max_rows else rows):
        lines.append("| "+" | ".join(md_cell(row.get(k,"")) for k in columns)+" |")
    if max_rows and len(rows)>max_rows:lines.append(f"\n*(Truncated {len(rows)-max_rows} rows; full JSON includes all.)*")
    return "\n".join(lines)


def title(textval): return "# "+textval+"\n\n"


def generate_docs(root, db, src, checks, audit_name):
    stamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    obj=db.get("objects",[]); cols=db.get("columns",[])
    tables=[o for o in obj if str(o["type"]).strip()=="U"]
    routines=[o for o in obj if str(o["type"]).strip() in ("P","FN","IF","TF","V","TR")]
    ref=src.get("db_object_file_references",{})
    overview=(title("MES2 — unified architecture audit")+
              f"**Generated:** {stamp}  \n**Audit ID:** `{audit_name}`  \n"+
              "**Status:** observed evidence, NOT a verified runtime design or migration.\n\n"+
              "## Scope and safety\n\n"+
              "- FE/BE source inventory + static references; SQL Server system catalog metadata only.\n"+
              "- No table contents, individual lots, passwords, tokens, connection URLs or SQL module bodies exported.\n"+
              "- No database writes, repo edits, schema changes, or auto-updates.\n"+
              "- Static evidence cannot prove runtime request flows or dynamic SQL.\n\n"+
              "## Inventory\n\n"+
              f"- Source files indexed: **{len(src.get('files',[]))}**\n"+
              f"- Files mentioning MES2/relevant terms: **{len(src.get('evidence',[]))}**\n"+
              f"- Python API decorators located: **{len(src.get('api_routes',[]))}**\n"+
              f"- DB user tables cataloged: **{len(tables)}**\n"+
              f"- DB views/procs/functions/triggers cataloged: **{len(routines)}**\n"+
              f"- DB foreign-key column links: **{len(db.get('foreign_keys',[]))}**\n\n"+
              "## Important files for a new agent\n\n"+
              "1. `DB_SCHEMA_CATALOG.md`: exact column types and constraints.\n"+
              "2. `RAW_MATERIAL_AUDIT.md`: direct RAW/Batch comparison, unknowns.\n"+
              "3. `API_ENDPOINTS.md`: API routes and source locations.\n"+
              "4. `SOURCE_IMPACT_MAP.md`: relevant files and database cross-references.\n"+
              "5. `GAPS_AND_DECISIONS.md`: decisions and missing evidence.\n"+
              "6. JSON files: full structured catalogs, metadata, SHA256 and references.\n\n"+
              "## Checks\n\n"+table_md(checks,["status","item","detail"])+"\n\n"+
              "## Git snapshots (metadata only)\n\n"+
              table_md([{"repository":name,**git_state(root/name)} for name in (FE,BE)],
                       ["repository","branch","commit","dirty_tracked"])+"\n")
    if not db.get('database'):
        overview += "\n**WARNING:** DB metadata unavailable. Treat all DB statements as unverified.\n"
    cat=title("SQL Server database schema catalog")
    cat+="**Source:** `sys.objects`, `sys.columns`, `sys.indexes`, `sys.foreign_keys`, `sys.sql_expression_dependencies`; read-only.\n\n"
    if db.get('database'):
        cat+=table_md(db['database'],['database_name','sql_server_version','compatibility_level','has_view_definition'])+"\n\n"
    counts={(v['schema_name'],v['table_name']):v['estimated_rows'] for v in db.get('row_estimates',[])}
    rows=[]
    for o in tables:
        rows.append({'schema':o['schema_name'],'table':o['object_name'],
                     'estimated_rows':counts.get((o['schema_name'],o['object_name']),'unknown'),
                     'origin_classification':('CUSTOMER_NAMING_CUE' if o['object_name'].upper().startswith('IPTH_') else 'NON_IPTH_NAME')})
    cat+="## Tables\n\n"+table_md(rows,['schema','table','estimated_rows','origin_classification'])+"\n\n"
    cat+=("**Origin classification is only a naming heuristic.** `IPTH_` is not a verified ownership boundary.\n\n"
          "## Table and view columns\n\n")
    groups=defaultdict(list)
    for c in cols:groups[(c['schema_name'],c['object_name'])].append(c)
    for (schema,name),cc in sorted(groups.items(),key=lambda x:(x[0][0],x[0][1])):
        cat+=f"### `{schema}.{name}`\n\n"+table_md(cc,['column_name','data_type','max_length','precision','scale','is_nullable','is_identity','has_default'])+"\n\n"
    fks=db.get('foreign_keys',[])
    cat+="## Foreign keys\n\n"+table_md(fks,['fk_name','from_schema','from_table','from_column','to_schema','to_table','to_column','on_delete'])+"\n\n"
    cat+="## Indexes / uniqueness\n\n"+table_md(db.get('indexes',[]),['schema_name','table_name','index_name','is_primary_key','is_unique','key_ordinal','is_included_column','column_name'])+"\n\n"
    cat+="## Check constraints / triggers\n\n"+table_md(db.get('checks',[]),['schema_name','table_name','constraint_name'])+"\n\n"+table_md(db.get('triggers',[]),['parent_schema','parent_table','trigger_name','is_disabled'])+"\n\n"
    cat+="## SQL object dependencies\n\n"+table_md(db.get('dependencies',[]),['referencing_schema','referencing_object','referencing_type','referenced_schema','referenced_object'])+"\n\n"
    cat+="## Metadata restrictions\n\n"
    for w in db.get('warnings',[]):cat+=f"- {md_cell(w['section'])}: {md_cell(w['error'])}\n"
    if not db.get('warnings'):cat+="No SQL query failures recorded; permissions may still hide some objects.\n"
    apis=title("API endpoint inventory (static Python AST)")
    apis+=("Routes may be mounted under router prefixes not resolved by static decorators. "
           "Read the registration code to determine external URL.\n\n"+
           table_md(src.get('api_routes',[]),['method','path','handler','file','line'])+"\n")
    relevant=src.get('evidence',[])
    impact=title("Source reference map and module discovery")
    impact+=("## Files with references to RAW, Barcode, Batch transfer, Workcenters or Serial\n\n"+
             table_md([{'file':e['file'],'hit_count':e['total_references'],
                        'line_numbers':', '.join(str(h['line']) for h in e['references'][:20])} for e in relevant],
                      ['file','hit_count','line_numbers'])+"\n\n")
    impact+=("## DB tables appearing in source (heuristic text search)\n\n"+
             table_md([{'table':k,'files':', '.join(v[:8]),'file_count':len(v)} for k,v in sorted(ref.items())],
                      ['table','file_count','files'])+"\n\n")
    impact+=("Full `SOURCE_AUDIT.json` has SHA256 and per-line keyword hits. "
             "Matches are textual and may include comments; they do not establish call relationships.\n")
    raw=title("MES2 RAW Material — evidence-led architectural audit")
    raw+=("## Requested barcode and behavior (business requirements, not implementation)\n\n"
          "- Barcode: `PN;QTY;UOM;SERIAL`, for example `PISCR07-0352-01;2000;PCS;2644000001`.\n"
          "- Preserve UOM (e.g. PCS, KG) and Serial as a string; parse QTY with Decimal precision.\n"
          "- Re-scan same serial on same WO: idempotent. Different WO: request remaining quantity.\n"
          "- Investigate all consumers of RAW data before schema change.\n\n")
    candidate=["Raw_Materials_Master","RawMaterialLog","Batches_Master","Batches_Consumption_Log","Master_WO_Log","ModelConfigs","WorkCenter_Master"]
    lower_lookup={o['object_name'].lower():o for o in tables}
    raw+="## Relevant DB table existence and columns\n\n"
    for name in candidate:
        table=lower_lookup.get(name.lower())
        if not table:
            if not db.get("database"):
                raw+=f"### `{name}` — NOT CHECKED (database not inspected)\n\n"
            else:
                raw+=f"### `{name}` — NOT FOUND in visible catalog\n\nMay have another schema/name or be hidden by permissions.\n\n"
            continue
        sch=table['schema_name']
        raw+=f"### `{sch}.{table['object_name']}`\n\n"
        cc=groups.get((sch,table['object_name']),[])
        raw+=table_md(cc,['column_name','data_type','precision','scale','is_nullable','is_identity'])+"\n\n"
        related_fk=[r for r in fks if r['from_table'].lower()==name.lower() or r['to_table'].lower()==name.lower()]
        if related_fk:
            raw+="Foreign-key relationships:\n\n"+table_md(related_fk,['fk_name','from_table','from_column','to_table','to_column'])+"\n\n"
        references=ref.get(table['object_name'],[])
        raw+=(f"Source files mentioning name: **{len(references)}**.\n\n"+
              "\n".join(f"- `{r}`" for r in references[:35])+"\n\n")
    raw+=("## Expected flow to validate in source\n\n"
          "`FE scanner / RAW_QTY rules → workstation API → WoValidation /logRawMaterial → "
          "Raw_Materials_Master → /getLoggedMaterials → Traceability / Packing`.\n\n"
          "Compare against `logInputMain` + `transferInputBatch` and `Batches_Consumption_Log`; "
          "do not assume the same storage semantics.\n\n"
          "## Before any migration\n\n"
          "1. Validate whether Serial uniqueness is per PN or global, and whether barcode QTY means original or remaining QTY.\n"
          "2. Establish actual FK *and implicit* references (dynamic SQL may be absent from catalog dependencies).\n"
          "3. Determine whether `RawMaterialLog` is an independent Packing feature.\n"
          "4. Design UOM Decimal precision and any approved conversions; never infer KG/PCS equivalence.\n"
          "5. Decide the legacy data strategy, including serial-less rows and idempotency.\n"
          "6. Investigate concurrency, logging, and traceability impacts before changing tables.\n")
    gaps=title("Unverified assumptions, evidence gaps and next decisions")
    gaps+=("1. **No production-side code execution:** this is static inspection, not end-to-end functional validation.\n"
           "2. **No business data read:** duplicates, serial quality, current counts and historical reuse remain unknown.\n"
           "3. **Metadata visibility:** missing VIEW DEFINITION or insufficient catalog privileges can hide dependencies.\n"
           "4. **Dynamic SQL and references not enforced by FK:** may not appear in sys.sql_expression_dependencies.\n"
           "5. **External consumers:** Zebra app, SAP integration, dashboards, external jobs may not be captured by FE/BE inventory.\n"
           "6. **UOM semantics:** decide decimal scale, allowed unit codes and conversion rules with customer.\n"
           "7. **Serial identity:** decide global Serial UNIQUE or composite (PN, Serial).\n"
           "8. **Ownership:** `IPTH_` prefix is only a customer-table naming hint, not proof.\n"
           "9. **Git consistency:** compare HEAD and live running deployments separately.\n"
           "10. **Documentation:** curated `docs/mes_agent` must be updated by a later reviewed updater, not overwritten by this audit.\n\n")
    gaps+="## SQL query warnings\n\n"+table_md(db.get('warnings',[]),['section','error'])+"\n"
    readme=title("MES2 audit bundle — agent handoff")
    readme+=("Read `OVERVIEW.md` then `RAW_MATERIAL_AUDIT.md`, `DB_SCHEMA_CATALOG.md`, "
             "`API_ENDPOINTS.md`, and `SOURCE_IMPACT_MAP.md`.\n\n"
             "This bundle contains inventory and metadata, **not database row contents or repository source**. "
             "Use the existing SourceCollector to obtain actual files needed for implementation.\n\n"
             "Never claim the audit observed code execution. Confirm all unknowns in `GAPS_AND_DECISIONS.md`.\n"
             "Never paste DATABASE_URL/credentials into an agent chat or commit the audit with secrets.\n")
    return {"README_AGENT.md":readme,"OVERVIEW.md":overview,"DB_SCHEMA_CATALOG.md":cat,
            "API_ENDPOINTS.md":apis,"SOURCE_IMPACT_MAP.md":impact,
            "RAW_MATERIAL_AUDIT.md":raw,"GAPS_AND_DECISIONS.md":gaps}


def save_outputs(root, result, folder):
    folder.mkdir(parents=True,exist_ok=False)
    for name,data in result.items():
        (folder/name).write_text(data if isinstance(data,str) else json.dumps(data,ensure_ascii=False,indent=2,default=jsonable)+"\n",encoding="utf-8")
    out=folder.with_suffix(".zip")
    if out.exists():raise RuntimeError("REJECT: archive path exists: "+str(out))
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=7) as z:
        for p in sorted(folder.iterdir()):
            z.write(p,arcname=p.name)
    return out




# FINAL SCHEMA FREEZE EXTENSION
# These queries only read SQL Server metadata; do not query business data rows.
# Full definitions below include DDL expressions, *not* stored procedure bodies.
QUERIES.update({
    "database_extended": """
        SELECT DB_NAME() AS database_name,
               d.compatibility_level, d.collation_name,
               d.snapshot_isolation_state_desc,
               d.is_read_committed_snapshot_on,
               d.is_cdc_enabled,
               d.is_auto_create_stats_on,
               d.is_auto_update_stats_on,
               HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') AS has_view_definition
        FROM sys.databases d WHERE d.database_id=DB_ID()
    """,
    "tables_extended": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name, t.name AS table_name,
               t.object_id, t.is_memory_optimized, t.durability_desc,
               t.temporal_type_desc, t.history_table_id,
               t.is_tracked_by_cdc, t.lock_escalation_desc,
               t.is_filetable
        FROM sys.tables AS t WHERE t.is_ms_shipped=0
        ORDER BY schema_name, table_name
    """,
    "columns_extended": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name, t.name AS table_name,
               c.column_id, c.name AS column_name, typ.name AS data_type,
               c.max_length, c.precision, c.scale, c.collation_name,
               c.is_nullable, c.is_identity, c.is_computed, c.is_rowguidcol,
               c.is_sparse, c.is_hidden,
               dc.name AS default_name, dc.definition AS default_definition,
               cc.definition AS computed_definition, cc.is_persisted,
               CONVERT(nvarchar(100), ic.seed_value) AS identity_seed,
               CONVERT(nvarchar(100), ic.increment_value) AS identity_increment,
               c.generated_always_type_desc
        FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
        JOIN sys.types typ ON typ.user_type_id=c.user_type_id
        LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
        LEFT JOIN sys.computed_columns cc
               ON cc.object_id=c.object_id AND cc.column_id=c.column_id
        LEFT JOIN sys.identity_columns ic
               ON ic.object_id=c.object_id AND ic.column_id=c.column_id
        WHERE t.is_ms_shipped=0
        ORDER BY schema_name,table_name,c.column_id
    """,
    "indexes_extended": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name, t.name AS table_name,
               i.name AS index_name, i.index_id, i.type_desc,
               i.is_primary_key, i.is_unique, i.is_unique_constraint,
               i.is_disabled, i.has_filter, i.filter_definition,
               ic.index_column_id, ic.key_ordinal, ic.is_included_column,
               ic.is_descending_key, c.name AS column_name,
               ds.name AS data_space_name
        FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id
        LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
        LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
        LEFT JOIN sys.data_spaces ds ON ds.data_space_id=i.data_space_id
        WHERE t.is_ms_shipped=0 AND i.index_id>0 AND i.is_hypothetical=0
        ORDER BY schema_name,table_name,i.index_id,ic.index_column_id
    """,
    "checks_extended": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name, t.name AS table_name,
               ck.name AS check_name, ck.definition, ck.is_disabled, ck.is_not_trusted
        FROM sys.tables t JOIN sys.check_constraints ck ON ck.parent_object_id=t.object_id
        WHERE t.is_ms_shipped=0
        ORDER BY schema_name,table_name,check_name
    """,
    "foreign_keys_extended": """
        SELECT fk.name AS fk_name,
               SCHEMA_NAME(src.schema_id) AS from_schema, src.name AS from_table,
               SCHEMA_NAME(dst.schema_id) AS to_schema, dst.name AS to_table,
               sc.name AS from_column, dc.name AS to_column,
               fkc.constraint_column_id AS column_ordinal,
               fk.delete_referential_action_desc AS on_delete,
               fk.update_referential_action_desc AS on_update,
               fk.is_disabled, fk.is_not_trusted, fk.is_not_for_replication
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
        JOIN sys.tables src ON src.object_id=fkc.parent_object_id
        JOIN sys.columns sc ON sc.object_id=src.object_id AND sc.column_id=fkc.parent_column_id
        JOIN sys.tables dst ON dst.object_id=fkc.referenced_object_id
        JOIN sys.columns dc ON dc.object_id=dst.object_id AND dc.column_id=fkc.referenced_column_id
        ORDER BY from_schema,from_table,fk_name,column_ordinal
    """,
    "key_constraints": """
        SELECT SCHEMA_NAME(t.schema_id) AS schema_name,t.name AS table_name,
               kc.name AS constraint_name, kc.type_desc,
               i.name AS backing_index_name,i.type_desc AS backing_index_type
        FROM sys.key_constraints kc JOIN sys.tables t ON t.object_id=kc.parent_object_id
        JOIN sys.indexes i ON i.object_id=t.object_id AND i.index_id=kc.unique_index_id
        WHERE t.is_ms_shipped=0
        ORDER BY schema_name,table_name,constraint_name
    """,
    "sql_modules": """
        SELECT SCHEMA_NAME(o.schema_id) AS schema_name,o.name AS object_name,
               o.type_desc, sm.uses_ansi_nulls, sm.uses_quoted_identifier,
               sm.is_schema_bound, sm.execute_as_principal_id,
               CASE WHEN sm.definition IS NULL THEN 1 ELSE 0 END AS is_definition_hidden,
               CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(varbinary(max),sm.definition)),2) AS definition_sha256
        FROM sys.objects o JOIN sys.sql_modules sm ON sm.object_id=o.object_id
        WHERE o.is_ms_shipped=0 AND SCHEMA_NAME(o.schema_id) NOT IN ('cdc','sys')
        ORDER BY schema_name,object_name
    """,
    "sequences": """
        SELECT SCHEMA_NAME(seq.schema_id) AS schema_name,seq.name AS sequence_name,
               typ.name AS base_type,seq.precision,seq.scale,
               CONVERT(nvarchar(100),seq.start_value) AS start_value,
               CONVERT(nvarchar(100),seq.increment) AS increment_value,
               seq.is_cycling,seq.is_cached
        FROM sys.sequences seq JOIN sys.types typ ON typ.user_type_id=seq.user_type_id
        ORDER BY schema_name,sequence_name
    """,
    "user_types": """
        SELECT SCHEMA_NAME(ty.schema_id) AS schema_name,ty.name AS type_name,
               ty.is_user_defined,ty.is_table_type,ty.max_length,ty.precision,ty.scale
        FROM sys.types ty WHERE ty.is_user_defined=1 OR ty.is_table_type=1
        ORDER BY schema_name,type_name
    """,
    "synonyms": """
        SELECT SCHEMA_NAME(s.schema_id) AS schema_name,s.name AS synonym_name,
               s.base_object_name FROM sys.synonyms s ORDER BY schema_name,synonym_name
    """,
    "object_extended_properties": """
        SELECT SCHEMA_NAME(o.schema_id) AS schema_name,o.name AS object_name,
               ep.name AS property_name,
               CONVERT(nvarchar(300),ep.value) AS property_value
        FROM sys.extended_properties ep JOIN sys.objects o
          ON o.object_id=ep.major_id AND ep.minor_id=0
        WHERE ep.class=1 AND o.is_ms_shipped=0
        ORDER BY schema_name,object_name,property_name
    """,
})

# Classification is a *candidate assessment*, not an authoritative ownership decision.
MES_CANDIDATE_NAMES = {
    "AssyPackingLinkage", "Batches_Consumption_Log", "Batches_Master", "Box_Master",
    "Box_Status", "DefectsLog", "Master_Defect_Codes", "Master_Defect_Log",
    "Master_WO_Log", "Master_WO_Message", "MES_UsersMaster", "ModelConfigs",
    "Raw_Materials_Master", "RoutingConfigs", "SerialTracker", "Sys_Config_Change_Log",
    "Sys_Plot_Presets", "WCMap", "wip_inventory", "WorkCenter_Master",
    "RawMaterialLots", "RawMaterialUsage", "MES_ReworkJobs", "MES_ReworkInputs",
    "MES_ReworkOutputs", "MES_BatchHoldAudit", "MES_MasterDataCSV_Audit",
}
SHARED_CANDIDATE_NAMES = {"IPTH_BOM_LIST"}
MES_TRIGGER_CANDIDATES = {"TRG_IPTH_BOM_Deep_Capture"}

_orig_inspect_database = inspect_database

def inspect_database(engine):
    result = _orig_inspect_database(engine)
    # A deployable DDL cannot be established with missing index/check/default metadata.
    if result.get("warnings"):
        failed = ', '.join(w.get("section", "?") for w in result["warnings"])
        raise RuntimeError("Incomplete SQL catalog metadata: " + failed +
                           ". Request VIEW DEFINITION access and rerun. No writes made.")
    dbrow = result.get("database_extended", [{}])[0]
    if not dbrow or int(dbrow.get("has_view_definition") or 0) != 1:
        raise RuntimeError("VIEW DEFINITION on database is required for FINAL freeze audit")
    result["scope"] = (
        "Complete catalog metadata for DDL review, excluding customer table rows "
        "and SQL module bodies. Cross-check with repository migration files."
    )
    return result


def scan_migrations(root):
    """Return SQL file SHA and optional migration SQL text for reviewed DDL reconstruction.

    Avoid full application source or env. SQL migration text is bounded and flags
    potential secrets; user should review ZIP before sharing if SQL contains literals.
    """
    paths=[]; payload={}; warnings=[]
    for base in (root/BE/"database"/"sql_updates",root/BE/"database"/"migrations"):
        if not base.exists(): continue
        for path in sorted(base.rglob("*")):
            if not path.is_file() or path.is_symlink() or path.suffix.lower() not in {".sql", ".md", ".json"}:
                continue
            if any(q.lower() in {"backup", ".git"} for q in path.parts): continue
            if path.stat().st_size>600_000:
                warnings.append({"file":str(path.relative_to(root)),"issue":">600KB; omitted"});continue
            rel=path.relative_to(root).as_posix()
            data=path.read_bytes()
            entry={"file":rel,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
            try: body=data.decode("utf-8-sig")
            except UnicodeDecodeError:
                entry["status"]="non_utf8_omitted"
            else:
                # Do not export statements containing typical secret literals.
                if re.search(r"(?im)^\s*(?:--\s*)?(?:password|pwd|secret|token|api_key|DATABASE_URL)\s*[:=]",body):
                    entry["status"]="suspected_secret_omitted"
                    warnings.append({"file":rel,"issue":"possible secret, content omitted"})
                else:
                    entry["status"]="captured"
                    payload[rel]=body
            paths.append(entry)
    return {"files":paths,"warnings":warnings,"sql_contents":payload,
            "notice":"Contains SQL migration source text, no customer data rows. Inspect before external sharing."}


def inventory_rows(db, src):
    objects=[o for o in db.get("objects",[]) if str(o.get("type","")).strip()=="U"]
    src_refs={k.lower():v for k,v in src.get("db_object_file_references",{}).items()}
    rows={r.get("table_name","").lower():r.get("estimated_rows") for r in db.get("row_estimates",[])}
    ext={r.get("table_name","").lower():r for r in db.get("tables_extended",[])}
    fk_from=defaultdict(list); fk_to=defaultdict(list)
    for fk in db.get("foreign_keys_extended",[]):
        fk_from[fk.get("from_table","").lower()].append(fk.get("to_table"))
        fk_to[fk.get("to_table","").lower()].append(fk.get("from_table"))
    answer=[]
    for o in sorted(objects,key=lambda x:(x.get("schema_name", ""),x.get("object_name", ""))):
        n=o["object_name"]; low=n.lower()
        if low in {x.lower() for x in MES_CANDIDATE_NAMES}:
            category="MES_CANDIDATE_REVIEW"
        elif low in {x.lower() for x in SHARED_CANDIDATE_NAMES}:
            category="SHARED_DEPENDENCY_CANDIDATE_REVIEW"
        else:
            category="UNCLASSIFIED_REVIEW"
        e=ext.get(low,{})
        answer.append({"schema":o["schema_name"],"table":n,
                       "classification_candidate":category,
                       "referenced_in_source_files":src_refs.get(low,[])[:150],
                       "source_reference_file_count":len(src_refs.get(low,[])),
                       "fk_parents":sorted(set(fk_from.get(low,[]))),
                       "fk_children":sorted(set(fk_to.get(low,[]))),
                       "row_estimate":rows.get(low),
                       "is_memory_optimized":e.get("is_memory_optimized"),
                       "durability_desc":e.get("durability_desc"),
                       "is_tracked_by_cdc":e.get("is_tracked_by_cdc")})
    return answer


def markdown_table(items, keys):
    return table_md(items,keys) if items else "*(không có dữ liệu)*"


def final_docs(db,src,migrations,table_rows):
    date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    have_db=bool(db.get("database"))
    lines=["# MES — FINAL database inventory (evidence-first)","",
           f"Audit UTC: `{date}`. Đây là **ứng viên phân loại**, CHƯA duyệt danh sách để deploy.","",
           "## Trạng thái", "",
           "- SQL Server catalog: "+("đã truy cập" if have_db else "CHƯA TRUY CẬP — source-only"),
           "- Không đọc dữ liệu nghiệp vụ; `row_estimate` lấy từ metadata partitions.",
           "- `source_reference_file_count` là static textual evidence, không chứng minh runtime call.",
           "- Mọi bảng `UNCLASSIFIED_REVIEW` cần được chốt rõ thuộc MES / Shared / Legacy.",
           "- Đặc biệt không mặc định `IPTH_*` là không sử dụng hoặc là do MES sở hữu.","",
           "## Danh sách tất cả bảng thực tế", "",
           markdown_table(table_rows,["schema","table","classification_candidate", "source_reference_file_count",
                                      "row_estimate","is_memory_optimized","is_tracked_by_cdc"]),"",
           "## Công việc review thủ công bắt buộc", "",
           "1. Gắn owner + deploy_action cho từng bảng: CREATE_NEW / PREEXISTING_REQUIRED / SKIP_LEGACY / REVIEW.",
           "2. Kiểm tra tất cả nguồn viết SQL bằng dynamic SQL và service ngoài Python FE/BE.",
           "3. Kiểm tra ngữ nghĩa dữ liệu gốc, seed/config tối thiểu và dữ liệu phải được khôi phục riêng.",
           "4. Xác định có triển khai vào DB trống hoàn toàn hay DB khách đã có IPTH_*.",
           "5. Kiểm tra riêng `IDENTITY` của `MES_UsersMaster.Emp_ID`, `WorkCenter_Master.ID`, `Master_Defect_Codes.ID`.",
           "6. Chốt cột `Batches_Master.IsFrozen/IsQCHeld` và các constraint V0002/V0003.",
           "7. Kiểm tra trigger `TRG_IPTH_BOM_Deep_Capture` và bảng `IPTH_BOM_Change_Queue`.",
           "8. Xem xét metadata CDC / temporal / memory optimization trước khi viết DDL.","",
           "## Lỗi metadata", "",
           markdown_table(db.get("warnings",[]),["section","error"]),"",
           "## Ý nghĩa", "",
           "Báo cáo này dùng để chốt schema; không phải SQL deployment script."
           ]
    plan=["# MES — New database deployment PLAN (NOT EXECUTABLE)","",
          "## 0. Quyết định môi trường",
          "- **Overlay mode (khuyến nghị):** DB khách đã có các bảng shared như `IPTH_BOM_LIST`; chỉ tạo MES-owned objects.",
          "- **Empty database mode:** cần script/backup do khách cung cấp để tạo shared tables trước, KHÔNG tự tổng hợp các bảng IPTH_ từ đoán.","",
          "## 1. FREEZE source + database schema",
          "Chạy collector trên Dev runtime mới nhất; lưu ZIP + git SHA FE/BE; kiểm tra danh sách migration SQL.","",
          "## 2. Phân quyền sở hữu và dependency DAG",
          "Duyệt từng bảng, default, CHECK, PK/UNIQUE, indexes/filter, FK, triggers, views, functions, sequences, CDC.","",
          "## 3. Chuẩn hóa baseline deploy",
          "Tạo DDL định nghĩa cuối cùng của MES-owned tables. Không mặc định áp dụng lần lượt V0000-V0004 trên DB trống ",
          "nếu các migration đã sửa hoặc có tác động đến bảng shared.","",
          "## 4. Tách các lớp deploy SQL",
          "- 00_PRECHECK.sql: chỉ đọc, fail-fast nếu sai DB hoặc thiếu shared dependencies.",
          "- 01_CREATE_TABLES.sql: schema/PK/default/identity/cột, đúng storage disk-based.",
          "- 02_CONSTRAINTS_INDEXES.sql: FK/check/unique/filtered indexes sau khi đủ dependencies.",
          "- 03_ROUTINES_TRIGGERS.sql: chỉ object MES-owned; trigger trên shared table cần phê duyệt.",
          "- 04_SEED_REFERENCE.sql: cấu hình hệ thống tối thiểu, tách khỏi business records.",
          "- 05_VERIFY.sql: kiểm tra exact metadata, identity, FK, index filters, migrations và quyền.",
          "- 06_ROLLBACK_GUIDE.md: quản trị backup/restore; không DROP bảng customer.","",
          "## 5. Tiêu chí nghiệm thu",
          "- Có bảng mapping ownership đã được duyệt; không còn đối tượng phụ thuộc chưa xác minh.",
          "- Schema check exact: columns/nullability/default/identity/check/index/filter/FK/trigger.",
          "- V0001/V0002/V0003/V0004 cuối cùng hợp nhất đúng, không tạo trùng schema.",
          "- MES starts on empty MES dataset, smoke-test login, WO, RAW, RW, QC Hold, master CSV.",
          "- Replay cẩn thận các nghiệp vụ rollback, negative test, concurrency.",
          "- KHÔNG tự động xóa/ghi lại dữ liệu `IPTH_*` hoặc shared tables.","",
          "## CẢNH BÁO",
          "Chưa đủ bằng chứng để xuất 01_CREATE_TABLES.sql an toàn. Collector sẽ cung cấp metadata để thiết kế script."
          ]
    migration_lines=["# Migration scripts hiện có (chưa xác nhận đã chạy trên DB)","",
                     "SQL bodies được giữ trong `SQL_MIGRATION_SOURCES.json` để kiểm tra xây baseline.","",
                     markdown_table(migrations.get("files",[]),["file","bytes","sha256","status"]),"",
                     "Lưu ý: tệp trong repo không tự chứng minh migration đã APPLY trên database."]
    return {"MES_FINAL_TABLE_INVENTORY.md":"\n".join(lines)+"\n",
            "MES_NEW_DB_DEPLOY_PLAN.md":"\n".join(plan)+"\n",
            "MIGRATION_FILE_INVENTORY.md":"\n".join(migration_lines)+"\n",
            "FINAL_TABLE_CANDIDATES.json":table_rows,
            "SQL_MIGRATION_SOURCES.json":migrations}

_old_generate_docs = generate_docs

def generate_docs(root, db, src, checks, audit_name):
    docs=_old_generate_docs(root,db,src,checks,audit_name)
    migrations=scan_migrations(root)
    docs.update(final_docs(db,src,migrations,inventory_rows(db,src)))
    return docs


def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--scan",action="store_true",help="preflight only, no file writes")
    mode.add_argument("--audit",action="store_true",help="read-only code+DB audit and Markdown export")
    mode.add_argument("--collect",dest="audit",action="store_true",help="alias of --audit")
    parser.add_argument("--source-only",action="store_true",help="explicitly allow no DB metadata (partial audit)")
    parser.add_argument("--root",type=Path,help="path containing FE and BE; defaults to current directory search")
    parser.add_argument("--env-file",type=Path,help="optional local .env file; overrides search path, not process env")
    parser.add_argument("--output-dir",type=Path,help="parent directory for audit folder, default ~/Downloads")
    args=parser.parse_args()
    root=find_root((args.root or Path.cwd()).expanduser().resolve())
    print("MES FINAL SCHEMA READ-ONLY AUDIT | no database business rows read, no project edits")
    print("Root:",root)
    url,url_source=env_url(root,args.env_file.expanduser().resolve() if args.env_file else None)
    print("DB configuration:",url_source,"(credentials hidden)")
    checks,engine=preflight(root,url,args.source_only)
    rejected=any(c['status']=='REJECT' for c in checks)
    print("VERDICT:","REJECT" if rejected else "PASS" if all(c['status']=='PASS' for c in checks) else "WARN")
    if args.scan:
        if engine is not None:engine.dispose()
        print("SCAN ONLY: no file writes or customer data access.")
        return 2 if rejected else 0
    if rejected:
        if engine is not None:engine.dispose()
        print("REJECT: audit not generated. Fix preflight or use --source-only for partial audit.")
        return 2
    db=inspect_database(engine) if engine is not None else {"warnings":[{"section":"database","error":"source-only mode; DB not inspected"}]}
    if engine is not None: engine.dispose()
    known_tables=[o['object_name'] for o in db.get('objects',[]) if str(o['type']).strip() in ('U','V')]
    src=source_audit(root,known_tables)
    timestamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    audit_id="IPTH_MES_FinalSchema_Audit_"+timestamp
    docs=generate_docs(root,db,src,checks,audit_id)
    manifest={"audit_id":audit_id,"time_utc":timestamp,"root_structure":"Interplex_MES_FE + Interplex_MES_BE",
              "safety":"READ_ONLY_METADATA_NO_CUSTOMER_ROWS_NO_CREDENTIALS",
              "git":{FE:git_state(root/FE),BE:git_state(root/BE)},
              "report_files":sorted(docs),"source_index_count":len(src['files']),
              "database_tables_found":len([o for o in db.get('objects',[]) if str(o['type']).strip()=='U']),
              "caveat":"Completeness depends on metadata permissions and static-analysis coverage."}
    data={**docs,"DB_CATALOG.json":db,"SOURCE_AUDIT.json":src,"AUDIT_MANIFEST.json":manifest}
    parent=(args.output_dir or Path.home()/"Downloads").expanduser().resolve()
    parent.mkdir(parents=True,exist_ok=True)
    folder=parent/audit_id
    try:archive=save_outputs(root,data,folder)
    except Exception:
        if folder.exists() and not any(folder.iterdir()):folder.rmdir()
        raise
    print(f"GENERATED: {folder}\nZIP: {archive}")
    print("Review Markdown first, then share ZIP with your next agent.")
    print("WARNING: These reports describe a dev DB replica, not verified customer production DB.")
    return 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as error:
        print("REJECT:",safe_name(type(error).__name__+": "+str(error)),file=sys.stderr)
        sys.exit(2)
