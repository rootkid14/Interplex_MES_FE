#!/usr/bin/env python3
"""IPTH MES2 v1.1 unified *read-only* source + SQL Server architecture audit.

Installation (place in FE/developer_tools, execute from BE):
    python ../Interplex_MES_FE/developer_tools/IPTH_MES2_SystemAudit.py --scan
    python ../Interplex_MES_FE/developer_tools/IPTH_MES2_SystemAudit.py --audit

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
    print("MES2 UNIFIED AUDIT | no database rows read, no project edits")
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
    audit_id="IPTH_MES2_Audit_"+timestamp
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
