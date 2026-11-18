# Workstation / QA QC Hold — Module Notes

## FE `src/components/dashboard/ActiveJobsTable.jsx`
- Reads `activeJobs` from `useProductionStore` (global SSE); `woSearch` is local state.
- Filters by literal WO substring after removing a single leading `#`; no calls to Backend for searches.
- Search is purely presentational and never changes active jobs in the shared store.

## FE `src/components/dashboard/WorkOrderCard.jsx`
- Consumes optional `RW_*` properties injected by the SSE poller.
- Renders RW panel only when `RW_Status` is present; the `RW_SummaryError` indicator is used only when the summary query failed.
- Units follow stored MES quantity (typically PCS); no physical rework-cycle de-duplication.

## BE `app/api/v1/endpoints/dashboardstreaming.py`
- Existing `global_wo_poller` publishes active WO lists every 3 seconds if SSE clients exist.
- Batch query `SELECT ... LEFT JOIN MES_ReworkInputs... GROUP BY ...` is read-only and bound via SQLAlchemy expanding IDs.
- Query failure leaves core WO SSE intact and marks RW metadata as unavailable.
- `CompletedQty` originates in `MES_ReworkJobs`; `InputQty` is SUM of `MES_ReworkInputs.InputQty` and input batch count is COUNT of `BatchID`.

## QA/QC/IT Hold authentication
- FE `BatchHoldView.jsx` and BE `qc_batch_hold.py` both accept departments/roles QA, QC, IT, Quality Control.
- Backend verifies password on each sensitive endpoint, including bulk preview/execute. FE guard is for usability only.
- QC Hold remains reversible, RW Frozen remains irreversible.

## Compatibility
- Disk-Based backend baseline must be installed (source hash checked).
- V0002 RW registry and V0003 QC Hold tables must already be present.
- No new API routes or SQL migrations.
