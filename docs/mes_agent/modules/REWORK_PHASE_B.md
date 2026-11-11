# MES2 — Rework Phase B (Backend V1, 2026-11-11)

## Source provenance and rollout

Source: `IPTH_Source_20261111_043112Z.zip` (19 reviewed runtime sources). RAW Material implementation is based on the previously issued `IPTH_MES2_RAW_PhaseC_FullPackage.zip`; the updater pins **the exact original SHA-256** and REJECTs if the machine's deployed `raw_material_service.py` is different. SQL basis: manually executed and user-confirmed RW V0002 `02_VERIFY.sql` PASS on `IPTHData_Dev` (SQL 17.0.4055.5; `Master_WO_Log` memory-optimized, `Batches_Master` disk-based). The updater does **not** inspect, connect to, or update the live database. Run after V0002 VERIFY PASS; stop all MES services before file replacement; restart BE after deploy.

## Scope and transaction contract

`app/api/v1/endpoints/rework.py` mounted at `/api/v1/rework` and `app/services/rework_service.py` own the RW lifecycle. V0002 schema has exactly one `MES_ReworkJobs` row per WO (`UQ_MES_ReworkJobs_WO`), and multiple `MES_ReworkInputs`/`MES_ReworkOutputs`. The registry is an operation record, **not a replacement WO or a new production WO type**. `ONE_TO_ONE` retains existing WO.Type; `BULK` creates a new WO (Type=`Rework`) with operator-supplied `ModelNO` and no SAP row. Bulk's ModelNO must have valid Model Config. If a WO is in SAP but not local Master_WO_Log, `/open` rejects it (must initialize production first). Legacy local WO with `Type=Rework` and no registry is ambiguous and rejected pending manual review, rather than silently classified 1-1. Opening an existing RW record returns the stored type, never reclassifies by existence.

API: `POST /rework/open` `{WO,ModelNO?,Actor?}`; `POST /rework/add-input` `{WO,Batch,Actor?}`; `POST /rework/progress` `{WO,CompletedQty,Actor?}`; `POST /rework/complete` and `/reopen` `{WO,Actor?}`; `GET /rework/details/{wo}`. Response style `{success,message,data}` and structured `data.Code` on domain error. For V0002, only integer quantities are supported.

`add-input`: with transaction-scoped `sp_getapplock` on WO + `Batches_Master WITH (UPDLOCK,HOLDLOCK)` row; checks RW ACTIVE, Batch exists and IsFrozen=0, InputQty>0; for `ONE_TO_ONE` Born_by_WO must match WO. Reject if Batch has **any prior consumption history**, even `IsCurrent=0`, until an audited return/recall process exists. Update `IsFrozen=1,FrozenAtUTC=now` and insert `MES_ReworkInputs` **in the same transaction**. Full-batch only, no unfreeze endpoint; `MES_ReworkInputs.BatchID` globally UNIQUE. Legacy consumption/packing paths also lock/check frozen status to serialize.

`progress`: user-supplied cumulative `CompletedQty`, never a delta, must be nondecreasing and <= sum of whole InputQty, >= already-created RW output. No mutation to `Master_WO_Log.QTY_OK`; keep production normal counter and RW counter separate. Output batches are treated as normal active batches by downstream MES.

`/rework/details` includes `InputBatches`, `OutputBatchesReworked` and `RawMaterials` from existing V0001 RAW Material history. No new RAW storage. RAW service permits model fallback to local WO.ModelNO **only** for registered ACTIVE BULK RW, while retaining SAP model validation and PN/UOM rules for ordinary WOs.

## Batch Allocation

`POST /allocation/generate` adds optional `Source="NORMAL"|"REWORK"` (default NORMAL, legacy callers unchanged). Both paths take the same transaction application lock (`WO`, then `PN`) and allocate distinct quotas:

- NORMAL remaining = `Master_WO_Log.QTY_OK - SUM(QTY of Batches_Master rows for WO NOT linked to MES_ReworkOutputs)`.
- REWORK remaining = `MES_ReworkJobs.CompletedQty - SUM(QTY of Batches_Master JOIN MES_ReworkOutputs for this RW_ID)`.

**Do not refund NORMAL issued quantity when an original Batch is frozen**, or the normal allocator would issue duplicate labels. Do not add CompletedQty to `Master_WO_Log.QTY_OK`, or the normal allocator would double-spend RW quantity. Existing normal Batch history remains; all new rework allocations insert the Batch master row and `MES_ReworkOutputs` in the **same transaction**. `CustomQTY` manual and MaxQTY automatic splitting retained. REWORK currently requires all registered input batches to have the **same PartNO**, and output PN must match it. This prevents cross-part output labeling; mixed-PartNO Bulk RW needs an approved mapping rule in a subsequent phase.

`GET /allocation/balance/{wo}` returns `ProducedOK`, `Allocated`, `WaitAllocate`, `Reworked`, `ReworkedAllocated`, `ReworkedWaitAllocate`, `HasRework`, `RW_Type`. `Allocated` is **normal historical allocated** including FROZEN original labels, not currently-usable stock. `GET /allocation/status/{wo}` still returns a list for the legacy FE, now with `isFrozen`, `isReworkedOutput` per card. Freeze is independent of print `Status` 0/1/2. Frozen cards cannot verify/print/delete; Rework output cannot be deleted using legacy `deleteAllocation` (preserve genealogy). Verify-bulk uses parameterized SQL instead of interpolated barcodes. Existing legitimate serial codes PN;NNNN are generated under PN lock; generator is bounded at 1000 per request.

## Traceability

`traceability.build_wo_tree` and `build_reverse_trace_graph` add `HasRework`, `ReworkType`, `IsReworkRoot` per WO. BULK stops ancestor traversal (root in visual genealogy) but its Input Batch source remains in `GET /rework/details/{wo}`. ONE_TO_ONE shows one existing WO node; FE Phase C will render the RW mark and Input/Output panel. No new tree branches introduced for RW input detail.

## Compatibility, limitation and safety

- **FE not modified in Phase B.** Existing FE's `validate?is_rework=true` path is deliberately rejected with `RW_USE_REWORK_API` to prevent legacy code changing production WO.Type. Phase C must integrate the new RW APIs and the allocation `Source` switch before RW deployment to operators.
- Existing `verify_card`, `verify_bulk`, `print_batches`, `deleteAllocation`, `logInputMain`, `transferInputBatch`, `/packing/master/log_material` and Outsource initialization are guarded for frozen Batch use in this snapshot. Verify all other installed/third-party consumers before go-live. Direct SQL writes by other processes **cannot** be prevented by Python API guards; V0002 has no database-wide trigger enforcing FROZEN. Additional SQL write paths require audit.
- New BULK WO is local and intentionally absent from SAP; endpoints that require SAP (other than patched RAW) may not work for BULK. Frontend Phase C should only expose supported RW operations, not normal Production validation. Bulk WO cannot claim an SAP WO ID.
- `IsFrozen` is permanent; cancellation or return of already-consumed Batch requires separately reviewed workflow. No partial batches, no cross-PN rework output, no automated SCRAP/QA accounting, no progress change audit table in V0002; these are explicit scope restrictions.
- No SQL migration, `.env`, user data or FE runtime changes. `--scan` must strictly match source SHA-256 and V0002 SQL file hashes. `--rollback` restores code files only and must never try to roll back SQL or undo an already-committed RW action.

## Regression/test plan

Test on Dev: RW 1-1 keeps Type and normal production concurrent; BULK new requires ModelNO; BULK reopened retains `BULK`; 1-1 rejects alien input; repeated/frozen/consumed input is blocked; downstream consumption rejects FROZEN; abort input leaves no frozen-only half-state; accumulated CompletedQty cannot regress/exceed inputs; normal and RW pools stay disjoint; two workers cannot double allocate; REWORK Auto/manual partial batches and proper PN SN; previous RW output may re-enter RW; print, verify, recall frozen and RW outputs are rejected; Raw UOM/serial remains verified for BULK. Trace Forward Bulk root stops; RW details retains original input barcodes. Also test Packing/Outsource/SmartRepair interactions. End-to-end SQL and two-workstation race tests must be performed by operator; only offline compile/static/updater integration tests were executed by agent.

<!-- MES2_RW_PHASE_C_V1 -->
## FE integration note

Phase C now consumes these exact endpoints through `src/api/reworkAPI.js` and `ReworkWorkbench`. Frontend deployment must be paired with installed Phase B and manually verified V0002, not just copied UI components. See `modules/REWORK_PHASE_C.md` and `modules/traceability_rework.md`. Backend remains unchanged in this patch.
