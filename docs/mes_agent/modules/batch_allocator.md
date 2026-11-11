# Inhouse / Batch Allocator

**Owner:** `Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx`; supporting `src/api/workstationApi.js`, `src/utils/allocatorRoutingV4.js`; backend `app/api/v1/endpoints/batchallocation.py`.

## User-visible flow (v4.1 source snapshot)

1. Open allocation for selected WO. Existing Batch generation/verification/recall/print state remains in this component.
2. Fetch current candidate end product PNs from `getAllocatorTargetCandidates(WO)` → `/bom/routing/candidates/{job_no}`.
3. Show a Target PN combobox. Default to first candidate. Switching target invalidates old route result.
4. Resolve route via `resolveAllocatorRouting(WO, 'manual', selectedTargetPn)` — `manual` here refers to **API target choice**, not Batch quantity creation mode.
5. Extract `Current Process` and next step `Next Process` for allocated PN using `extractAllocatorProcess`.
6. On failed candidate fetch or failed resolve, display a manual Next Process text input. Blank manual value prints `-`; current process prints `-` if unavailable.
7. Export selected labels using **six-field CSV** in a `.txt`, then invoke existing backend batch print status flow.

## Do not confuse these independent modes

- Batch quantity creation mode: Auto divide into lots vs manually size one lot (existing business function).
- Routing destination selection: always a Target PN dropdown (no separate Auto/Manual routing toggle after v4).

## Code/API notes

- `workstationApi.js` is the main FE HTTP facade. `client.js` sets Axios baseURL to `/api/v1`.
- `formatAllocatorLabelRow` must CSV-escape fields with commas/quotes. Do not build raw strings using template literals.
- The print phase should not issue Trucking Numbers.
- Previous releases added a download link for Zebra printer EXE served from FE `public/downloads/LambdaMES_BatchLabelPrinter.exe`. Verify the current FE source before changing it.

## Required regression scenarios

- Empty candidate list; API 404/409/500; resolve with valid JOB `777777` (if test DB available); switching target quickly; manual fallback blank and filled; multiple labels; print/reprint semantics; same Batch and WO before/after patch.
- Never let a resolved process for a previous WO or selected Target PN get printed after state change.

<!-- MES2_RW_PHASE_B_V1 -->
## Reworked Allocation pool (2026-11-11, Backend Phase B)

Backend `/allocation/generate` accepts optional `Source=REWORK` (default NORMAL); new `/allocation/balance/{wo}` exposes separate Reworked counters. Normal `QTY_OK` is not increased by RW progress and frozen original normal labels **still count as historically allocated**. Newly allocated REWORK labels are linked to `MES_ReworkOutputs` and become normal active Batch outputs. Read `modules/REWORK_PHASE_B.md` before integrating new UI; `status/{wo}` now adds frozen flags but preserves the legacy card-list shape. FE Phase C is not yet installed by this updater.

<!-- MES2_RW_PHASE_C_V1 -->
## RW Phase C display, source selection and frozen labels

`FrameBatchAllocator.jsx` requires both `GET /allocation/status/{wo}` and `/allocation/balance/{wo}` to compute counters. The existing three cards use Backend's normal historical values; a fourth Reworked card appears only when `HasRework`. Source selector controls **new** `POST /allocation/generate {Source:"NORMAL"|"REWORK"}`. `REWORK` available = CompletedQty - already allocated RW output; NORMAL remains original QTY_OK - normal allocated (including FROZEN original). Do not sum the pools. Auto split/manual small output still available. Original FROZEN cards remain visible with strike-through but cannot print/verify/recall. Bulk RW scans use registry to get source PN without SAP; ordinary WO validation unchanged. See `modules/REWORK_PHASE_C.md` for tests.
