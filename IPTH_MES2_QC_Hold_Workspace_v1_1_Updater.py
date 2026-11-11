#!/usr/bin/env python3
"""MES2 QC Batch Hold Workspace v1.1: fail-closed FE/BE/doc patch; no DB operations.

Usage (from Interplex_MES_BE):
  python ../Interplex_MES_FE/IPTH_MES2_QC_Hold_Workspace_v1_1_Updater.py --scan
  python ../Interplex_MES_FE/IPTH_MES2_QC_Hold_Workspace_v1_1_Updater.py --apply
  python ../Interplex_MES_FE/IPTH_MES2_QC_Hold_Workspace_v1_1_Updater.py --rollback
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zlib

RELEASE = "MES2_QC_Hold_Workspace_v1_1_20261111"
MANIFEST = [{'path': 'Interplex_MES_BE/app/api/v1/endpoints/qc_batch_hold.py', 'before': '58653bae64a84417767a5ef9af7c03e76f9b2a7d0e79ed1f7c1f56b7384478c0', 'after': '1eb445ff0acdcf38bea9d84767c116f88985a8d6d289e1b4276815a081351511', 'size': 8552}, {'path': 'Interplex_MES_FE/src/api/qcBatchAPI.js', 'before': 'b868a0d8f12e58158205b87097688404389d2349ff247aa4c79fba7f3afa890f', 'after': 'b1ed87efaca9ab84b842b2f2c8dc0dbf506cce6add7b56c8394121dcc7753789', 'size': 349}, {'path': 'Interplex_MES_FE/src/components/utilities/BatchHoldView.jsx', 'before': '27d82a5ffdef400518fc42752759d8844c658a669eedb9d6c837f45a896683ae', 'after': '77ac96a9df9552ef7dcce59f71cbe1dedf7fdd398d6576795493f0183a99f625', 'size': 14162}, {'path': 'Interplex_MES_FE/src/components/utilities/BatchHoldWorkspace.css', 'before': None, 'after': 'e5d681d6bcf24bcdabe9b3be6cd742b55f44defd441ebede1bec2d2541230980', 'size': 9194}, {'path': 'Interplex_MES_FE/docs/mes_agent/modules/BATCH_HOLD_AND_BATCH_TRACE.md', 'before': 'ca1843d8bd2ebf57d7b2c811118bab8bcbc5764c35c7e5015a54571cc96381f8', 'after': '01e430429e1807721fccc82caaff2de73cb080067b6367fd080c6120ee240769', 'size': 3022}, {'path': 'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md', 'before': '66ec1c8e8ca5fc13940062dfadfaa482776340e27359ba0cab7eeab6a36e4086', 'after': 'ecb90055b487c0488019e4fc3b87012b6723443822aea7bdb5a73480d1c8cc4f', 'size': 5997}, {'path': 'Interplex_MES_FE/docs/mes_agent/changes/2026-11-11-qc-hold-workspace-v1-1.md', 'before': None, 'after': '9aa5187f315332f3d66f912236a262a5fd900133f30a63337421be511bee67aa', 'size': 2480}]
DEPENDENCIES = [{'path': 'Interplex_MES_FE/src/App.jsx', 'sha256': '1132ae567f28194495b3783e5aa5d34b98bde926a34bbcc42393dc1332bbd481'}, {'path': 'Interplex_MES_FE/src/components/layout/Sidebar.jsx', 'sha256': '71bd913a7dd923411af75a05cdeb4ce39ab8f1c661c16cac3196df23fc771c89'}, {'path': 'Interplex_MES_FE/src/store/AuthStore.js', 'sha256': 'dbf3a54c2f598ff1a39fc7d048837a6425db9b172bff37c6c38ee7772423bed1'}, {'path': 'Interplex_MES_BE/app/api/v1/api.py', 'sha256': 'febcfec9fa2dca0e9b3f03642c74866526170828e3b49a7d07160b1a35e423f9'}, {'path': 'Interplex_MES_BE/database/sql_updates/V0003__qc_batch_hold/02_VERIFY.sql', 'sha256': '0cb766d13bcf54e56765dd3a8bbbc744800cf1b581fb34a175ea5c961bd3a551'}]
PAYLOADS = {'Interplex_MES_BE/app/api/v1/endpoints/qc_batch_hold.py': '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', 'Interplex_MES_FE/src/api/qcBatchAPI.js': 'eNqdjksLgkAURvf+irsIVPCxTwzKldAigvbexkkHdEadGyXif89HZQtXLYf7nXNGlJVqCLASUSG4JLg1qgTT89n0NAPD4M9pwpTUBDU7ILF8f4ohhM4A0IR011tA3UoG1nW82hDuwMIHih+zl3GyEr9m7rTxZ9DfdFwylfLLOY7U8Bk5TN+WPrFtL0VCZ+jkvEiPQtO3VGFbKEzXW5XSZJlLbKTdYsBNBz7g4mY5yoz/Z57ZFW0fGC9NqXWx', 'Interplex_MES_FE/src/components/utilities/BatchHoldView.jsx': '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', 'Interplex_MES_FE/src/components/utilities/BatchHoldWorkspace.css': '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', 'Interplex_MES_FE/docs/mes_agent/modules/BATCH_HOLD_AND_BATCH_TRACE.md': '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', 'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md': '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', 'Interplex_MES_FE/docs/mes_agent/changes/2026-11-11-qc-hold-workspace-v1-1.md': 'eNpNVc1u4zYQvvspBlgUTQBLir3ZtNigBTaJ02SxGzt2sgF6qWiJsolQpEJSdtxTH6JP2CfpN5TsBPDBEkXOzPfHD/R9shjT/SVdiFCs6cbqkp6se/aNKCT998+/9HhLaxsq9UqbUTqio/HJ+CwZjfA7Hgw+fKDvNqiNCMqawWDm5EbZ1tOPUdwnShJUSBOkkyXltXhNtsnpq87JK7PSMimEK6myrk7pSjlZBHK2DZK0KJ4lb65arZNGrORgiVcrrJrynGTdhB351sVnHEUbJbeNdYEK22KEpaTtWgWZ0p0lL91GOpKmbKwygeSr8gGnB0sa/wb3l8laYlOEQPohecuI2EY6Eazz3Znm54CTJBWoiokAii59GiFYFPiWjq4n2cUEH5dySMbS4v4bEEpoLhvNYOLICO/70Xky2qqwxqilcM80Tgqr29rQ9kDC0cdPP5EoGGH0doaH2C23fjwcEDnpGyypjSQfABLDYQ0ZAXS25AsnpUGjCX2TVfiMF8Jk2trntukmHh5GwvbQooaTwlszRHfeo4+SAJ+qVBFZHsYpskfDAHD9AsVbEII12gpnUJ+PYNpJtKUKKc2f6Ho+/XNyRyhubGB+nNQoI0vubK5Wa7TGaEAmt/7+8gYj/jbK45QgRAoHdS53XcfZ7C67sM7Q05TXdKebLVetgAYm0oxG/4QWK6u13TIwAqopCuk9hPV+kJTGJ3yGz7gJ7umCJWjQzmy6eKBMNCrbjLKXIlnGFpiDhLvLUeelhXg9GM5uH5gq6+j2ioQp3yAEOFJgBmBbnqOlgyihfvSD2hqyeWmBNJ72jFxdRFKw0nq8hqRoETdCJnUDPpZaUj6fPv119/j9YjLPGUPMyQNMWOY8c/7HBAN05Oaxq36mYi3MSvIAtVCGWtO9gMEgXw8v1CIrRRBUq5WL5EcZ2UJoulws8Al0H32Upy/FepscRJvzywZp0Mlqhy67sz0DYcMao9e2bLXsLXQlG4AtTcHTZ+RFJVctHOLZQY9BaRV4BbmiDCbRGnXf9fvj5OTkY4SnFqbF8o5E02jFGWL2+sUDFLS3NY8yNfjwoLecFHhAz84zrimvXDv7tzQ5Hc2fjpmKnSfsRxEMdk5hHXdEIZPhndQ2QAydQvYowOmjVgaVkbNwA4wOHj1bpadY71Ka7UWC06K3QYZsAD861cRMW65Htayt23G4QEBLVisKNtwu8swU6Pjm4WG26MaImgQ0PjgLkBwYgZ6hXs+gcCf4rGpD62QMG243TxKOhxwM4C8juOv/Q56aEzjvsNzR4ubL+NNZRHfpBJigZo2jx7A2FN3Tzeqr1IHkB+kR0GtZPMfcHYxSmoL2t6z73IVgDP1Dor8F/5DC1r7PuwY8aB/TNsY9gGvagGrjlBbAnYEU7MshxUvoYEdknlbF8z5Y8NkhU89py4C9OTf5nU5PRungY9rlN240EG66KPrMOsMhUdeOY4xExZX68Dnv84mR4DjWVpSeShmE0ujzNKUuf7pLALoqWZu7PoKBh/L7ApWz9ZtqkkPDwy5lsQWHGg7UTykhh0Dk+4RjU5ukiygYjd1wdArTiA5hjjq2K6mKrid8J8NYx+ngLKb3wQmcyW8Zvj95CUdTpcXKs+ljtJXQreMbHQIf/AI6ItLD7sYz8jVkHA8c2QxJD5owXTREQYSYOIfc6O5ODsN08GtKlywjJt7Jlesthcz5gqDv7qls5hAw8drMHhzEJZacIrt3UtSqVl0VxMy0qjTgo43QquxLW84Cmu3CGod8XaB55+P11rnc4YRKFruCo5ud4G2LMI83YmdJVJtLePgtuKG1IPs0HfZ+9RK0orV4huPv9+a+/0ICZuJsjKn+P3zXWH4='}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def disk_hash(f):
    return sha(f.read_bytes()) if f.is_file() else None

def root():
    fe=Path(__file__).resolve().parent
    if fe.name != 'Interplex_MES_FE':
        raise RuntimeError('REJECT: place updater in Interplex_MES_FE root (next to package.json).')
    project=fe.parent
    if not (project/'Interplex_MES_BE/app/api/v1/api.py').is_file():
        raise RuntimeError('REJECT: cannot find sibling Interplex_MES_BE.')
    for repo in ['Interplex_MES_FE','Interplex_MES_BE']:
        r=subprocess.run(['git','-C',str(project/repo),'rev-parse','--abbrev-ref','HEAD'],capture_output=True,text=True)
        if r.returncode != 0 or r.stdout.strip() != 'phase2':
            raise RuntimeError('REJECT: '+repo+' must be on Git phase2, actual='+r.stdout.strip())
    return project

def inspect(project):
    failures=[]; before=after=0
    for item in DEPENDENCIES:
        actual=disk_hash(project/item['path'])
        valid=actual == item['sha256']
        print('[PASS]' if valid else '[REJECT]', 'dependency',item['path'])
        if not valid: failures.append('DEPENDENCY: '+item['path']+' actual='+str(actual))
    for item in MANIFEST:
        actual=disk_hash(project/item['path'])
        if actual==item['before']:
            before+=1; print('[BEFORE]',item['path'])
        elif actual==item['after']:
            after+=1; print('[AFTER]',item['path'])
        else:
            failures.append('SOURCE: '+item['path']+' actual='+str(actual))
            print('[REJECT] source',item['path'],'actual=',actual,'expected=',item['before'])
    if before>0 and after>0:
        failures.append('MIXED_STATE: partial application detected')
    if failures:
        print('VERDICT: REJECT')
        for item in failures: print(' -',item)
        return 'REJECT'
    state='ALREADY_APPLIED' if after else 'PASS'
    print('VERDICT:', state, '—', 'no-op' if state=='ALREADY_APPLIED' else 'ready for code/docs apply')
    return state

def decode(item):
    data=zlib.decompress(base64.b64decode(PAYLOADS[item['path']]))
    if sha(data)!=item['after']: raise RuntimeError('REJECT: corrupt embedded payload '+item['path'])
    return data

def atomic_write(target,data):
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent,prefix='.mes-qc-stage-',delete=False) as handle:
        stage=Path(handle.name); handle.write(data); handle.flush(); os.fsync(handle.fileno())
    try: os.replace(stage,target)
    finally: stage.unlink(missing_ok=True)

def backup_dir():
    return Path.home()/'.ipth_mes_updater_backups'/RELEASE

def do_apply(project):
    state=inspect(project)
    if state=='ALREADY_APPLIED': return
    if state!='PASS': raise RuntimeError('REJECT: source not compatible')
    backup=backup_dir()
    if backup.exists(): raise RuntimeError('REJECT: backup already exists: '+str(backup))
    # Validate payload fully before any writes.
    data={item['path']:decode(item) for item in MANIFEST}
    previous=[]
    backup.mkdir(parents=True)
    try:
        for item in MANIFEST:
            target=project/item['path']
            original=target.read_bytes() if target.exists() else None
            previous.append((target,original))
            if original is not None:
                saved=backup/item['path'];saved.parent.mkdir(parents=True,exist_ok=True)
                saved.write_bytes(original)
                if disk_hash(saved)!=item['before']: raise RuntimeError('BACKUP FAILURE: '+item['path'])
        (backup/'manifest.json').write_text(json.dumps(MANIFEST,indent=2),encoding='utf-8')
        for item in MANIFEST:
            target=project/item['path'];atomic_write(target,data[item['path']])
            if disk_hash(target)!=item['after']: raise RuntimeError('WRITE VERIFY FAILURE: '+item['path'])
            print('[APPLIED]',item['path'])
    except BaseException:
        print('[RECOVERY] Restoring files changed during failed apply...')
        for target,original in reversed(previous):
            try:
                if original is None: target.unlink(missing_ok=True)
                else: atomic_write(target,original)
            except Exception as error: print('[CRITICAL] recovery error',target,error)
        shutil.rmtree(backup,ignore_errors=True)
        raise
    print('APPLIED: QC WORKSPACE FE/BE + DOCS ONLY. NO DATABASE/SQL CHANGES.')
    print('BACKUP:',backup)
    print('NEXT: restart Backend, npm run build in FE; confirm V0003 VERIFY PASS.')

def do_rollback(project):
    backup=backup_dir()
    if not backup.is_dir(): raise RuntimeError('REJECT: no backup at '+str(backup))
    if inspect(project)!='ALREADY_APPLIED': raise RuntimeError('REJECT: installed source has changed; rollback aborted')
    if json.loads((backup/'manifest.json').read_text())!=MANIFEST:
        raise RuntimeError('REJECT: backup manifest mismatch')
    for item in MANIFEST:
        if item['before'] is not None and disk_hash(backup/item['path'])!=item['before']:
            raise RuntimeError('REJECT: damaged backup for '+item['path'])
    for item in reversed(MANIFEST):
        target=project/item['path']
        if item['before'] is None: target.unlink(missing_ok=True)
        else: atomic_write(target,(backup/item['path']).read_bytes())
        if disk_hash(target)!=item['before']: raise RuntimeError('CRITICAL: rollback verification failed '+item['path'])
        print('[ROLLED BACK]',item['path'])
    print('ROLLED BACK: source/docs restored; no DB rows changed.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    opts=parser.add_mutually_exclusive_group(required=True)
    opts.add_argument('--scan',action='store_true')
    opts.add_argument('--apply',action='store_true')
    opts.add_argument('--rollback',action='store_true')
    args=parser.parse_args()
    try:
        r=root()
        if args.scan:
            status=inspect(r)
            if status=='REJECT': sys.exit(2)
        elif args.apply: do_apply(r)
        else: do_rollback(r)
    except Exception as e:
        print(type(e).__name__+':',e,file=sys.stderr)
        sys.exit(2)
