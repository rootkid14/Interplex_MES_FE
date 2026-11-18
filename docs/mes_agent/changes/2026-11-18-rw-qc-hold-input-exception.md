# MES2 RW / QC HOLD — Allow QC-held whole batches as Rework inputs

Release: 2026-11-18 · Backend hotfix v1 · Code/docs only · No SQL migration

## Root cause

Utilities V1 introduced the reversible `Batches_Master.IsQCHeld` flag and
updated `require_active_batch()` in `app/services/rework_service.py` to
reject held batches. This helper is shared by Production/Allocation and
`POST /rework/add-input`, causing the Rework intake to reject the very
QC-held defective batches that should be repaired.

## Intended behavior

| Original batch state | Normal production / allocation | RW add-input |
| --- | --- | --- |
| ACTIVE, not held | ALLOW (subject to other rules) | ALLOW (subject to other rules) |
| QC HOLD, not RW frozen | REJECT | **ALLOW** (subject to other rules) |
| RW FROZEN | REJECT | REJECT |
| QC HOLD + RW FROZEN | REJECT | REJECT |

All other RW validations remain intact: ONE_TO_ONE input must belong to WO;
BULK can accept batches from other WOs; zero/invalid quantity rejected;
any recorded consumption rejected; duplicate input/freeze rejected; RW must
be ACTIVE; same transaction freezes the **entire input Batch** and registers
`MES_ReworkInputs`.

## Implementation

- `app/services/rework_service.py`: introduce a dedicated
  `require_rework_input_batch()` that acquires the same `UPDLOCK,HOLDLOCK`
  Batch lock as existing consumer paths, rejects `IsFrozen`, but does **not**
  reject `IsQCHeld`. Keep `require_active_batch()` unchanged for Production,
  Allocation and any other normal consumption paths.
- `app/api/v1/endpoints/rework.py`: use this dedicated helper **only**
  inside `/rework/add-input`.

The transition to RW does **not** clear `IsQCHeld` or edit QC audit records.
After intake, the original batch may have both `IsQCHeld=1` and
`IsFrozen=1`. Frozen remains permanent and QC Unhold cannot reactivate it.
The QC currently-held inventory may continue to show the old batch (marked
RW FROZEN); a future UX policy can explicitly archive such entries, with
proper audit, but this narrow hotfix does not silently erase QC decisions.

## Safety and compatibility

- This updater only changes the two BE Python files and these docs.
- No DB connection or modifications during `--scan`, `--apply`, `--verify`,
  `--self-test` or `--rollback`.
- Exact SHA256 baselines for the inspected Utilities V1 service and the
  post-DiskBased Compatibility service, plus Phase B RW endpoint.
- Any unknown or partially patched source is REJECTED.
- Backup stored outside FE/BE git repos. Rollback code does not undo any
  real RW intake already committed through the API.

## Manual Dev acceptance (use expendable test data)

1. On a valid unconsumed Batch in a ONE_TO_ONE WO, apply QC HOLD.
2. Call `/rework/open` then `/rework/add-input`: expect success; verify
   the original Batch has `IsFrozen=1` **and** still has `IsQCHeld=1`.
3. Scan the same old Batch into normal production: expect reject.
4. Try `/rework/add-input` a second time: expect `BATCH_FROZEN`.
5. Confirm QC Hold still rejects the batch in normal Production/Allocation.
6. Confirm a normal ACTIVE batch can enter Rework under unchanged rules.
7. Confirm a Batch with any history in `Batches_Consumption_Log` is still
   rejected (`RW_INPUT_ALREADY_CONSUMED`).
8. Confirm ONE_TO_ONE wrong-WO rejection and BULK cross-WO intake.
9. Restart Backend after APPLY; Frontend does not need a rebuild.

## Run from the Backend directory

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --scan
python ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --self-test
python ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --apply
python ../Interplex_MES_FE/IPTH_MES2_RW_QCHold_Input_Hotfix_v1.py --verify
```
