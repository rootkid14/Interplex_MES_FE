# MES2 Rework — Phase C (Frontend Integration, 2026-11-11)

## Source provenance, scope and ownership

- FE baseline: `IPTH_Source_20261111_043112Z.zip` (07 FE runtime files are patched/added plus markdown). Phase B backend hash source `IPTH_MES2_RW_PhaseB_Backend_FullPackage.zip`, installed by operator and verified by strict updater SHA checks, not a live server test.
- Phase A SQL V0002 `02_VERIFY.sql` PASS reported by operator for `IPTHData_Dev`. This updater does not connect to database, alter code in BE, execute SQL, or modify historical Batch data.
- Owners: `src/components/production/ActiveJobView.jsx`, `AllocationView.jsx`, `FrameBatchAllocator.jsx`, `src/components/traceability/TraceabilityView.jsx`; new `src/components/rework/ReworkWorkbench.jsx`, `RWDetailsTables.jsx`, `src/api/reworkAPI.js`.
- Existing FE API `workstationApi.js` remains unchanged. Client baseURL `/api/v1`; Phase B BE mounts `/rework` and `/allocation`.

## Workflows and exact API contracts

**Production / Rework entry:** Select REWORK. Scan positive safe-integer WO -> `POST /api/v1/rework/open {WO}`. Existing local Production WO -> `ONE_TO_ONE` with same WO, and `Type` unchanged. Existing registered RW -> returned original type. New absent WO -> BE `RW_BULK_MODEL_REQUIRED`; ask for operator ModelNO and explicit confirmation, then `POST /rework/open {WO,ModelNO}`. Config must exist; never blindly create a WO from SAP or call `validate?is_rework=true` (Phase B deliberately rejects). Legacy RW `Type=Rework` without registry is ambiguous and remains blocked.

**Rework Workbench:** `GET /rework/details/{wo}` renders `InputBatches`, `OutputBatchesReworked`, `RawMaterials`, CompletedQty, InputQty, ReworkedAllocated/Available and status. Full-batch add uses explicit irreversible confirm then `POST /rework/add-input {WO,Batch,Actor?}` and refreshes details. BE verifies ONE_TO_ONE Born_by_WO and no prior consumption, atomically freezes the whole original Batch; FE does not change SQL or allow partial. RAW uses existing `POST /validation/logRawMaterial {WO,RawMaterial}` with PN;QTY;UOM;Serial format, unchanged RAW rules. If `data.Code=RAW_REMAINDER_REQUIRED`, FE displays previous WO, qty, UOM and asks explicit remainder confirmation; calls `POST /validation/transferRawMaterial {WO,RawMaterial,RemainingQTY,PreviousUsageID}`. `POST /rework/progress {WO,CompletedQty,Actor?}` is monotonic **cumulative integer** <= InputQty; not a delta. `POST /rework/complete|reopen {WO,Actor?}` only on explicit confirmation. BE requires fully allocated RW quantity before `complete`. No delete/unfreeze action. Refresh after successful writes.

**Inhouse Allocation:** `GET /allocation/status/{wo}` returns card array including `isFrozen` and `isReworkedOutput`. `GET /allocation/balance/{wo}` returns `ProducedOK`, `Allocated`, `WaitAllocate`, `Reworked`, `ReworkedAllocated`, `ReworkedWaitAllocate`, `HasRework`, `RW_Type`. Both reads must succeed before generating Batch, otherwise generate is disabled. The first three metrics are **NORMAL historical** counts, including originally allocated FROZEN labels. `Reworked` is the RW completion pool, not extra QTY_OK; NEVER add it to normal Produced. UI shows fourth metric only when HasRework. Toggle source NORMAL or REWORK and pass `Source` to existing `POST /allocation/generate` (default NORMAL for legacy FE). Auto split and single smaller manual allocation are preserved. Cards shown under their respective source; FROZEN normal cards are struck through, cannot be verified/printed/deleted in UI; BE enforces guards. RW output cannot be deleted by legacy recall API. Label TXT remains six fields and normal Current PN + Process + Next Process routing logic unchanged. For NEW print, BE `print_batches` success is now required **before** FE creates TXT; test browser download separately.

**Bulk RW Allocation entry:** `AllocationView` reads `GET /rework/details/{wo}` first; **only if `RW_Type=BULK` registry exists** and every Input Batch has a single non-empty PartNO, FE opens allocator with WO and inferred PN without calling SAP validation. All other WOs still use existing `validateWorkOrder(wo,true,false)`. This is required because new Bulk RW WO is intentionally absent from SAP; it does not grant a general SAP bypass. No direct BE change.

**Traceability:** Phase B `build_wo_tree` has `HasRework`, `ReworkType` and `IsReworkRoot`. A node with HasRework receives a purple RW 1-1/BULK clickable mark. 1-1 remains ONE normal WO node. BULK has no ancestors displayed (BE rule), but `GET /rework/details/{wo}` shows saved Input / Output batches for audit. New RWDetailsTables presents FROZEN inputs struck through and active RW output; allows CSV export of input/output rows. Existing `Batches`, `Materials`, `Defects` panels unaffected.

## Errors / operational safety

- All backend writes return `{success, message, data}`. HTTP 200 can encode `success:false`; never equate HTTP success with business success.
- Server remains authority for FROZEN, consumption, PN matching, quantities, application locks and concurrency. UI validation is for usability, not business integrity.
- Disallow operation when RW is COMPLETED, unless operator explicitly reopens. A material already assigned to another WO must use the remainder transfer path, which updates original usage history.
- V0002 forbids partial RW, reusing frozen originals, mixed-PN Bulk output, and automatic reclaim of Batch already consumed by downstream production. UI cannot override. Backend does not implement explicit Scrap / QA approval in this phase.
- Backend Phase B enforces freezes on audited API paths, **not direct SQL writers or every possible 3rd-party integration**. Confirm other input paths before production deployment.
- The new Bulk RW allocation entry does not ensure print-route correctness if routing is missing. Existing manual NEXT PROCESS fallback still applies; operator must verify the print template.

## Regression checklist (Dev only; no live SQL transaction test performed by agent)

1. Production still validates a SAP WO, leaves existing Assembly/Packing rendering unchanged; clicking Rework opens original WO and does not modify WO Type.
2. Unknown WO prompts ModelNO **after** BE returns BULK required; confirmed creation succeeds; repeated scan reopens as BULK without repeating model confirmation.
3. Scan input whole Batch: warning, Backend freezes; repeated, alien and consumed Batch reject; frozen displayed struck-through and blocked from verify/print/delete.
4. RAW new label PN;QTY;UOM;Serial saves; reused serial prompts remainder transfer with previous UsageID; nonconfigured UOM rejects.
5. CompletedQty update from 100 to 180 yields total 180 (not +180); decrease or exceed input fails; Complete requires fully allocated RW.
6. Inhouse Allocation ordinary SAP WO unchanged; Bulk registry WO with one PN enters despite no SAP; invalid or unregistered WO never bypasses SAP.
7. Produced/Allocated/WaitAllocate match Phase B balance; Reworked separate; NORMAL and REWORK generate separate rows with Source passed to BE.
8. Mixed FROZEN and active cards: display old frozen history, never generate active label from frozen; no printed TXT on backend rejection.
9. Trace tree: RW 1-1 marked without extra WO; Bulk mark on root, no upstream tree, detail still shows original Input Batches and RW Outputs, CSV export.
10. Run npm build/lint against real FE repo, verify both browser scanner and keyboard. Browser/backend SQL runtime tests still pending and must be performed before operators use RW.

## Deployment / rollback

`python ../Interplex_MES_FE/IPTH_MES2_RW_PhaseC_Frontend_Updater.py --scan` then `--apply`. Stop FE dev/build and clear stale browser bundle after success; rebuild FE normally, run BE Phase B and verify V0002. The updater is code+MD only; `--rollback` restores *only exact file bytes* when current hashes match patch and does not undo RW data or SQL. Stop operators if any RW data committed before restoring earlier FE; never treat code rollback as data rollback.
