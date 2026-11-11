# RW Phase 0 Audit — Review, 2026-11-11

From operator-supplied ZIP `IPTH_RW_Phase0_Audit_20261111T015429Z.zip`:

- Verdict PASS; database `IPTHData_Dev` on `ipth_docker` engine `17.0.4055.5`; compatibility level 100.
- 19 current source files inspected, 258 keyword references, SHA256 inventory. **Not a full source archive**.
- `Batches_Master`: `ID BIGINT PK`, `Batch NVARCHAR unique`, `QTY INT`, `Born_by_WO BIGINT`, `Status INT`; no lifecycle freeze columns.
- `Batches_Consumption_Log`: `Batch_ID`, `Used_by_WO`, `Used_QTY INT`, `IsCurrent BIT`; filtered unique index for current consumption, FK to `Batches_Master`.
- `Master_WO_Log`: `WO BIGINT PK`, `Type`, `QTY_OK`, `QTY_Processed`, `QTY_NG`, etc.
- RW tables not found, no metadata issues.

Risks for Phase B: moving old WO type to Rework, normal allocation formula, freezing consumed batch, reverse genealogy, Bulk local WO creation, API accepting frozen batches in all consumers. The keyword scanner reports no `is_rework` anchor in WoValidation despite current extracted source containing it near lines 181/423, so **the keyword count alone must not be treated as proof of absence**.
