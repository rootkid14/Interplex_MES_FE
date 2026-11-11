# MES2 QC Hold Workspace v1.2 — Advanced Search and Export CSV

Date: 2026-11-11. Scope: UI + existing QC Hold API only. Requires Utilities V1 + QC Workspace v1.1 and SQL V0003 VERIFY PASS.

## Changes

- Right panel `Currently Held Batches`: search field (all/Batch/PN/WO), keyword, QC/RW status filter,
  held date range UTC, sort newest/oldest/Batch, Apply and Clear buttons.
- Search is server-side and persists across 20-row pagination and refresh.
- Export CSV fetches *all* current rows matching applied filters (not one page) through a protected API.
  Includes last HOLD actor and reason from `MES_BatchHoldAudit`. UTF-8 BOM, CSV quoting, spreadsheet formula defense.
- Backend `held-list` expanded with optional query parameters; backward-compatible when omitted.
- New Backend `held-export`, requiring QC/IT password re-authentication per request.
- No SQL change. Does not update or clear irreversible `IsFrozen` or QC Hold itself.

## Developer integration

Files: `app/api/v1/endpoints/qc_batch_hold.py`, `src/api/qcBatchAPI.js`,
`src/components/utilities/BatchHoldView.jsx`, `src/components/utilities/BatchHoldWorkspace.css`.

`held-list` JSON: `{ActorID, Password, Keyword?, SearchBy?, Scope?, HoldFrom?, HoldTo?, Sort?, Page?, PageSize?}`.
`held-export` JSON: same without pagination; `responseType:'blob'` at client. Date strings `YYYY-MM-DD` UTC.
SearchBy: `ALL|BATCH|PARTNO|WO`; Scope: `ALL|QC_ONLY|RW_FROZEN`; Sort: `NEWEST|OLDEST|BATCH`.

API requires V0003 schema. Export opens a new SQLAlchemy session in the streaming generator.
Actor credentials verified before HTTP streaming is returned. Enforce HTTPS at deployment.
The single SQL SELECT is streamed; subsequent DB changes can alter exported inventory.

## Manual Dev acceptance

1. `npm run build`, Backend restart; Verify `POST /qc-batch/held-export` in OpenAPI.
2. Search Batch-only and PN-only; filter Born WO; dates and RW status; test bad date range.
3. Navigate page 2 then Export: CSV must include **all** filter matches, not only page 2.
4. Clear filters => all currently-held batches. 0 results disables export.
5. Wrong password (401) and non-QC/IT (403) rejected for both APIs.
6. Input a literal `%` or `_` barcode and ensure it is not interpreted as wildcard.
7. Verify exported Hold By/Reason correspond to latest HOLD audit, no secret credential columns.
8. HOLD and UNHOLD unaffected; `IsFrozen` remains immutable.

## Limits

Integration tests on actual Dev SQL Server, concurrent changes and real Frontend build are pending.
No signed auth/session system exists in current MES login; credentials are re-verified on every list/export.
