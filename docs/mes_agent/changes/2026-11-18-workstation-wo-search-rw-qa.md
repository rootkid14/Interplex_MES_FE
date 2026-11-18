# MES2 Workstation Dashboard + QC Hold QA Permission (2026-11-18)

## Scope
- `/workstation` Dashboard / ActiveJobsTable: client-side partial Work Order (WO) search on live SSE active jobs; no DB search endpoint added. This does **not** include completed or archived WOs.
- WorkOrderCard: only WOs with a registered RW case show RW_Type (ONE_TO_ONE/BULK), RW_Status, cumulative RW InputQty, cumulative CompletedQty, Input Batch count, and ratio CompletedQty/InputQty. The ratio is throughput progress, **not** output inventory or distinct physical units.
- Dashboard SSE: `global_wo_poller` attaches optional RW metadata to each WorkOrderResponse object from `MES_ReworkJobs` / `MES_ReworkInputs` in chunks of <=500 WO IDs. Missing RW registry rows do not produce RW badges. RW query failures do not block normal WO SSE but flag `RW_SummaryError`.
- QC Hold UI and server allow `QA`, `QC`, `IT`, `Quality Control` values in Emp_Role or Emp_Dept (trim/case-insensitive), while still requiring fresh Backend password verification. `Admin` by itself does not authorize. Current Accounts Manager uses Emp_Dept=`QA`.

## Safety / limitations
- No SQL migration, no database data edits during installation.
- Uses existing V0002 RW schema and V0003 QC Hold schema.
- Does not alter Batch QC HOLD or RW FROZEN rules.
- Requires installed QC Hold v1.3 and Disk-Based Compatibility baseline; incompatible hashes produce REJECT.
- Workstation list is active WOs (Status 0/1) supplied through existing Dashboard SSE.
- CompletedQty is cumulative for a single RW WO across cycles. InputQty aggregates whole Batch quantities; repeat RW can count the same physical units multiple times.
- After installing restart BE and rebuild/restart FE.

## Manual QA
1. `/workstation` search exact WO, partial WO and `#123`; clear search; verify SSE updates continue and no record created.
2. WorkOrder with no RW case: no RW block; WO with RW case: correct type/status/input batches/input qty/completed qty, update RW progress and verify next SSE tick.
3. QA account created with Dept QA: UI available, correct password can query/Hold/Unhold/bulk Unhold. Wrong password rejected at Backend.
4. IT and legacy QC account remain authorized; Production/other Dept remains forbidden; Admin with unrelated Dept remains forbidden.
5. QC HOLD Batch cannot be consumed in Production; RW FROZEN remains irreversible; QA change must not touch IsFrozen.

## Rollback
Updater rollback restores only files, not DB operations. Hash mismatch triggers REJECT. Do not rollback onto an incompatible DB/schema without checking runtime compatibility.
