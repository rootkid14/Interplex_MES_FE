# RW Input Acceptance vs QC Hold — module contract

Component owner: `app/services/rework_service.py` and
`app/api/v1/endpoints/rework.py`.

## Two distinct guards

**Normal consumption** (`require_active_batch`) rejects QC HOLD and RW FROZEN;
used by Production and Allocation. **Rework intake**
(`require_rework_input_batch`) only rejects RW FROZEN at this guard.
Rework endpoint then enforces WO, positive input QTY, no consumption history,
transactional whole-batch freeze + registry insertion. The same locked row
protocol serializes intake against legacy consumers.

Do not modify shared `require_active_batch` to accept held batches globally:
that would silently permit held material into normal production.

## State invariants

- QC HOLD is reversible; RW FROZEN is permanent.
- Once RW intake commits, the old Batch must no longer be usable.
- QC flag may remain set on a frozen Batch for audit and reporting; it does
  not grant permission to unfreeze.
- Reworked Output Batches are **new** Batch IDs and begin independently.
- Backend errors are transactional: a failed RW input does not freeze Batch.

No SQL migration or FE runtime change is part of this hotfix.
