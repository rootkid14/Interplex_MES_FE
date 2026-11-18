#!/usr/bin/env python3
"""MES2 RAW Supplier UOM Alias Hotfix v1 — source-first, strict-hash, no SQL.

Place in Interplex_MES_FE, run from Interplex_MES_BE as --scan, --self-test,
--apply, --verify, --rollback. One-file self-contained updater.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone

BE_REL = "Interplex_MES_BE/app/services/raw_material_service.py"
FE_REL = "Interplex_MES_FE/src/hooks/useRawMaterialFlow.jsx"
DOC_REL = "Interplex_MES_FE/docs/mes_agent/changes/2026-11-18-raw-uom-plural-alias.md"
BE_SHA = {'863e789c43c3ceae8f2274419c95d7db71b11ef319260ef963ce97216614af65': '3920893abb9b0caba297ee55e746986967f8812c5ffa5270290086098ad9bac8', '31eab28bafed822404d8d33096246536c6643d84b07774f330f299adb3e118e5': 'c6549604fe6c53a2565169f8afc73417bc8d76d8c31f9d9ab4df53aebc00606f'}
FE_BEFORE_SHA = "40efe48d3d853de34b7edf046b087b97cf408b54e59cce6cb20c6cdbd8f2a438"
FE_AFTER_SHA = "98caf17256bb7ddfb054a6ac69bd60cdffdea1284fd56ddf25332ba264087e87"
DOC_TEXT = '# MES2 RAW — UOM supplier plural alias hotfix (2026-11-18)\n\n## Problem / Bug\n\nBOM / Model Config `expected_uom` contains singular `PC`, `KG`, ... while\nsupplier barcode `PN;QTY;UOM;SerialNumber` may contain `PCS`, `KGS`.\nBoth `useRawMaterialFlow.jsx` and `raw_material_service.py` previously rejected\nthese barcodes via strict equality. This caused valid RAW labels to fail scan.\n\n## Locked behavior\n\n- The **BOM** remains authoritative. Accept the QR UOM only when it equals\n  `expected_uom`, or equals exactly `expected_uom + "S"` (only if the BOM unit\n  does not already end in `S`). Strip outer whitespace; compare uppercase.\n- Do NOT use a raw prefix comparison (`startswith`, `slice` alone). Invalid\n  `KGX`, `KGSX`, `PCS123` must remain rejected.\n- New RAW lots persist `RawMaterialLots.UOMCode` as the canonical BOM UOM.\n  `RawMaterialLots.RawBarcode` preserves original supplier QR unchanged.\n  Existing rows with `PCS`/`KGS` remain readable and are accepted for identity\n  comparison with `PC`/`KG` in the same PN + serial + quantity context.\n- Normalization applies to **both** `/validation/logRawMaterial` and\n  `/validation/transferRawMaterial` via shared service validation.\n- No qty conversion, rounding, PN relaxation, or scan rule save changes.\n- `modelconfigs.py` continues to verify that persisted `expected_uom` equals\n  `IPTH_BOM_LIST.Unit` exactly. No database migrations.\n- Frontend retains the original RAW string when sending to Backend; Backend\n  validates independently and treats original QR as traceability source.\n\n## Examples\n\n| BOM UOM | Barcode UOM | Result | Canonical stored UOM |\n| --- | --- | --- | --- |\n| PC | PC | ACCEPT | PC |\n| PC | PCS | ACCEPT | PC |\n| KG | KG | ACCEPT | KG |\n| KG | KGS | ACCEPT | KG |\n| PC | KG | REJECT | — |\n| KG | KGSX | REJECT | — |\n| PC | PCS123 | REJECT | — |\n\n## Files changed\n\n- BE `app/services/raw_material_service.py` — canonical unit helper,\n  validation of unit, normalization at register/transfer, historical lot\n  unit alias match, preserve original barcode.\n- FE `src/hooks/useRawMaterialFlow.jsx` — align scan prevalidation.\n\n## Apply / testing\n\nRun from `Interplex_MES_BE`:\n\n```bash\npython ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --scan\npython ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --self-test\npython ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --apply\npython ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --verify\n```\n\nRestart Backend; rebuild/restart FE (`npm run build`). Test both new RAW\nand the *same existing serial* with variant singular/plural QR. Expect an\nalready-logged/remainder response as normal (not a UOM conflict); no quantity\nmust be allocated twice. Run tests only with controlled Dev records.\n\n## Compatibility\n\nUpdater only accepts the exact verified snapshot of FE RAW hook and either:\n1. BE RAW service from 2026-11-16 source audit before disk-based patch; or\n2. BE RAW service after Disk-Based Compatibility updater.\nAny unexpected source SHA256, or pre-existing output doc, is REJECTED to avoid\nclobbering recent user edits. Code only; no database or business-data writes.\nBackup is outside repositories; rollback only restores code/docs and does not\nundo any RAW lots written while new code was running.\n'
DOC_SHA = "5f477272aa82f1eabd96d81fac77a3fdf0af3b38ccafe447f2413d5331d64128"
BACKUP_NAME = "IPTH_MES2_RAW_UOM_PluralAlias_v1_20261118"


def sha(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def fail(msg: str):
    raise RuntimeError(msg)


def replace_exact(text: str, before: str, after: str, label: str) -> str:
    count = text.count(before)
    if count != 1:
        fail(f"{label}: expected one anchor, found {count}")
    return text.replace(before, after, 1)


def patch_backend(text: str) -> str:
    text = replace_exact(text, 'from dataclasses import dataclass\n',
        'from dataclasses import dataclass, replace\n', 'BE dataclass import')
    anchor = '''@dataclass(frozen=True)
class RawBarcode:
    raw: str
    pn: str
    quantity: Decimal
    unit: str
    serial: str


'''
    helper = '''def _canonical_raw_uom(scanned: str, expected: str) -> Optional[str]:
    """Return BOM UOM if QR unit is identical or has one plural 'S' suffix.

    Do not accept arbitrary prefixes (PCX, KGSX), change quantity, or
    assume a scale conversion. The original QR remains in RawBarcode.raw.
    """
    actual = str(scanned or "").strip().upper()
    bom = str(expected or "").strip().upper()
    if not bom:
        return None
    if actual == bom or (not bom.endswith("S") and actual == bom + "S"):
        return bom
    return None


'''
    text = replace_exact(text, anchor, anchor + helper, 'BE UOM helper')
    text = replace_exact(text, 'def _context(db: Session, requested_wo: int, barcode: RawBarcode) -> int:',
        'def _context(db: Session, requested_wo: int, barcode: RawBarcode) -> tuple[int, str]:', 'BE context type')
    text = replace_exact(text, '''    if barcode.unit != expected:
        raise RawMaterialError("RAW_UOM_MISMATCH", f"Sai đơn vị cho {barcode.pn}: BOM Config={expected}, barcode={barcode.unit}.")
    return canonical
''', '''    if _canonical_raw_uom(barcode.unit, expected) is None:
        raise RawMaterialError("RAW_UOM_MISMATCH", f"Sai đơn vị cho {barcode.pn}: BOM Config={expected}, barcode={barcode.unit} (chỉ nhận đúng UOM hoặc thêm S).")
    return canonical, expected
''', 'BE UOM validation')
    text = replace_exact(text, 'or str(lot["UOMCode"]).strip().upper() != barcode.unit',
        'or _canonical_raw_uom(str(lot["UOMCode"]), barcode.unit) != barcode.unit', 'BE historical lot identity')
    before = '''    barcode = parse_raw_barcode(scanned)
    canonical = _context(db, requested_wo, barcode)
    _lock_lot(db, barcode)
'''
    after = '''    barcode = parse_raw_barcode(scanned)
    canonical, expected_uom = _context(db, requested_wo, barcode)
    # Keep RawBarcode.raw unchanged for traceability; persist BOM-canonical UOM.
    barcode = replace(barcode, unit=expected_uom)
    _lock_lot(db, barcode)
'''
    if text.count(before) != 2:
        fail(f"BE register/transfer anchors expected twice, found {text.count(before)}")
    text = text.replace(before, after)
    ast.parse(text, filename=BE_REL)
    return text


def patch_frontend(text: str) -> str:
    return replace_exact(text, "      if (label.uom !== expected) throw new Error(`UOM sai: yêu cầu ${expected}, đã quét ${label.uom}.`);", '''      // Accept the BOM UOM or a single plural 'S' suffix (PC/PCS, KG/KGS).
      // Never use startsWith: it would wrongly accept PCX or KGSX.
      const uomMatches = label.uom === expected || (!expected.endsWith('S') && label.uom === `${expected}S`);
      if (!uomMatches) throw new Error(`UOM sai: yêu cầu ${expected} (hoặc ${expected}S), đã quét ${label.uom}.`);''', 'FE UOM validation')


def project_roots():
    be = Path.cwd().resolve()
    if be.name != 'Interplex_MES_BE':
        fail('CWD phải là Interplex_MES_BE (chạy từ Ubuntu Backend terminal).')
    root = be.parent
    if not (root / 'Interplex_MES_FE').is_dir():
        fail('Không tìm thấy sibling Interplex_MES_FE.')
    return root


def collect(root):
    be_path = root / BE_REL
    fe_path = root / FE_REL
    doc_path = root / DOC_REL
    for p in (be_path, fe_path):
        if not p.is_file():
            fail(f'REJECT missing {p}')
    b_content = be_path.read_bytes()
    f_content = fe_path.read_bytes()
    b_sha = sha(b_content)
    f_sha = sha(f_content)
    bs = {before: 'BEFORE' for before in BE_SHA}
    bs.update({after: 'AFTER' for after in BE_SHA.values()})
    fs = {FE_BEFORE_SHA:'BEFORE', FE_AFTER_SHA:'AFTER'}
    print(f'[BE] {BE_REL} SHA256={b_sha} state={bs.get(b_sha,"UNKNOWN")}')
    print(f'[FE] {FE_REL} SHA256={f_sha} state={fs.get(f_sha,"UNKNOWN")}')
    if b_sha not in bs or f_sha not in fs:
        fail('REJECT: source khác snapshot đã kiểm tra, không ghi đè. Cần collector mới.')
    if bs[b_sha] != fs[f_sha]:
        fail('REJECT: BE/FE đang ở hai trạng thái khác nhau; không auto patch partial.')
    state = bs[b_sha]
    if state == 'BEFORE':
        expected_be_after = BE_SHA[b_sha]
        patched_be = patch_backend(b_content.decode('utf-8')).encode('utf-8')
        patched_fe = patch_frontend(f_content.decode('utf-8')).encode('utf-8')
        if sha(patched_be) != expected_be_after or sha(patched_fe) != FE_AFTER_SHA:
            fail('REJECT: generated patch SHA256 mismatch')
        if doc_path.exists():
            fail('REJECT: output documentation already exists. No overwrite.')
    else:
        patched_be = b_content
        patched_fe = f_content
        if not doc_path.is_file() or sha(doc_path.read_bytes()) != DOC_SHA:
            fail('REJECT: patched code present but documentation missing/changed.')
    return state, {BE_REL:(b_content,patched_be),FE_REL:(f_content,patched_fe)}, doc_path


def self_test():
    import typing
    cases = [
        ('PC','PC','PC'), ('PCS','PC','PC'), ('KG','KG','KG'),
        ('KGS','KG','KG'), (' kgS ',' kg ','KG'),
        ('PCX','PC',None), ('KGSX','KG',None), ('PCS123','PC',None),
        ('KG','PC',None), ('PC','KG',None), ('PCSS','PCS',None),
        ('PCS','PCS','PCS'), ('','PC',None), ('PCS','',None),
        (' pc ','PC','PC'), ('KS','KG',None),
    ]
    # Extract and run the EXACT helper source used by patch_backend(), not
    # a separately rewritten copy of the normalization algorithm.
    source_ast = ast.parse(Path(__file__).read_text(encoding='utf-8'))
    patch_fn = next(node for node in source_ast.body if
                    isinstance(node, ast.FunctionDef) and node.name == 'patch_backend')
    helper_assign = next(node for node in patch_fn.body if
                         isinstance(node, ast.Assign) and any(
                             isinstance(t, ast.Name) and t.id == 'helper'
                             for t in node.targets))
    helper_text = ast.literal_eval(helper_assign.value)
    env = {'Optional': typing.Optional}
    exec(compile(helper_text, '<actual-patch-uom-helper>', 'exec'), env)
    normalize = env['_canonical_raw_uom']
    for scanned, expected, want in cases:
        got = normalize(scanned, expected)
        if got != want:
            fail(f'UOM test {scanned!r}, BOM={expected!r}: expected {want!r}, got {got!r}')
    print(f'[PASS] Actual generated UOM helper passed {len(cases)} cases.')
    print('[PASS] No database connection or business-data writes in self-test.')


def atomic_write(path: Path, content: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    original_mode = (path.stat().st_mode & 0o777) if path.exists() else 0o644
    fd, tmp = tempfile.mkstemp(prefix=f'.{path.name}.patch_',dir=str(path.parent))
    try:
        with os.fdopen(fd,'wb') as fp:
            fp.write(content)
            fp.flush()
            os.fsync(fp.fileno())
        os.chmod(tmp,original_mode)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def apply(root, current, payloads, doc_path):
    if current=='AFTER':
        print('ALREADY APPLIED — no changes.')
        return
    backup = Path.home() / '.ipth_mes_updater_backups' / BACKUP_NAME
    if backup.exists():
        manifest_path=backup/'manifest.json'
        if not manifest_path.is_file():
            fail(f'REJECT: backup exists without manifest: {backup}')
        old_manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
        if not old_manifest.get('rolled_back'):
            fail(f'REJECT: previous apply backup exists: {backup}')
        for rel,(original,_) in payloads.items():
            item=old_manifest.get('files',{}).get(rel, {})
            saved=backup/rel
            if not saved.is_file() or sha(saved.read_bytes()) != sha(original) or item.get('before_sha') != sha(original):
                fail(f'REJECT: previous rollback backup differs: {rel}')
        if doc_path.exists():
            fail('REJECT: doc exists following rollback')
        print('[INFO] Verified previous rollback, reusing intact original backup.')
    else:
        backup.mkdir(parents=True)
    manifest={'name':BACKUP_NAME,'timestamp':datetime.now(timezone.utc).isoformat(), 'files':{}}
    changed=[]
    try:
        for rel,(original,patched) in payloads.items():
            dest = backup / rel
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(original)
            manifest['files'][rel]={'before_sha':sha(original),'after_sha':sha(patched),'existed_before':True}
        manifest['files'][DOC_REL]={'before_sha':None,'after_sha':DOC_SHA,'existed_before':False}
        (backup / 'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        for rel,(original,patched) in payloads.items():
            p=root/rel
            if sha(p.read_bytes()) != sha(original):
                fail(f'Concurrent file modification: {p}')
            atomic_write(p,patched)
            changed.append((p,original))
            print(f'[APPLIED] {rel}')
        if doc_path.exists():
            fail('Documentation appeared concurrently: REJECT')
        atomic_write(doc_path,DOC_TEXT.encode('utf-8'))
        changed.append((doc_path,None))
        print(f'[APPLIED] {DOC_REL}')
        for rel,(_,p) in payloads.items():
            if sha((root/rel).read_bytes()) != sha(p):fail(f'post-write hash mismatch: {rel}')
        if sha(doc_path.read_bytes())!=DOC_SHA:fail('post-write doc hash mismatch')
        print(f'APPLIED code/docs only; backup: {backup}')
        print('Restart Backend; rebuild/restart Frontend. No SQL needed.')
    except Exception:
        for p,original in reversed(changed):
            if original is None:
                p.unlink(missing_ok=True)
            else:
                atomic_write(p,original)
        print('[ROLLBACK] partial apply recovered')
        raise


def rollback(root):
    backup = Path.home()/'.ipth_mes_updater_backups'/BACKUP_NAME
    mpath=backup/'manifest.json'
    if not mpath.is_file():fail('REJECT: backup manifest not found.')
    manifest=json.loads(mpath.read_text(encoding='utf-8'))
    for rel,meta in manifest['files'].items():
        p=root/rel
        if not p.is_file() or sha(p.read_bytes())!=meta['after_sha']:
            fail(f'REJECT: current file has changed since apply: {rel}')
    originals = {}
    for rel,meta in manifest['files'].items():
        if meta['existed_before']:
            original=(backup/rel).read_bytes()
            if sha(original)!=meta['before_sha']:
                fail(f'REJECT backup integrity {rel}')
            originals[rel] = original
    # Validate every backup before restoring any file.
    for rel,meta in manifest['files'].items():
        p=root/rel
        if not meta['existed_before']:
            p.unlink()
            continue
        atomic_write(p,originals[rel])
        print(f'[RESTORED] {rel}')
    manifest['rolled_back']=True
    (backup/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('ROLLED BACK source/docs only. Business-data changes made by running MES remain.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    op=parser.add_mutually_exclusive_group(required=True)
    for a in ('--scan','--apply','--verify','--rollback','--self-test'):
        op.add_argument(a,action='store_true')
    args=parser.parse_args()
    try:
        if args.self_test:
            self_test()
            return 0
        root=project_roots()
        if args.rollback:
            rollback(root)
            return 0
        state,payloads,doc=collect(root)
        if args.verify and state!='AFTER':
            fail('REJECT VERIFY: source is not patched.')
        if args.scan:
            print(f'VERDICT: PASS — {state}, '+('ready to APPLY' if state=='BEFORE' else 'already patched'))
        if args.verify:
            print('VERDICT: PASS — BE/FE and documentation hashes verified')
        if args.apply:
            apply(root,state,payloads,doc)
        return 0
    except Exception as exc:
        print('VERDICT: REJECT — '+str(exc), file=sys.stderr)
        return 2


if __name__=='__main__':
    raise SystemExit(main())
