#!/usr/bin/env python3
"""Read-only Interplex MES source collection for In-Memory -> Disk-Based API migration.
Run from ~/IPTH_Traceability/Interplex_MES_BE.
No database connection. No repository mutation. Review ZIP before sharing.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import zipfile
from pathlib import Path

SCAN_SUFFIXES = {'.py', '.sql'}
EXCLUDE_DIRS = {'.git', '.venv', 'venv', 'env', 'node_modules', '__pycache__',
                '.pytest_cache', '.mypy_cache', 'dist', 'build', 'coverage',
                '.ipth_mes_updater_backups', '.next'}
EXCLUDE_NAMES = {'.env', 'secrets.py', 'credentials.py', 'config.json', 'settings.json'}
CANDIDATE = re.compile(r'\bSNAPSHOT\b|\bMEMORY_OPTIMIZED\b|\bDBMasterWOLog\b|\bDBMasterWOMessage\b|\bMaster_WO_Log\b|\bMaster_WO_Message\b', re.I)
DIRECT = re.compile(r'WITH\s*\(\s*SNAPSHOT\s*\)|with_hint\s*\(|memory_optimized\s*=\s*True', re.I)
DEPENDENCY_HINTS = ('masterwolog.py', 'dashboardmessage.py', 'log_cleaner.py', 'db_engine.py')
MAX_BYTES = 2_000_000
MAX_FILES = 180

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def main() -> int:
    ap = argparse.ArgumentParser(description='Read-only source scan for disk-based migration')
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--scan', action='store_true', help='Print source inventory and matches')
    mode.add_argument('--collect', action='store_true', help='Create ZIP under ~/Downloads')
    args = ap.parse_args()
    be = Path.cwd().resolve()
    fe = be.parent / 'Interplex_MES_FE'
    if be.name != 'Interplex_MES_BE' or not (be / 'app').is_dir() or not fe.is_dir():
        print('REJECT: Run from ~/IPTH_Traceability/Interplex_MES_BE (FE sibling required).', file=sys.stderr)
        return 2
    candidates = []
    skipped = []
    for directory, dirs, files in os.walk(be):
        dirs[:] = [d for d in sorted(dirs) if d not in EXCLUDE_DIRS]
        for name in sorted(files):
            p = Path(directory) / name
            if p.suffix.lower() not in SCAN_SUFFIXES or name.lower() in EXCLUDE_NAMES:
                continue
            rel = p.relative_to(be).as_posix()
            try:
                size = p.stat().st_size
                if size > MAX_BYTES:
                    skipped.append({'path': rel, 'reason': f'too_large_{size}'})
                    continue
                raw = p.read_bytes()
                s = raw.decode('utf-8')
            except Exception as exc:
                skipped.append({'path': rel, 'reason': type(exc).__name__})
                continue
            matched = [(n, line.strip()[:240]) for n, line in enumerate(s.splitlines(), 1)
                       if CANDIDATE.search(line)]
            if not matched and name.lower() not in DEPENDENCY_HINTS:
                continue
            is_historical_sql = rel.startswith('database/sql_updates/')
            is_direct = any(DIRECT.search(line) for line in s.splitlines())
            candidates.append({'path': rel, 'sha256': sha256(raw), 'size': len(raw),
                               'direct_code_impact': bool(is_direct and not is_historical_sql),
                               'historical_sql_do_not_edit': is_historical_sql,
                               'matches': [{'line': n, 'text': line} for n, line in matched],
                               '_raw': raw})
    candidates.sort(key=lambda x: (not x['direct_code_impact'], x['path']))
    print(f'[SOURCE] Backend: {be}')
    print(f'[SOURCE] Frontend: {fe} (not modified or collected)')
    print(f'[RESULT] {len(candidates)} candidate files; {sum(x["direct_code_impact"] for x in candidates)} direct code-impact files')
    for c in candidates:
        flag = 'DIRECT' if c['direct_code_impact'] else ('HISTORICAL-SQL' if c['historical_sql_do_not_edit'] else 'RELATED')
        print(f'[{flag}] {c["path"]}  matches={len(c["matches"])}  sha256={c["sha256"][:16]}')
    if skipped:
        print(f'[NOTE] {len(skipped)} files skipped (details in manifest if collected)')
    if args.scan:
        return 0
    if len(candidates) > MAX_FILES:
        print(f'REJECT: {len(candidates)} candidates exceeds safe limit {MAX_FILES}.', file=sys.stderr)
        return 3
    out_dir = Path.home() / 'Downloads'
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    target = out_dir / f'IPTH_DiskBased_Source_{stamp}.zip'
    manifest = {
        'tool': 'IPTH_MES_DiskBased_SourceCollector',
        'captured_utc': stamp,
        'source_tree': 'Interplex_MES_BE',
        'run_cwd': str(be),
        'purpose': 'source-first migration review, not code update',
        'files': [{k: v for k, v in c.items() if k != '_raw'} for c in candidates],
        'skipped': skipped,
        'NOTE': 'Review ZIP for secrets before sharing; no SQL connection attempted.',
    }
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
        for c in candidates:
            if not c['historical_sql_do_not_edit']:
                z.writestr('Interplex_MES_BE/' + c['path'], c['_raw'])
    with zipfile.ZipFile(target) as z:
        invalid = z.testzip()
        if invalid:
            print(f'ERROR: ZIP integrity check failed: {invalid}', file=sys.stderr)
            return 4
    print(f'[COLLECTED] {target}')
    print('[SAFETY] Contains source excerpts/files, not database rows. Inspect for secrets before uploading.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
