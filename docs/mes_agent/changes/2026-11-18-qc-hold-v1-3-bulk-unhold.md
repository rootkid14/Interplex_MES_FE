# QC Hold Workspace v1.3 — Bulk Unhold

## Purpose
Unhold QC-held batches from a filtered list without re-entering each barcode.

## Contract
- `POST /api/v1/qc-batch/bulk-unhold/preview`
- `POST /api/v1/qc-batch/bulk-unhold/apply`
- `Mode=SELECTED` with `Batches` list; `Mode=FILTERED` with previously applied server-side filters.
- `ActorID`, `Password` at each call; backend checks QC/IT permissions.
- Preview returns a short-lived (120s) fingerprint and counts `Eligible` and `ProtectedFrozen`.
- Apply requires `Reason`, `ConfirmCount`, `PreviewToken`, `PreviewAtUTC`.
- Max 500 matched rows; narrowed filter required to bulk-unhold all filter results.
- Any change to matched rows between preview and commit => 409; no partial update.
- Update `IsQCHeld=0`, `QCHeldAtUTC=NULL` and insert `MES_BatchHoldAudit(Action='UNHOLD')` in one DB transaction per bulk call.
- `RW IsFrozen` never modified and RW-frozen rows are skipped.

## Source files
- BE `app/api/v1/endpoints/qc_batch_hold.py`
- FE `src/components/utilities/BatchHoldView.jsx`, `BatchHoldWorkspace.css`, `src/api/qcBatchAPI.js`

## Verification
Test 1/20/multi-page/filtered, protected Frozen, stale preview after concurrent change, bad credential, abort on audit insertion failure. Test on Dev; never run bulk Unhold on live production data before validation.
