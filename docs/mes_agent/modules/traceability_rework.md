# RW Mark and Traceability Detail (MES2 Phase C)

Owner: `src/components/traceability/TraceabilityView.jsx` + shared `src/components/rework/RWDetailsTables.jsx`; backend `app/api/v1/endpoints/traceability.py` and `/rework/details/{wo}` from Phase B. FE baseline `IPTH_Source_20261111_043112Z.zip`; backend was pinned to Phase B after-snapshot.

- `HasRework` determines clickable RW mark for a WO, independent of legacy `node.Type === 'Rework'` styling. `ReworkType` displays `ONE_TO_ONE` vs `BULK`.
- ONE_TO_ONE remains original Production WO; mark opens read-only Input and Output Batches without duplicating branch.
- BULK ancestor traversal stops at its RW WO node, making it a genealogy root; its historical input sources are not deleted. RW mark opens original input/output evidence. A user may manually look up an input Batch's source elsewhere.
- Mark click calls `GET /api/v1/rework/details/{wo}`; response data includes `InputBatches[{Batch,PartNO,InputQty,IsFrozen}]`, `OutputBatchesReworked[{Batch,PartNO,QTY,IsFrozen}]`, `RawMaterials`, `CompletedQty` and balances. UI renders original Batch struck through if frozen. CSV export contains two record types, `INPUT` and `OUTPUT_REWORKED`.
- Existing Batches, Materials, Defects, reverse graph and source tree renderers are preserved. No direct SQL, FE never traverses Bulk antecedents.
- Reject test: missing registry returns response success=false and shows error rather than inventing RW details. Ensure all field names match installed Phase B backend.
