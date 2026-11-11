# Work orders, MES runtime and job validation

**Observed source:** `Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py` and `Interplex_MES_FE/src/api/workstationApi.js` from source archive / uploads.

- `GET /api/v1/validation/validate/{scanned_wo}`: checks SAP job, reads its Model and Model configuration; supports `is_allocation` and `is_rework` query flags. Some production WOs may be resolved to a canonical packing WO through an active Assy/Packing linkage; logic differs for allocation/rework. Do not assume the scanned WO is always the canonical WO.
- Runtime WO data lives in `Master_WO_Log` (e.g. `WO`, `ModelNO`, `Type`, `QTY_Target`, `QTY_OK`, `QTY_NG`, `WCtr`, `Status`).
- `POST /api/v1/validation/setWCTR` writes `Master_WO_Log.WCtr` with a selected **line code**.
- The active frontend store is referenced by `src/store/productionStore.js`; inspect parent workspaces to understand full UI launch and routing conditions.
- This documentation does not claim to enumerate all WO state transitions, permissions or triggers.

## Before changing

Collect `--module workorders` plus owning screen(s); check canonical/alias WO, status = closed, allocation permissions, and Model config dependencies. Never alter user-visible WO mapping by guessing.

<!-- MES2_RW_PHASE_B_V1 -->
## RW ownership (2026-11-11)

RW 1-1 keeps the same WO and existing `Type`. Bulk creates a separate new locally registered WO plus `MES_ReworkJobs.RW_Type=BULK` (no SAP fallback except the dedicated RW/RAW flows). Legacy `/validation/validate/{wo}?is_rework=true` is intentionally blocked; use `/api/v1/rework/open` in FE Phase C. More: `modules/REWORK_PHASE_B.md`.

<!-- MES2_RW_PHASE_C_V1 -->
## Production/Allocation RW entry

`ActiveJobView.jsx` REWORK branch now uses `/rework/open` directly. Existing production WO -> ONE_TO_ONE; never set `Master_WO_Log.Type='Rework'`. New unknown WO needs explicit ModelNO confirmation for BULK; reopens keep stored RW_Type. `AllocationView.jsx` consults `/rework/details/{wo}` and allows SAP bypass **only for RW_Type=BULK registry jobs** with a single input PartNO; other WOs use standard SAP validation. See `modules/REWORK_PHASE_C.md`.
