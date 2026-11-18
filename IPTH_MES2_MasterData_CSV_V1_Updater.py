#!/usr/bin/env python3
# MES2 Master Data CSV v1 — runtime, SQL DDL files, and handoff docs only.
# Run from Interplex_MES_BE: python ../Interplex_MES_FE/<script>.py --scan|--apply|--verify|--rollback|--collect
import argparse
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import zipfile
import zlib

PACKAGE = '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'
BEFORE = {'Interplex_MES_BE/app/api/v1/api.py': 'febcfec9fa2dca0e9b3f03642c74866526170828e3b49a7d07160b1a35e423f9', 'Interplex_MES_FE/src/App.jsx': '1132ae567f28194495b3783e5aa5d34b98bde926a34bbcc42393dc1332bbd481', 'Interplex_MES_FE/src/components/layout/Sidebar.jsx': '71bd913a7dd923411af75a05cdeb4ce39ab8f1c661c16cac3196df23fc771c89'}
VERSION = 'IPTH_MES2_MasterDataCSV_v1_20261118'
FILES = json.loads(zlib.decompress(base64.b64decode(PACKAGE)).decode('utf-8'))
AFTER = {p: hashlib.sha256(content.encode()).hexdigest() for p,content in FILES.items()}


def digest(p):
    if not p.is_file(): return None
    return hashlib.sha256(p.read_bytes()).hexdigest()


def roots():
    be = Path.cwd().resolve()
    fe = Path(__file__).resolve().parent
    if be.name != 'Interplex_MES_BE' or fe.name != 'Interplex_MES_FE' or be.parent != fe.parent:
        raise RuntimeError('REJECT: run from Interplex_MES_BE with script in sibling Interplex_MES_FE')
    if not (be/'app/api/v1/api.py').is_file(): raise RuntimeError('REJECT: backend not found')
    return be, fe


def filepath(path, be, fe):
    anchor, rest = path.split('/',1)
    root = be if anchor=='Interplex_MES_BE' else fe if anchor=='Interplex_MES_FE' else None
    if root is None: raise RuntimeError('Invalid target')
    return root/rest


def status(be,fe,verbose=True):
    ready=True
    for path,body in FILES.items():
        file=filepath(path,be,fe)
        current=digest(file)
        after=AFTER[path]
        before=BEFORE.get(path)
        if current==after: state='INSTALLED'
        elif path in BEFORE and current==before:state='READY'
        elif path not in BEFORE and current is None:state='READY'
        else:state='REJECT';ready=False
        if verbose: print(f'[{state}] {path} actual={current or "ABSENT"} expected_before={before or "ABSENT"} expected_after={after}')
    return ready


def safe_backup_dir():
    return Path.home()/'.ipth_mes_updater_backups'/VERSION


def apply(be,fe):
    if not status(be,fe):raise RuntimeError('REJECT: source mismatch; run --collect')
    backup=safe_backup_dir(); manifest=backup/'manifest.json'
    if manifest.exists():
        if all(digest(filepath(p,be,fe))==AFTER[p] for p in FILES):
            print('PASS - already applied, no-op');return
        raise RuntimeError('REJECT: existing backup from previous apply; do not overwrite')
    if backup.exists() and not manifest.exists():
        archived = backup.with_name(VERSION + '_rolledback_' + datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ'))
        if archived.exists(): raise RuntimeError('REJECT: rollback archive already exists')
        backup.rename(archived)
    backup.mkdir(parents=True,exist_ok=False)
    records=[]
    for path,body in FILES.items():
        file=filepath(path,be,fe)
        previous=file.read_bytes() if file.exists() else None
        records.append({'path':path,'before':hashlib.sha256(previous).hexdigest() if previous is not None else None,'after':AFTER[path]})
        if previous is not None:
            dst=backup/'files'/path
            dst.parent.mkdir(parents=True,exist_ok=True)
            dst.write_bytes(previous)
    # Atomic per-file replacement + backup; rollback restores all at once if any failure.
    touched=[]
    try:
        for path,body in FILES.items():
            file=filepath(path,be,fe)
            if digest(file)==AFTER[path]:continue
            file.parent.mkdir(parents=True,exist_ok=True)
            with tempfile.NamedTemporaryFile('w',encoding='utf8',newline='',dir=file.parent,delete=False) as h:
                h.write(body);name=h.name
            try:os.replace(name,file)
            finally:
                if os.path.exists(name):os.unlink(name)
            touched.append(path)
            print('[APPLIED]',path)
        manifest.write_text(json.dumps({'version':VERSION,'files':records},indent=2),encoding='utf8')
    except Exception:
        for entry in records:
            path=entry['path'];file=filepath(path,be,fe)
            if path not in touched:continue
            prev=backup/'files'/path
            if entry['before'] is None:file.unlink(missing_ok=True)
            elif prev.exists():shutil.copy2(prev,file)
        raise
    print('PASS - Code/SQL files/docs installed. SQL V0004 must be run MANUALLY before using import.')
    print('BACKUP:',backup)


def rollback(be,fe):
    backup=safe_backup_dir(); mf=backup/'manifest.json'
    if not mf.is_file():raise RuntimeError('REJECT: no backup manifest')
    records=json.loads(mf.read_text())['files']
    for entry in records:
        file=filepath(entry['path'],be,fe)
        if digest(file)!=entry['after']:
            raise RuntimeError('REJECT: file changed after install: '+entry['path'])
    for entry in reversed(records):
        file=filepath(entry['path'],be,fe)
        old=backup/'files'/entry['path']
        if entry['before'] is None:file.unlink(missing_ok=True)
        else:shutil.copy2(old,file)
        print('[RESTORED]',entry['path'])
    mf.rename(backup/'manifest.rolled_back.json')
    print('PASS - source restored. V0004 database audit table is intentionally retained.')


def collect(be,fe):
    out=Path.home()/'Downloads'/('IPTH_MasterCSV_Source_'+datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')+'.zip')
    out.parent.mkdir(parents=True,exist_ok=True)
    needed=list(BEFORE)+[
     'Interplex_MES_BE/app/api/v1/endpoints/defectcodes.py',
     'Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py',
     'Interplex_MES_BE/app/models/legacy/defectcodes.py',
     'Interplex_MES_BE/app/models/legacy/user.py',
     'Interplex_MES_BE/app/db/session.py',
     'Interplex_MES_FE/src/store/AuthStore.js',
    ]
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for p in needed:
            f=filepath(p,be,fe)
            if f.is_file():z.write(f,arcname=p)
    print('COLLECTED:',out)


def main():
    p=argparse.ArgumentParser()
    for cmd in ('scan','apply','verify','rollback','collect'):
        p.add_argument('--'+cmd,action='store_true')
    args=p.parse_args()
    actions=[cmd for cmd in ('scan','apply','verify','rollback','collect') if getattr(args,cmd)]
    if len(actions)!=1: p.error('Specify exactly one action')
    be,fe=roots();cmd=actions[0]
    if cmd=='collect':collect(be,fe)
    elif cmd=='scan':
        if not status(be,fe):raise RuntimeError('VERDICT: REJECT — use --collect; source changed')
        print('VERDICT: PASS — ready (or already installed)')
    elif cmd=='verify':
        if not all(digest(filepath(path,be,fe))==after for path,after in AFTER.items()):raise RuntimeError('VERDICT: REJECT — incomplete files')
        print('VERDICT: PASS — all installed files SHA256 valid')
    elif cmd=='apply':apply(be,fe)
    elif cmd=='rollback':rollback(be,fe)

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('[ERROR]',exc,file=sys.stderr)
        sys.exit(2)
