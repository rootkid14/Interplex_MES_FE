# MES2 RW — questions requiring explicit resolution before Phase A/B

*The business rules in `RW_RULES_LOCKED.md` are accepted. These are implementation constraints or remaining decisions, not grounds to change accepted workflow silently.*

1. **Bulk WO creation:** `validate_work_order()` currently requires a SAP WO. Will BULK RW WO exist in SAP, or is creation purely MES-local? What model/PN/WCtr does the new WO inherit or select?
2. **ONE_TO_ONE input ownership:** Should `Born_by_WO == WO` be the sole test, or is current consumption ownership required as well? What if a batch has already moved to downstream WO?
3. **Frozen input with existing downstream use:** Reject and require manual recall, or support an explicit administrative recall? No automatic historical deletion.
4. **RW quantity accumulation:** Which operation records actual `CompletedQty` and how is the max bounded by sum of input batch QTY? May production enter output across multiple shifts and allocate across separate sessions?
5. **RW output part number:** In ONE_TO_ONE likely WO model; in BULK outputs from mixed PN — how choose product PN/target routing? Need explicit user selection/validation.
6. **Scrap/NG:** If 100 PCS are frozen, and only 90 recovered, 10 remain pending/scrap; who marks the difference and at what time? Don't treat it as new inventory.
7. **Label already consumed downstream:** How to block legacy scanned labels in production, packing and warehouse with consistent API guard? Identify all API entry points via audit.
8. **Traceability roots:** Both forward and reverse graph endpoints need bulk-stop semantics. Should `ReverseTrace` starting at an earlier WO include an edge to Bulk RW from audit only? Default proposal: no, because bulk input is not a production edge.
9. **RW mark indicator:** How should a WO with several RW cases show counts and details in one modal? Suggested cumulative view with per-case expansion.
10. **Data reset policy:** Legacy Lambda MES data will be cleared before go-live, but customer `IPTH_*` tables must remain intact. Cleanup SQL separate, never bundled into Phase A DDL.
11. **Versioning:** Check exact source after RAW Phase B/C and schema V0001, because source audit snapshot predates these code changes.
