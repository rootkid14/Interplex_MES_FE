# Outsource Allocator — crucial current-PN rule

**Owner:** `Interplex_MES_FE/src/components/production/FrameOutSourceAllocator.jsx`; `src/api/workstationApi.js`; `src/utils/allocatorRoutingV4.js`; backend `routing_modes_api.py` and `batchallocation.py`.

## Business contract (corrected in v4.1)

| Label field | Where to obtain it |
| --- | --- |
| `CURRENT_PN` | **`New Part Number (Sau Outsource)`** entered/shown in Outsource FE |
| `CURRENT_PROCESS` | Literal `Outsource` |
| `TARGET_PN` | FERT candidates from that **new** PN; first is selected by default |
| `NEXT_PROCESS` | Process of step immediately after that new current PN in chosen target route |
| `NEXT_PROCESS` fallback | Manual entry, or `-` if left empty |

**Do not regress to v4.0:** Previous design incorrectly treated `ModelNO → New Part Number` as an immediate BOM transition. The original ModelNO is not used to determine the label's current PN / next routing step.

## API flow

```text
New Part Number (Sau Outsource)
    → GET /api/v1/bom/routing/candidates/by-pn/{start_pn}
    → select Target PN (first by default)
    → POST /api/v1/bom/routing/resolve-by-pn
       { "start_pn": "<New PN>", "target_pn": "<selected FERT>" }
    → find current PN in routingPath.Components; read NEXT step Process
```

The separate `/routing/transition` endpoint remains in backend for other callers; do not use it for this workflow unless requirements change.

## Failure conditions

- Missing New PN; no candidate FERT; unknown / bad route; current PN missing; multiple occurrences; stale response after PN edit. Every such case must permit manual Next Process and print `-` on blank.

## Regression test examples

- New PN `NVI0241701011IPO` → target `PGA24170100S3`: next `Assembly; Checking Dimension & Flatness` in supplied sample.
- New PN at Assembly level (`NVI0241701001A1O`) → next expected `packing` on suitable FERT.
- `CURRENT_PROCESS` remains `Outsource` regardless of reconstructed operations.
