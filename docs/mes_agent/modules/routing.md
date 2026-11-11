# Routing subsystem — API and rules

**Verified against:** `routing_modes_api.py` from the v4.1 updater payload + `app/api/v1/api.py` supplied in v4 source archive. Refer to fresh source before modifying.

## Routes (all below start with `/api/v1/bom`)

| Method | Route | Input | Meaning |
| --- | --- | --- | --- |
| GET | `/routing/candidates/{job_no}` | scanned JOB | Query SAP `Model` as start PN; return sorted FERT candidates. |
| GET | `/routing/candidates/by-pn/{start_pn}` | explicit current PN | Outsource downstream target discovery. |
| POST | `/routing/resolve-by-pn` | `{ "start_pn": "...", "target_pn": "..." }` | Resolve one FERT route from explicit current PN. |
| POST | `/routing/resolve` | `{ "job_no": "...", "mode": "manual", "target_pn": "...", "issue_trucking_no": false, "force_regenerate": false }` | Resolve JOB → one FERT route; legacy Auto mode still exists but Allocator uses target selection. |
| POST | `/routing/transition` | `{ "current_pn": "...", "next_pn": "..." }` | Older immediate-transition helper; **not** the v4.1 Outsource workflow. |

Route registration lives in `Interplex_MES_BE/app/api/v1/api.py`. FE routes are composed by `workstationApi.js`, Axios baseURL `/api/v1`.

## Data and algorithm assumptions

- `IPTH_Tbl_Job_Master_SAP`: map JOB → SAP `Model`.
- `IPTH_BOM_LIST`: flattened BOM. Candidate roots are active FERT (`MaterialType = FERT`, `Level = 0`) whose tree contains start PN (`Component` at `Level > 0`).
- Each FERT route is reconstructed from `IDBOM`, hierarchy `Level`, `Component`, `Op`, `OPDesc`, `Workcenter`. Respect ambiguous BOM rejection; don't silently choose another branch.
- `RoutingConfigs` holds saved routing keyed by START_PN / END_PN. In `/routing/resolve`, manual mode can use saved route unless `force_regenerate` is true; explicit `/resolve-by-pn` returns generated route.
- `issue_trucking_no` must remain false for preview and Allocator; issuing a trucking number is a distinct stateful operation.
- `candidateEndPns` are sorted by the SQL query; **defaulting to first candidate is a UI behavior**, not correctness proof that it is the business-preferred finished good.

## Response shape

```json
{
  "success": true,
  "startComponent": "NVI0241701011IPO",
  "targetProduct": "PGA24170100S3",
  "routingPath": [
    {"StepNo": 1, "Process": "Mattin plating +Nikel plating; Hipot testing 2", "Components": ["NVI0241701011IPO"], "TargetParent": "NVI0241701001A1O"},
    {"StepNo": 2, "Process": "Assembly; Checking Dimension & Flatness", "Components": ["NVI0241701001A1O"], "TargetParent": "PGA24170100S3"},
    {"StepNo": 3, "Process": "packing", "Components": ["PGA24170100S3"], "TargetParent": "Finished Good"}
  ]
}
```

These are **sample** values from the user's test JOB `777777`, not defaults or an invariant.

## Risk / test checklist

- JOB lookup not found; target list empty; ambiguous BOM; target PN not valid; current PN absent in routing; duplicated in multiple steps; route has no next step (`Finished Good`).
- Change target while resolve pending; ensure stale async response is ignored and printed label reflects latest PN.
- Outsource start PN is `New Part Number`, not original ModelNo.
- Verify no Trucking Number is issued during previews.
