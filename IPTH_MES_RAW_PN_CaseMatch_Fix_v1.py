#!/usr/bin/env python3
"""IPTH MES: RAW Material PN case-insensitive recognition hotfix v1.

Run from Interplex_MES_BE, keep script in sibling Interplex_MES_FE:
  python ../Interplex_MES_FE/IPTH_MES_RAW_PN_CaseMatch_Fix_v1.py --scan
  python ../Interplex_MES_FE/IPTH_MES_RAW_PN_CaseMatch_Fix_v1.py --apply
  python ../Interplex_MES_FE/IPTH_MES_RAW_PN_CaseMatch_Fix_v1.py --verify

Strict source-version pinned; no SQL, no DB access, no JSON changes. Unknown
source refuses --apply, collect current files for rebase. All files backed up.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile

FE='Interplex_MES_FE'
BE='Interplex_MES_BE'
PRE = {
    'FrameAssyPackingMaster.jsx': {
       'd98295e184d1dbf77e664028ee7a1638255ee61c9bbcc159450517d26db80501',
       'c156fa8354c083d51ea827cd725ec11f48278737728c3d0202927fc7fc3b7791',
    },
    'FrameMachiningProc.jsx': {
       '963659b74063cb3f902125848c47e87d41162b3542d97451fe98b843febffb40',
    },
    'FramePackingProc.jsx': {
       '17b266caa2494e22b18b2df56a6dfb16ca546d26fc6db03012c55754e149e402',
       'de6ac980ebe4aa135e69931b221d6d8b3d7a0f6d2fbc01cb19f4dfdd475da20a',
       '49b91a7b57804f7cd7e70fd68ef0cf3f21478f406af6bcdc4c51f21ab5ec7d40',
       '5eb98ee673847ef5af4c0f79d6a6310a0781e1e63d296315ccb039a539019f88',
    },
}
# Hashes of exact transformation output for each known baseline variant,
# generated/validated on collector + QuantityMode/ConfigFix snapshots.
POST = {
    'FrameAssyPackingMaster.jsx': {
       '9fa7c5b3e9e024cc30ece887ba65263a0c21c332222a043c9c19daaa8a8e7fec',
       'a491b8545bc3cc212a0569aa686f6cf69ef6d6e1cd58fdab94406b4dd2219e79',
    },
    'FrameMachiningProc.jsx': {
       '1ca2590b33ffdf54dfae22abe6382d55b1638d8419cccc52e599438f497d4a8b',
    },
    'FramePackingProc.jsx': {
       '5ac3c7ca6d94c0e371ab9ed75e5085193f6e15669ba8ea4bc77106f1973d4c11',
       '3b4ea86eb6714e222669e6549e963738a703b2584f78860a897ed3271173e8d4',
       '77293d36cbd3d4485b18d11670db7d1251cbd8691f8834dc5275f482c888c634',
       'cb960eac4a224dd7df10dbd2edf725442e693b42388bdb4de870995dac08ace9',
    },
}
S = 'src/components/production/'
NORMALIZER = "// IPTH_RAW_PN_CASE_V1: Part Number identity only (do not mutate scanned barcode/serial).\nconst normalizeMesPn = value => String(value ?? '').trim().toUpperCase();\n\n"


def sha(b: bytes)->str:
    return hashlib.sha256(b).hexdigest()


def one(s: str, old: str, new: str, label: str)->str:
    count=s.count(old)
    if count!=1:
        raise ValueError(f'{label}: expected one exact code anchor, found {count}')
    return s.replace(old,new,1)


def patch(name: str, raw: bytes)->bytes:
    s=raw.decode('utf-8')
    s=one(s,f'const {name[:-4]} = () => {{',
          NORMALIZER+f'const {name[:-4]} = () => {{',name+':helper')
    if name == 'FrameAssyPackingMaster.jsx':
        s=one(s,
          "const groupedRaw = masterData.rawMaterials.reduce((acc, item) => {\n            acc[item.pn] = (acc[item.pn] || 0) + (Number(item.qty) || 0);",
          "const groupedRaw = masterData.rawMaterials.reduce((acc, item) => {\n            const rawPnKey = normalizeMesPn(item.pn);\n            acc[rawPnKey] = (acc[rawPnKey] || 0) + (Number(item.qty) || 0);",
          name+':groupedRaw')
        s=one(s,'pcsRawPNs.map(pn => groupedRaw[pn] || 0)',
              'pcsRawPNs.map(pn => groupedRaw[normalizeMesPn(pn)] || 0)',name+':pcsQty')
        s=one(s,'requiredRawPNs.some(pn => !(groupedRaw[pn] > 0))',
              'requiredRawPNs.some(pn => !(groupedRaw[normalizeMesPn(pn)] > 0))',name+':presence')
        s=one(s,'const matchedItems = scannedItems.filter(item => item.pn === rule.partNumber);',
              'const matchedItems = scannedItems.filter(item => normalizeMesPn(item.pn) === normalizeMesPn(rule.partNumber));',
              name+':checklist')
    elif name == 'FrameMachiningProc.jsx':
        s=one(s,'const missingRawPNs = requiredRawPNs.filter(pn => !scannedRawPNs.includes(pn));',
              'const missingRawPNs = requiredRawPNs.filter(pn => !scannedRawPNs.some(rawPn => normalizeMesPn(rawPn) === normalizeMesPn(pn)));',
              name+':rawPresence')
        s=one(s,'const matchedItems = scannedItems.filter(item => item.pn === rule.partNumber);',
              'const matchedItems = scannedItems.filter(item => normalizeMesPn(item.pn) === normalizeMesPn(rule.partNumber));',
              name+':checklist')
    elif name == 'FramePackingProc.jsx':
        s=one(s,'const missingRaw = requiredRawPNs.filter(pn => !scannedRawPNs.includes(pn));',
              'const missingRaw = requiredRawPNs.filter(pn => !scannedRawPNs.some(rawPn => normalizeMesPn(rawPn) === normalizeMesPn(pn)));',
              name+':aliasRawPresence')
    return s.encode('utf-8')


def locate():
    be=Path.cwd().resolve()
    if be.name != BE:
        raise RuntimeError('REJECT: terminal CWD must be '+BE+'; current is '+str(be))
    fe=be.parent/FE
    if not fe.is_dir() or Path(__file__).resolve().parent != fe.resolve():
        raise RuntimeError('REJECT: place updater in frontend root '+str(fe))
    return fe


def inspect(fe):
    out={}
    for name in PRE:
        path=fe/S/name
        if not path.is_file():
            out[name]=('MISSING',None,None);continue
        raw=path.read_bytes();digest=sha(raw)
        if digest in PRE[name]:
            try: updated=patch(name,raw)
            except Exception as exc:
                out[name]=('ANCHOR_MISMATCH',digest,str(exc));continue
            out[name]=('PATCH_NEEDED',digest,updated)
        elif digest in POST[name]:
            out[name]=('ALREADY_APPLIED',digest,None)
        else:
            out[name]=('UNEXPECTED',digest,None)
    return out


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    mode=ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--scan',action='store_true')
    mode.add_argument('--apply',action='store_true')
    mode.add_argument('--verify',action='store_true')
    args=ap.parse_args()
    try:
        fe=locate();state=inspect(fe)
        print('[IPTH RAW PN CASE FIX v1] root=',fe)
        for name,(kind,digest,_) in state.items():
            print(f'[{kind}] {S+name} | SHA256={digest or "missing"}')
        if any(kind in {'MISSING','UNEXPECTED','ANCHOR_MISMATCH'} for kind,_,_ in state.values()):
            print('REJECT: Unknown source. Collect current files; do not patch blindly.')
            return 3
        if args.scan:
            print('SCAN PASS: source supported, no writes.')
            return 0
        if args.verify:
            ok=all(kind=='ALREADY_APPLIED' for kind,_,_ in state.values())
            print('VERIFY PASS' if ok else 'VERIFY FAIL: some files remain unpatched')
            return 0 if ok else 4
        if all(kind=='ALREADY_APPLIED' for kind,_,_ in state.values()):
            print('ALREADY APPLIED: no writes.');return 0
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup=fe/f'.ipth_rawpn_casefix_backup_{stamp}'
        backup.mkdir(parents=False,exist_ok=False)
        manifest=[]; changed=[]
        try:
            for name,(kind,digest,new) in state.items():
                src=fe/S/name
                dst=backup/S/name
                dst.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(src,dst)
                if sha(dst.read_bytes())!=digest:
                    raise RuntimeError('Source changed during backup: '+name)
                manifest.append({'file':S+name,'before':digest,'after':sha(new) if new else digest})
            (backup/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
            for name,(kind,digest,new) in state.items():
                if kind!='PATCH_NEEDED':continue
                src=fe/S/name
                if sha(src.read_bytes())!=digest:raise RuntimeError('Concurrent modification: '+name)
                fd,tmp=tempfile.mkstemp(prefix=f'.{name}.',dir=src.parent)
                try:
                    os.fchmod(fd, stat.S_IMODE(src.stat().st_mode))
                    with os.fdopen(fd,'wb') as o:
                        o.write(new);o.flush();os.fsync(o.fileno())
                    os.replace(tmp,src)
                    changed.append(name)
                finally:
                    if os.path.exists(tmp):os.unlink(tmp)
            if not all(inspect(fe)[n][0]=='ALREADY_APPLIED' for n in PRE):
                raise RuntimeError('Post-apply verification failed')
        except Exception:
            for name in reversed(changed):
                shutil.copy2(backup/S/name,fe/S/name)
            raise
        print('APPLY PASS; backup:',backup)
        print('NEXT: --verify, rebuild FE, reload job 1003341332. No DB migration.')
        return 0
    except Exception as exc:
        print('[ERROR]',exc,file=sys.stderr)
        return 2

if __name__=='__main__':
    sys.exit(main())
