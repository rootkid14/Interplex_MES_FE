#!/usr/bin/env python3
"""MES2 RW QC HOLD intake exception, v1 — strict hash, source-first.

Place in Interplex_MES_FE; run from Interplex_MES_BE.
Modes: --scan, --self-test, --apply, --verify, --rollback.
No database access or business-data writes.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SERVICE_REL = 'Interplex_MES_BE/app/services/rework_service.py'
ROUTER_REL = 'Interplex_MES_BE/app/api/v1/endpoints/rework.py'
DOC_REL = 'Interplex_MES_FE/docs/mes_agent/changes/2026-11-18-rw-qc-hold-input-exception.md'
MODULE_REL = 'Interplex_MES_FE/docs/mes_agent/modules/RW_QC_HOLD_EXCEPTION.md'
BACKUP_NAME = 'IPTH_MES2_RW_QCHold_Input_v1_20261118'
SERVICE_HASHES = {'legacy': {'before': 'a9e5394643e4fb1f75b867fde470bff35b48fd71ca0d5c890b2a3b7a5878762b', 'after': '5ea75b00d71b8d5bc1aedbb23a83b1348aecfa72266ea0d889b858a8e67c6d72'}, 'diskbased': {'before': '7e8867939dac3195a8e0e3d9c11868d57e173b965d7edd79028665412e74e6a6', 'after': 'e07d8a94a7591c9c66f1d7e6593f7e09a214e1d13d547492ea25dc0feb1aa908'}}
ROUTER_HASHES = {'before': '9f6fc839fddcda090659d15703011f32ccab0d227b1b58685b7b3dae9035df21', 'after': 'e1bc45c2ebfc5d1fb5d0a8b3a568cdfcaf9b1d146dd5aab658113a8cc091842b'}
DOCS = {'Interplex_MES_FE/docs/mes_agent/changes/2026-11-18-rw-qc-hold-input-exception.md': '# MES2 RW / QC HOLD — Allow QC-held whole batches as Rework inputs\n\nRelease: 2026-11-18 · Backend hotfix v1 · Code/docs only · No SQL migration\n\n## Root cause\n\nUtilities V1 introduced the reversible `Batches_Master.IsQCHeld` flag and\nupdated `require_active_batch()` in `app/services/rework_service.py` to\nreject held batches. This helper is shared by Production/Allocation and\n`POST /rework/add-input`, causing the Rework intake to reject the very\nQC-held defective batches that should be repaired.\n\n## Intended behavior\n\n| Original batch state | Normal production / allocation | RW add-input |\n| --- | --- | --- |\n| ACTIVE, not held | ALLOW (subject to other rules) | ALLOW (subject to other rules) |\n| QC HOLD, not RW frozen | REJECT | **ALLOW** (subject to other rules) |\n| RW FROZEN | REJECT | REJECT |\n| QC HOLD + RW FROZEN | REJECT | REJECT |\n\nAll other RW validations remain intact: ONE_TO_ONE input must belong to WO;\nBULK can accept batches from other WOs; zero/invalid quantity rejected;\nany recorded consumption rejected; duplicate input/freeze rejected; RW must\nbe ACTIVE; same transaction freezes the **entire input Batch** and registers\n`MES_ReworkInputs`.\n\n## Implementation\n\n- `app/services/rework_service.py`: introduce a dedicated\n  `require_rework_input_batch()` that acquires the same `UPDLOCK,HOLDLOCK`\n  Batch lock as existing consumer paths, rejects `IsFrozen`, but does **not**\n  reject `IsQCHeld`. Keep `require_active_batch()` unchanged for Production,\n  Allocation and any other normal consumption paths.\n- `app/api/v1/endpoints/rework.py`: use this dedicated helper **only**\n  inside `/rework/add-input`.\n\nThe transition to RW does **not** clear `IsQCHeld` or edit QC audit records.\nAfter intake, the original batch may have both `IsQCHeld=1` and\n`IsFrozen=1`. Frozen remains permanent and QC Unhold cannot reactivate it.\nThe QC currently-held inventory may continue to show the old batch (marked\nRW FROZEN); a future UX policy can explicitly archive such entries, with\nproper audit, but this narrow hotfix does not silently erase QC decisions.\n\n## Safety and compatibility\n\n- This updater only changes the two BE Python files and these docs.\n- No DB connection or modifications during `--scan`, `--apply`, `--verify`,\n  `--self-test` or `--rollback`.\n- Exact SHA256 baselines for the inspected Utilities V1 service and the\n  post-DiskBased Compatibility service, plus Phase B RW endpoint.\n- Any unknown or partially patched source is REJECTED.\n- Backup stored outside FE/BE git repos. Rollback code does not undo any\n  real RW intake already committed through the API.\n\n## Manual Dev acceptance (use expendable test data)\n\n1. On a valid unconsumed Batch in a ONE_TO_ONE WO, apply QC HOLD.\n2. Call `/rework/open` then `/rework/add-input`: expect success; verify\n   the original Batch has `IsFrozen=1` **and** still has `IsQCHeld=1`.\n3. Scan the same old Batch into normal production: expect reject.\n4. Try `/rework/add-input` a second time: expect `BATCH_FROZEN`.\n5. Confirm QC Hold still rejects the batch in normal Production/Allocation.\n6. Confirm a normal ACTIVE batch can enter Rework under unchanged rules.\n7. Confirm a Batch with any history in `Batches_Consumption_Log` is still\n   rejected (`RW_INPUT_ALREADY_CONSUMED`).\n8. Confirm ONE_TO_ONE wrong-WO rejection and BULK cross-WO intake.\n9. Restart Backend after APPLY; Frontend does not need a rebuild.\n\n## Run from the Backend directory\n\n```bash\ncd ~/IPTH_Traceability/Interplex_MES_BE\npython ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --scan\npython ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --self-test\npython ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --apply\npython ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --verify\n```\n', 'Interplex_MES_FE/docs/mes_agent/modules/RW_QC_HOLD_EXCEPTION.md': '# RW Input Acceptance vs QC Hold — module contract\n\nComponent owner: `app/services/rework_service.py` and\n`app/api/v1/endpoints/rework.py`.\n\n## Two distinct guards\n\n**Normal consumption** (`require_active_batch`) rejects QC HOLD and RW FROZEN;\nused by Production and Allocation. **Rework intake**\n(`require_rework_input_batch`) only rejects RW FROZEN at this guard.\nRework endpoint then enforces WO, positive input QTY, no consumption history,\ntransactional whole-batch freeze + registry insertion. The same locked row\nprotocol serializes intake against legacy consumers.\n\nDo not modify shared `require_active_batch` to accept held batches globally:\nthat would silently permit held material into normal production.\n\n## State invariants\n\n- QC HOLD is reversible; RW FROZEN is permanent.\n- Once RW intake commits, the old Batch must no longer be usable.\n- QC flag may remain set on a frozen Batch for audit and reporting; it does\n  not grant permission to unfreeze.\n- Reworked Output Batches are **new** Batch IDs and begin independently.\n- Backend errors are transactional: a failed RW input does not freeze Batch.\n\nNo SQL migration or FE runtime change is part of this hotfix.\n'}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def reject(message: str):
    raise RuntimeError('REJECT: ' + message)


def patch_service(source: str) -> str:
    anchor = 'def require_active_batch(db, barcode):\n    """Lock batch row before another transaction can freeze it."""\n'
    helper = 'def require_rework_input_batch(db, barcode):\n    """Lock a whole-batch Rework input without rejecting QC HOLD.\n\n    QC HOLD is a *reason* to send a Batch for repair. RW FROZEN remains\n    permanent and is always rejected. Production/Allocation must continue\n    to use require_active_batch(), which still rejects QC HOLD.\n    """\n    batch = batch_by_code(db, barcode, lock=True)\n    if batch and bool(batch[\'IsFrozen\']):\n        raise ReworkError(\'BATCH_FROZEN\', f\'Batch {barcode} đã FROZEN vĩnh viễn.\')\n    return batch\n\n\n'
    if source.count(anchor) != 1:
        reject('service anchor unexpected; no attempt to modify unrelated code')
    patched = source.replace(anchor, helper + anchor, 1)
    ast.parse(patched, filename=SERVICE_REL)
    return patched


def patch_router(source: str) -> str:
    old_import = 'require_active_rw, require_active_batch, rw_balances, response_error,'
    new_import = 'require_active_rw, require_rework_input_batch, rw_balances, response_error,'
    old_call = 'batch = require_active_batch(db, barcode)'
    new_call = 'batch = require_rework_input_batch(db, barcode)'
    if source.count(old_import) != 1 or source.count(old_call) != 1:
        reject('Rework endpoint anchors unexpected')
    patched = source.replace(old_import, new_import, 1).replace(old_call, new_call, 1)
    ast.parse(patched, filename=ROUTER_REL)
    return patched


def roots():
    be = Path.cwd().resolve()
    if be.name != 'Interplex_MES_BE':
        reject('CWD must be Interplex_MES_BE (run from Backend terminal)')
    root = be.parent
    if not (root / 'Interplex_MES_FE').is_dir():
        reject('sibling Interplex_MES_FE not found')
    if not (root / SERVICE_REL).is_file() or not (root / ROUTER_REL).is_file():
        reject('required Backend files missing')
    return root


def inspect(root: Path):
    paths = (SERVICE_REL, ROUTER_REL)
    old = {n:(root/n).read_bytes() for n in paths}
    states = {}
    svc_sha = digest(old[SERVICE_REL]); ep_sha = digest(old[ROUTER_REL])
    for version, hashes in SERVICE_HASHES.items():
        if svc_sha == hashes['before']:
            states[SERVICE_REL] = 'BEFORE'; source_version = version
            break
        if svc_sha == hashes['after']:
            states[SERVICE_REL] = 'AFTER'; source_version = version
            break
    else:
        reject('rework_service.py unknown SHA256='+svc_sha+'. Collect current source instead of force-patching.')
    if ep_sha == ROUTER_HASHES['before']:
        states[ROUTER_REL] = 'BEFORE'
    elif ep_sha == ROUTER_HASHES['after']:
        states[ROUTER_REL] = 'AFTER'
    else:
        reject('rework.py unknown SHA256='+ep_sha+'. Collect current source instead of force-patching.')
    if len(set(states.values())) != 1:
        reject('partial/mixed code state: both Backend files must be BEFORE or AFTER')
    state = states[SERVICE_REL]
    result={}
    if state == 'BEFORE':
        s = patch_service(old[SERVICE_REL].decode('utf-8')).encode('utf-8')
        e = patch_router(old[ROUTER_REL].decode('utf-8')).encode('utf-8')
        if digest(s) != SERVICE_HASHES[source_version]['after'] or digest(e) != ROUTER_HASHES['after']:
            reject('generated patch hash mismatch')
        result={SERVICE_REL:s, ROUTER_REL:e}
        for doc in DOCS:
            if (root/doc).exists():
                reject(f'refusing to overwrite existing documentation {doc}')
    else:
        result=dict(old)
        for doc,content in DOCS.items():
            target = root/doc
            if not target.is_file() or digest(target.read_bytes()) != digest(content.encode('utf-8')):
                reject(f'already patched but documentation missing/modified: {doc}')
    print(f'[PASS] Backend service version: {source_version}, {state}, SHA256={svc_sha}')
    print(f'[PASS] Rework endpoint: {state}, SHA256={ep_sha}')
    return state, old, result, source_version


def atomic_write(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    mode=(path.stat().st_mode & 0o777) if path.exists() else 0o644
    fd,tmp=tempfile.mkstemp(prefix='.'+path.name+'.tmp-',dir=str(path.parent))
    try:
        with os.fdopen(fd,'wb') as stream:
            stream.write(data); stream.flush(); os.fsync(stream.fileno())
        os.chmod(tmp,mode); os.replace(tmp,path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


def backup_path():
    return Path.home()/'.ipth_mes_updater_backups'/BACKUP_NAME


def apply(root, current, old, after, version):
    if current == 'AFTER':
        print('ALREADY APPLIED - no changes')
        return
    backup=backup_path()
    if backup.exists():
        m=backup/'manifest.json'
        if not m.is_file(): reject('existing backup lacks manifest')
        old_manifest=json.loads(m.read_text(encoding='utf-8'))
        if not old_manifest.get('rolled_back'): reject('backup from previous apply already exists')
        for rel, orig in old.items():
            path=backup/rel
            if not path.is_file() or path.read_bytes()!=orig:
                reject('rolled-back backup mismatch '+rel)
    else:
        backup.mkdir(parents=True, exist_ok=False)
        for rel, data in old.items():
            p=backup/rel
            p.parent.mkdir(parents=True,exist_ok=True)
            atomic_write(p,data)
    entries={rel:{'before_sha':digest(orig),'after_sha':digest(after[rel])} for rel,orig in old.items()}
    manifest={'name':BACKUP_NAME,'version':version,'created_utc':datetime.now(timezone.utc).isoformat(),
              'rolled_back':False,'files':entries,'docs':{doc:digest(c.encode('utf-8')) for doc,c in DOCS.items()}}
    written=[]
    try:
        # Protect against time-of-check/time-of-use file changes.
        for rel,orig in old.items():
            if (root/rel).read_bytes()!=orig: reject('file changed after scan: '+rel)
        for doc in DOCS:
            if (root/doc).exists(): reject('documentation appeared after scan: '+doc)
        for rel, data in after.items():
            atomic_write(root/rel,data);written.append(rel)
            print('[APPLIED]',rel)
        for doc,content in DOCS.items():
            atomic_write(root/doc,content.encode('utf-8'));written.append(doc)
            print('[APPLIED]',doc)
        atomic_write(backup/'manifest.json',json.dumps(manifest,indent=2).encode('utf-8'))
    except Exception:
        for rel in reversed(written):
            try:
                if rel in old: atomic_write(root/rel,old[rel])
                elif (root/rel).exists(): (root/rel).unlink()
            except OSError: pass
        raise
    print('APPLIED: Backend code and Markdown only, no database operation.')
    print('BACKUP:',backup)


def rollback(root):
    backup=backup_path(); manifest_path=backup/'manifest.json'
    if not manifest_path.is_file(): reject('backup manifest does not exist')
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('rolled_back'): reject('backup already rolled back')
    for rel, entry in manifest['files'].items():
        current=root/rel; original=backup/rel
        if not current.is_file() or digest(current.read_bytes()) != entry['after_sha']:
            reject('rollback source was modified: '+rel)
        if not original.is_file() or digest(original.read_bytes()) != entry['before_sha']:
            reject('rollback backup is corrupt: '+rel)
    for doc, sha in manifest['docs'].items():
        p=root/doc
        if not p.is_file() or digest(p.read_bytes())!=sha:
            reject('rollback documentation was changed: '+doc)
    for rel in manifest['files']:
        atomic_write(root/rel,(backup/rel).read_bytes());print('[RESTORED]',rel)
    for doc in manifest['docs']:
        (root/doc).unlink();print('[REMOVED]',doc)
    manifest['rolled_back']=True
    atomic_write(manifest_path,json.dumps(manifest,indent=2).encode('utf-8'))
    print('ROLLED BACK CODE/DOCS ONLY. Existing database RW input records are NOT reverted.')


def self_test():
    # Check the exact implementation injected by patch_service(), not a separate copy.
    tree=ast.parse(patch_service('"""MES2 Rework V0002 contract: durable whole-batch freeze and allocation balances.\n\nAll writes use the same SQLAlchemy Session/transaction, and the same Batches_Master\nUPDLOCK row protocol as legacy consumers. Never reinterpret Batches_Master.Status:\nit is label-print workflow, not batch validity.\n"""\nimport hashlib\nfrom sqlalchemy import text\n\n\nclass ReworkError(Exception):\n    def __init__(self, code, message):\n        super().__init__(message)\n        self.code = code\n        self.message = message\n\n\ndef take_rework_lock(db, kind: str, value: str) -> None:\n    """Transaction-scoped SQL Server application lock, with pyodbc nextset support."""\n    resource = \'IPTH_RW_\' + hashlib.sha256(f\'{kind}:{value}\'.encode(\'utf-8\')).hexdigest()[:52]\n    cursor = db.connection().connection.cursor()\n    try:\n        cursor.execute(\'\'\'\n            SET NOCOUNT ON;\n            DECLARE @r INT;\n            EXEC @r = sys.sp_getapplock @Resource=?, @LockMode=\'Exclusive\',\n                @LockOwner=\'Transaction\', @LockTimeout=5000;\n            SELECT @r AS LockResult;\n        \'\'\', resource)\n        while cursor.description is None:\n            if not cursor.nextset():\n                raise ReworkError(\'RW_LOCK_ERROR\', \'Không đọc được kết quả application lock.\')\n        result = cursor.fetchone()\n        if result is None or int(result[0]) < 0:\n            raise ReworkError(\'RW_BUSY\', \'Dữ liệu RW đang được xử lý bởi máy khác, vui lòng thử lại.\')\n    finally:\n        cursor.close()\n\n\ndef rw_row(db, wo, lock=False):\n    hint = \' WITH (UPDLOCK, HOLDLOCK)\' if lock else \'\'\n    return db.execute(text(f\'\'\'\n        SELECT RW_ID, WO, RW_Type, RW_Status, CompletedQty,\n               CreatedAtUTC, UpdatedAtUTC\n        FROM dbo.MES_ReworkJobs{hint} WHERE WO=:wo\n    \'\'\'), {\'wo\': int(wo)}).mappings().first()\n\n\ndef wo_row(db, wo):\n    # Master_WO_Log is memory optimized; never use UPDLOCK on this table.\n    return db.execute(text(\'\'\'\n        SELECT WO, ModelNO, Type, Status, QTY_OK\n        FROM dbo.Master_WO_Log WHERE WO=:wo\n    \'\'\'), {\'wo\': int(wo)}).mappings().first()\n\n\ndef batch_by_code(db, barcode, lock=False):\n    hint = \' WITH (UPDLOCK, HOLDLOCK)\' if lock else \'\'\n    return db.execute(text(f\'\'\'\n        SELECT ID, Batch, PartNO, QTY, Born_by_WO, Status, IsFrozen, IsQCHeld\n        FROM dbo.Batches_Master{hint} WHERE Batch=:barcode\n    \'\'\'), {\'barcode\': barcode}).mappings().first()\n\n\ndef require_active_batch(db, barcode):\n    """Lock batch row before another transaction can freeze it."""\n    batch = batch_by_code(db, barcode, lock=True)\n    if batch and bool(batch[\'IsFrozen\']):\n        raise ReworkError(\'BATCH_FROZEN\', f\'Batch {barcode} đã FROZEN vĩnh viễn.\')\n    if batch and bool(batch[\'IsQCHeld\']):\n        raise ReworkError(\'BATCH_QC_HOLD\', f\'Batch {barcode} đang bị QC HOLD.\')\n    return batch\n\n\ndef require_active_rw(db, wo, lock=True):\n    row = rw_row(db, wo, lock=lock)\n    if row is None:\n        raise ReworkError(\'RW_NOT_REGISTERED\', \'JOB chưa được mở qua /rework/open.\')\n    if row[\'RW_Status\'] != \'ACTIVE\':\n        raise ReworkError(\'RW_NOT_ACTIVE\', \'Rework JOB không ở trạng thái ACTIVE.\')\n    return row\n\n\ndef rw_balances(db, rw_id):\n    row = db.execute(text(\'\'\'\n        SELECT\n          (SELECT COALESCE(SUM(InputQty), 0) FROM dbo.MES_ReworkInputs WHERE RW_ID=:id) AS InputQty,\n          (SELECT COALESCE(SUM(B.QTY), 0)\n             FROM dbo.MES_ReworkOutputs O JOIN dbo.Batches_Master B ON B.ID=O.BatchID\n             WHERE O.RW_ID=:id) AS ReworkedAllocated\n    \'\'\'), {\'id\': rw_id}).mappings().one()\n    return {\'InputQty\': int(row[\'InputQty\']), \'ReworkedAllocated\': int(row[\'ReworkedAllocated\'])}\n\n\ndef response_error(e):\n    return {\'success\': False, \'message\': e.message, \'data\': {\'Code\': e.code}}\n'))
    nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and
           n.name in ('require_active_batch','require_rework_input_batch')]
    if len(nodes)!=2: reject('expected two source guard functions')
    program=ast.Module(body=nodes,type_ignores=[])
    class E(Exception):
        def __init__(self,code,msg): self.code=code;super().__init__(msg)
    def lookup(_db, _code, lock=False):
        assert lock is True
        return state['batch']
    ns={'batch_by_code':lookup,'ReworkError':E}
    exec(compile(ast.fix_missing_locations(program),'<actual-guard-functions>','exec'),ns)
    tests=[(None,'allow','allow'),
           ({'IsFrozen':0,'IsQCHeld':0},'allow','allow'),
           ({'IsFrozen':0,'IsQCHeld':1},'BATCH_QC_HOLD','allow'),
           ({'IsFrozen':1,'IsQCHeld':0},'BATCH_FROZEN','BATCH_FROZEN'),
           ({'IsFrozen':1,'IsQCHeld':1},'BATCH_FROZEN','BATCH_FROZEN')]
    count=0
    for batch, normal, rework in tests:
        state={'batch':batch}
        for name,expected in [('require_active_batch',normal),('require_rework_input_batch',rework)]:
            try:
                ns[name](None,'B001')
                actual='allow'
            except E as exc: actual=exc.code
            if actual!=expected: reject(f'{name} {batch}: expected {expected}; got {actual}')
            count+=1
    router_ast=ast.parse(patch_router('"""MES2 Rework endpoints. Requires manually VERIFIED RW V0002 schema.\n\nV0002 permits one registry record per WO, with multiple whole-batch inputs/outputs.\nBulk WO is a genealogy root in traceability; its input source remains available\nfrom /rework/details, not the ancestor tree.\n"""\nfrom typing import Optional\nfrom fastapi import APIRouter, Depends\nfrom pydantic import BaseModel, Field\nfrom sqlalchemy import text\nfrom sqlalchemy.orm import Session\n\nfrom app.db.session import SessionLocal\nfrom app.models.legacy.modelconfigs import DBModelConfig\nfrom app.services.assy_packing_linkage_service import (\n    get_sap_job, config_has_usable_rules, unpack_model_config, LinkageValidationError,\n)\nfrom app.services.raw_material_service import get_raw_material_history\nfrom app.services.rework_service import (\n    ReworkError, take_rework_lock, rw_row, wo_row,\n    require_active_rw, require_active_batch, rw_balances, response_error,\n)\n\nrouter = APIRouter()\n\n\ndef get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n\n\nclass OpenRW(BaseModel):\n    WO: int = Field(..., gt=0)\n    ModelNO: Optional[str] = Field(None, max_length=50)  # mandatory only for NEW BULK WO\n    Actor: Optional[str] = Field(None, max_length=100)\n\n\nclass AddRWInput(BaseModel):\n    WO: int = Field(..., gt=0)\n    Batch: str = Field(..., min_length=1, max_length=200)\n    Actor: Optional[str] = Field(None, max_length=100)\n\n\nclass RWProgress(BaseModel):\n    WO: int = Field(..., gt=0)\n    CompletedQty: int = Field(..., ge=0)\n    Actor: Optional[str] = Field(None, max_length=100)\n\n\nclass RWStatusChange(BaseModel):\n    WO: int = Field(..., gt=0)\n    Actor: Optional[str] = Field(None, max_length=100)\n\n\ndef _view(db, wo):\n    rw = rw_row(db, wo)\n    if rw is None:\n        return None\n    balance = rw_balances(db, rw[\'RW_ID\'])\n    completed = int(rw[\'CompletedQty\'])\n    return {\n        \'WO\': int(rw[\'WO\']), \'RW_ID\': int(rw[\'RW_ID\']),\n        \'RW_Type\': rw[\'RW_Type\'], \'RW_Status\': rw[\'RW_Status\'],\n        \'CompletedQty\': completed, \'InputQty\': balance[\'InputQty\'],\n        \'ReworkedAllocated\': balance[\'ReworkedAllocated\'],\n        \'ReworkedAvailable\': completed - balance[\'ReworkedAllocated\'],\n        \'CreatedAtUTC\': str(rw[\'CreatedAtUTC\']), \'UpdatedAtUTC\': str(rw[\'UpdatedAtUTC\']),\n    }\n\n\n@router.post(\'/open\')\ndef open_rw(payload: OpenRW, db: Session = Depends(get_db)):\n    """Open existing ONE_TO_ONE WO, or create explicit new BULK WO (ModelNO required)."""\n    try:\n        take_rework_lock(db, \'WO\', str(payload.WO))\n        existing = rw_row(db, payload.WO, lock=True)\n        if existing:\n            data = _view(db, payload.WO)\n            db.commit()\n            return {\'success\': True, \'message\': \'Đã mở lại hồ sơ Rework.\', \'data\': data}\n        work_order = wo_row(db, payload.WO)\n        if work_order:\n            # Legacy RW used to overwrite Production WO.Type=\'Rework\'.\n            # Without a registry entry we cannot safely infer its provenance.\n            if str(work_order[\'Type\'] or \'\').strip().casefold() == \'rework\':\n                raise ReworkError(\'RW_LEGACY_AMBIGUOUS\',\n                    \'WO cũ có Type=Rework nhưng chưa có RW registry. Cần kiểm tra thủ công.\')\n            rw_type = \'ONE_TO_ONE\'\n        else:\n            rw_type = \'BULK\'\n            # Avoid silently repurposing a WO already known by SAP but not yet\n            # initialized in local Master_WO_Log.\n            if get_sap_job(db, payload.WO):\n                raise ReworkError(\'RW_SAP_WO_UNINITIALIZED\',\n                    \'WO tồn tại trên SAP nhưng chưa đăng ký MES. Hãy mở Production JOB trước.\')\n            model = (payload.ModelNO or \'\').strip()\n            if not model:\n                raise ReworkError(\'RW_BULK_MODEL_REQUIRED\',\n                    \'BULK RW mới phải khai báo ModelNO để xác định Model Config và RAW rules.\')\n            config = db.query(DBModelConfig).filter(DBModelConfig.model_no == model).first()\n            if not config_has_usable_rules(config):\n                raise ReworkError(\'RW_BULK_MODEL_NOT_CONFIGURED\',\n                    \'ModelNO chưa có Model Config hợp lệ.\')\n            try:\n                unpack_model_config(config)\n            except LinkageValidationError:\n                raise ReworkError(\'RW_BULK_MODEL_CONFIG_INVALID\',\n                    \'Model Config của BULK RW có JSON không hợp lệ.\')\n            # Same transaction as RW registry insertion, no phantom WO on failure.\n            db.execute(text(\'\'\'\n                INSERT INTO dbo.Master_WO_Log\n                    (WO, ModelNO, Type, QTY_Target, QTY_OK, QTY_Processed,\n                     QTY_NG, Status, WCtr)\n                VALUES (:wo, :model, \'Rework\', 0, 0, 0, 0, 1, \'TBC\')\n            \'\'\'), {\'wo\': payload.WO, \'model\': model})\n        db.execute(text(\'\'\'\n            INSERT INTO dbo.MES_ReworkJobs\n                (WO, RW_Type, RW_Status, CreatedBy, UpdatedBy)\n            VALUES (:wo, :rw_type, \'ACTIVE\', :actor, :actor)\n        \'\'\'), {\'wo\': payload.WO, \'rw_type\': rw_type, \'actor\': payload.Actor})\n        data = _view(db, payload.WO)\n        db.commit()\n        return {\'success\': True, \'message\': \'Đã mở hồ sơ Rework.\', \'data\': data}\n    except ReworkError as exc:\n        db.rollback()\n        return response_error(exc)\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_OPEN_FAILED\', \'Không mở được Rework JOB; transaction đã rollback.\'))\n\n\n@router.post(\'/add-input\')\ndef add_input(payload: AddRWInput, db: Session = Depends(get_db)):\n    """Atomic whole-batch freeze + input mapping. No consumption history allowed."""\n    try:\n        take_rework_lock(db, \'WO\', str(payload.WO))\n        rw = require_active_rw(db, payload.WO)\n        barcode = payload.Batch.strip()\n        # Serialize with legacy consumer paths; they must use the same row-lock.\n        batch = require_active_batch(db, barcode)\n        if batch is None:\n            raise ReworkError(\'RW_INPUT_NOT_FOUND\', \'Không tồn tại Input Batch.\')\n        if rw[\'RW_Type\'] == \'ONE_TO_ONE\' and int(batch[\'Born_by_WO\'] or 0) != payload.WO:\n            raise ReworkError(\'RW_INPUT_WRONG_WO\', \'Input Batch không được khai sinh bởi JOB RW 1-1.\')\n        if int(batch[\'QTY\']) <= 0:\n            raise ReworkError(\'RW_INPUT_BAD_QTY\', \'Input Batch có QTY không hợp lệ.\')\n        # Refuse reclaim of a batch already registered to ANY downstream WO.\n        consumed = db.execute(text(\'\'\'\n            SELECT TOP 1 ID FROM dbo.Batches_Consumption_Log\n            WHERE Batch_ID=:id\n        \'\'\'), {\'id\': batch[\'ID\']}).scalar()\n        if consumed is not None:\n            raise ReworkError(\'RW_INPUT_ALREADY_CONSUMED\',\n                \'Batch đã có lịch sử consumption. Cần xử lý thu hồi riêng trước khi RW.\')\n        changed = db.execute(text(\'\'\'\n            UPDATE dbo.Batches_Master SET IsFrozen=1, FrozenAtUTC=SYSUTCDATETIME()\n            WHERE ID=:id AND IsFrozen=0\n        \'\'\'), {\'id\': batch[\'ID\']})\n        if changed.rowcount != 1:\n            raise ReworkError(\'RW_INPUT_STATE_CHANGED\', \'Batch vừa bị thay đổi bởi request khác.\')\n        db.execute(text(\'\'\'\n            INSERT INTO dbo.MES_ReworkInputs (RW_ID, BatchID, InputQty, FrozenBy)\n            VALUES (:rw, :id, :qty, :actor)\n        \'\'\'), {\'rw\': rw[\'RW_ID\'], \'id\': batch[\'ID\'], \'qty\': batch[\'QTY\'], \'actor\': payload.Actor})\n        data = _view(db, payload.WO)\n        db.commit()\n        return {\'success\': True, \'message\': f\'Đã FROZEN toàn bộ Batch {barcode}.\', \'data\': data}\n    except ReworkError as exc:\n        db.rollback()\n        return response_error(exc)\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_INPUT_FAILED\', \'Không thể đóng băng Batch; transaction đã rollback.\'))\n\n\n@router.post(\'/progress\')\ndef set_progress(payload: RWProgress, db: Session = Depends(get_db)):\n    """CompletedQty is a monotonically increasing cumulative total, never a delta."""\n    try:\n        take_rework_lock(db, \'WO\', str(payload.WO))\n        rw = require_active_rw(db, payload.WO)\n        balance = rw_balances(db, rw[\'RW_ID\'])\n        old = int(rw[\'CompletedQty\'])\n        new = int(payload.CompletedQty)\n        if new < old:\n            raise ReworkError(\'RW_PROGRESS_CANNOT_DECREASE\',\n                \'Sản lượng lũy kế không thể giảm; cần quy trình hiệu chỉnh có kiểm toán.\')\n        if new > balance[\'InputQty\']:\n            raise ReworkError(\'RW_PROGRESS_EXCEEDS_INPUT\',\n                \'Sản lượng hoàn thành vượt tổng Input Batch đã nhận.\')\n        if new < balance[\'ReworkedAllocated\']:\n            raise ReworkError(\'RW_PROGRESS_BELOW_ALLOCATED\',\n                \'Sản lượng không thể nhỏ hơn số đã cấp tem RW.\')\n        if new != old:\n            db.execute(text(\'\'\'\n                UPDATE dbo.MES_ReworkJobs SET CompletedQty=:qty,\n                    UpdatedBy=:actor, UpdatedAtUTC=SYSUTCDATETIME()\n                WHERE RW_ID=:id\n            \'\'\'), {\'qty\': new, \'actor\': payload.Actor, \'id\': rw[\'RW_ID\']})\n        data = _view(db, payload.WO)\n        db.commit()\n        return {\'success\': True, \'message\': \'Đã lưu sản lượng Rework lũy kế.\', \'data\': data}\n    except ReworkError as exc:\n        db.rollback()\n        return response_error(exc)\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_PROGRESS_FAILED\', \'Lưu tiến độ thất bại; transaction đã rollback.\'))\n\n\n@router.post(\'/complete\')\ndef complete_rw(payload: RWStatusChange, db: Session = Depends(get_db)):\n    try:\n        take_rework_lock(db, \'WO\', str(payload.WO))\n        rw = require_active_rw(db, payload.WO)\n        balance = rw_balances(db, rw[\'RW_ID\'])\n        if balance[\'ReworkedAllocated\'] != int(rw[\'CompletedQty\']):\n            raise ReworkError(\'RW_UNALLOCATED_OUTPUT\', \'Hãy cấp tem hết sản lượng Reworked trước khi hoàn thành.\')\n        db.execute(text(\'\'\'UPDATE dbo.MES_ReworkJobs SET RW_Status=\'COMPLETED\',\n            UpdatedBy=:actor, UpdatedAtUTC=SYSUTCDATETIME() WHERE RW_ID=:id\'\'\'),\n            {\'id\': rw[\'RW_ID\'], \'actor\': payload.Actor})\n        data = _view(db, payload.WO)\n        db.commit()\n        return {\'success\': True, \'message\': \'Đã hoàn thành RW.\', \'data\': data}\n    except ReworkError as exc:\n        db.rollback()\n        return response_error(exc)\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_COMPLETE_FAILED\', \'Không hoàn thành được RW.\'))\n\n\n@router.post(\'/reopen\')\ndef reopen_rw(payload: RWStatusChange, db: Session = Depends(get_db)):\n    try:\n        take_rework_lock(db, \'WO\', str(payload.WO))\n        rw = rw_row(db, payload.WO, lock=True)\n        if rw is None or rw[\'RW_Status\'] != \'COMPLETED\':\n            raise ReworkError(\'RW_CANNOT_REOPEN\', \'Chỉ mở lại RW đã COMPLETED.\')\n        db.execute(text(\'\'\'UPDATE dbo.MES_ReworkJobs SET RW_Status=\'ACTIVE\',\n            UpdatedBy=:actor, UpdatedAtUTC=SYSUTCDATETIME() WHERE RW_ID=:id\'\'\'),\n            {\'id\': rw[\'RW_ID\'], \'actor\': payload.Actor})\n        data = _view(db, payload.WO)\n        db.commit()\n        return {\'success\': True, \'message\': \'Đã mở lại RW.\', \'data\': data}\n    except ReworkError as exc:\n        db.rollback()\n        return response_error(exc)\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_REOPEN_FAILED\', \'Không mở lại được RW.\'))\n\n\n@router.get(\'/details/{wo}\')\ndef rework_details(wo: int, db: Session = Depends(get_db)):\n    try:\n        overview = _view(db, wo)\n        if overview is None:\n            return response_error(ReworkError(\'RW_NOT_REGISTERED\', \'WO không có hồ sơ RW.\'))\n        inputs = db.execute(text(\'\'\'\n            SELECT B.Batch, B.PartNO, I.InputQty, B.IsFrozen,\n                   I.FrozenAtUTC, I.FrozenBy\n            FROM dbo.MES_ReworkInputs I\n            JOIN dbo.Batches_Master B ON B.ID=I.BatchID\n            WHERE I.RW_ID=:rw ORDER BY I.RW_InputID\n        \'\'\'), {\'rw\': overview[\'RW_ID\']}).mappings().all()\n        outputs = db.execute(text(\'\'\'\n            SELECT B.Batch, B.PartNO, B.QTY, B.Status AS PrintStatus,\n                   B.IsFrozen, O.RegisteredAtUTC, O.RegisteredBy\n            FROM dbo.MES_ReworkOutputs O\n            JOIN dbo.Batches_Master B ON B.ID=O.BatchID\n            WHERE O.RW_ID=:rw ORDER BY O.RW_OutputID\n        \'\'\'), {\'rw\': overview[\'RW_ID\']}).mappings().all()\n        data = {**overview, \'InputBatches\': [dict(x) for x in inputs],\n                \'OutputBatchesReworked\': [dict(x) for x in outputs],\n                \'RawMaterials\': get_raw_material_history(db, wo)}\n        return {\'success\': True, \'data\': data}\n    except Exception:\n        db.rollback()\n        return response_error(ReworkError(\'RW_DETAILS_FAILED\', \'Không tải được Rework Details.\'))\n'))
    fn=next(n for n in router_ast.body if isinstance(n,ast.FunctionDef) and n.name=='add_input')
    calls=[n for n in ast.walk(fn) if isinstance(n,ast.Call) and
           isinstance(n.func,ast.Name) and n.func.id in ('require_active_batch','require_rework_input_batch')]
    if len(calls)!=1 or calls[0].func.id!='require_rework_input_batch':
        reject('rework add-input guard not patched correctly')
    print(f'[PASS] {count} guard cases + endpoint routing AST check. No DB connection.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    modes=parser.add_mutually_exclusive_group(required=True)
    for flag in ('scan','self-test','apply','verify','rollback'):
        modes.add_argument('--'+flag,action='store_true')
    args=parser.parse_args()
    if args.self_test:
        self_test();return
    root=roots()
    if args.rollback:
        rollback(root);return
    current,old,after,version=inspect(root)
    if args.scan:
        print('VERDICT: PASS — ready to APPLY code/docs only' if current=='BEFORE' else 'VERDICT: PASS — already applied')
    elif args.apply:
        apply(root,current,old,after,version)
    elif args.verify:
        if current!='AFTER': reject('not patched; run --apply first')
        print('VERDICT: PASS — RW accepts QC HOLD, normal consumers still reject QC HOLD')

if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('[ERROR]',exc)
        raise SystemExit(2)
