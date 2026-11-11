# MES2 Utilities V1 — 2026-11-11

Source snapshot: `IPTH_Source_20261111_084000Z.zip`. This is an additive code/docs updater and manual SQL V0003 package. Python updater never connects to or mutates DB.

## Function map

- `app/api/v1/endpoints/qc_batch_hold.py` provides `GET /api/v1/qc-batch/status/{batch_code}` and `POST /api/v1/qc-batch/change`, backed by `MES_BatchHoldAudit`. Every mutation requires account ID + password verified on server against `MES_UsersMaster`; roles/departments QC, IT, Quality Control only. **Legacy plaintext password system needs a dedicated security improvement; serve via HTTPS only.**
- `Batches_Master.IsQCHeld` is reversible QC Hold and *independent* of `IsFrozen` RW retirement. Successful transitions recorded with actor/reason/time; RW-frozen batches reject QC changes.
- `app/services/rework_service.require_active_batch` checks both gates. `/validation/logInputMain`, `/validation/transferInputBatch`, `/rework/add-input`, allocator verify/print and `packing_master` MAIN_INPUT respect gates. Main routes coordinate via `UPDLOCK,HOLDLOCK` on Batches_Master.
- `src/components/utilities/BatchHoldView.jsx` panel for QC/IT, server-side reauth at action time. `Sidebar.jsx` and `App.jsx` register nav/route.
- `traceability.py /tracebybatch/{batch_code}` queries exact Batch barcode and its direct `Batches_Consumption_Log` edges, deliberately does not conflate all sibling batches of the same WO. Frontend adds Batch mode and precise consumption Details.
- `TraceabilityView.jsx` CSV maps visible Batch Details columns in their exact display order and exports Batch Trace/RW tables, escaping quotes and formula prefixes.
- `src/utils/keyboardOnlyNumericInputs.js` globally intercepts native number wheel/ArrowUp/ArrowDown changes and CSS hides native spinner arrows. Non-number text decimal inputs remain keyboard editable.
- FrameBatchAllocator + FrameOutSourceAllocator refresh server status immediately before printing/reprinting; Batch state may change while a page remains open.

## Rollout

1. Code updater --scan. Confirm PASS; obtain DB backup.
2. Extract SQL files with --apply but do not restart production BE.
3. Run V0003 PRECHECK/APPLY/VERIFY **manually** on Dev.
4. Restart BE then run FE npm build and restart FE. Test only disposable Dev data.
5. Role negative test: non-QC/IT 403, wrong password 401, QC/IT authorized, RW Frozen 409.

## Known limitations / non-goals

- No cryptographically signed login sessions exist in the current MES; QC changes require explicit password per action. Other legacy user-management endpoints are not hardened in this release; broader authorization remains a separate security task.
- Holding a Batch does not undo *previous* consumption. It blocks future supported consume/allocate/print paths. External direct SQL writers and older unrestarted services are not controlled here.
- Reprint status is refreshed immediately before creating the client file, reducing stale FE risk, but an additional race between check and client file creation is possible. A dedicated server-side authorized print token/stream is needed for strict guarantee.
- Trace-by-Batch displays exact direct consumption and producer/consumer WO nodes only. Downstream propagation past direct consumer cannot be established from the captured per-unit provenance, so no fabricated descendant claim.
- Global number input change blocks native number spinners (including numeric account IDs), preserving text decimal entry and existing validation.
