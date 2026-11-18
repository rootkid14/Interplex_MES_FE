# Batch QC Hold, exact Batch Trace, CSV & numeric safety

## State machine

`IsFrozen=1` means irreversible RW retired Batch; cannot be released with QC tools.
`IsQCHeld=1` means reversible QC hold; release resets only IsQCHeld/QCHeldAtUTC.
Consume/verify/print requires both 0. SQL catalog migration `V0003__qc_batch_hold` creates hold fields and `MES_BatchHoldAudit` history.

## Key endpoints

- GET /api/v1/qc-batch/status/{batch_code}
- POST /api/v1/qc-batch/change {Batch,Hold,Reason,ActorID,Password}
- GET /api/v1/tracebility/tracebybatch/{batch_code}

## Database

`MES_BatchHoldAudit` columns: ID, BatchID, Action, ActorID, ActorName, ActorRole, ActorDept, Reason, PreviousHeld, NewHeld, CreatedAtUTC. `Batches_Master.IsQCHeld` default 0; `QCHeldAtUTC` null unless held.

## Tests

V0003 SQL VERIFY, nonexistent batch, wrong credentials, unauthorized user, two concurrent changes, consumption while held, print/reprint while held, RW freeze cannot be undone; input method wheel and arrow increments, decimal text scan entry, CSV fidelity and formula escape, unrelated WO trace unaffected.


## QC Hold Workspace UI v1.1 (2026-11-11)

Navigation: existing `/qc-batch-hold` route in `src/App.jsx`, QC/IT menu in Sidebar.
`BatchHoldView.jsx` now renders a full viewport dark workspace with two responsive panels:
left = scanner, Batch details, mandatory reason and password, HOLD/UNHOLD, audit;
right = password-protected current QC Hold list, search (Batch/PartNO/Born WO),
20-row paged table, timestamp, row selection and refresh after mutations.
Local CSS `BatchHoldWorkspace.css` is scoped to `.qchw-workspace` to avoid affecting other screens
and to avoid an unstyled/white root even if the surrounding route does not set a background.

Backend `POST /api/v1/qc-batch/held-list` uses `{ActorID,Password,Keyword,Page,PageSize}`.
Every call rechecks the actor password and QC/IT role on the server. Results contain only
`IsQCHeld=1` records, and exclude permanently `IsFrozen` from any release operation.
Page size defaults to 20 and caps at 100. Sorting: hold timestamp descending, Batch ID descending.
No new DDL; requires existing V0003 and Phase B/V0002 already deployed.

Security caveat: existing MES login is client-side persisted identity without a signed session.
This UI retains the supplied password in memory ONLY while this component is mounted so list
pagination and per-operation reauthentication work. It never stores the password in localStorage.
Use HTTPS. A server-issued short-lived session token should replace password-on-each-call later.
`GET /qc-batch/status/{batch_code}` preexists and is unchanged; its read authorization remains
outside this UI-only hotfix's scope. This release is not a security certification.

Validation targets: V0003 VERIFY PASS, endpoint `held-list` 401 on wrong password and 403 for
non QC/IT, HOLD adds exactly one row, UNHOLD removes it, page navigation, filter, another
workstation's changes reflected on manual refresh, permanent RW IsFrozen never cleared.


## QC Hold Workspace UI v1.2 — Advanced filters and CSV export (2026-11-11)

- `Currently Held Batches` gains server-side filters: SearchBy (ALL/BATCH/PARTNO/WO),
  Keyword (literal substring), Scope (ALL/QC_ONLY/RW_FROZEN), UTC HoldFrom/HoldTo (inclusive),
  Sort (NEWEST/OLDEST/BATCH). Existing 20-row pagination remains. Use Apply to make filters active;
  Clear restores all held records. CSV export is disabled when unapplied draft filters differ.
- `POST /api/v1/qc-batch/held-list` accepts above optional filters as well as credentials and paging.
  It returns only IsQCHeld=1 rows. All filter values are SQL parameters, and ORDER BY uses a constant allowlist.
- `POST /api/v1/qc-batch/held-export` accepts the same filters and QC/IT credentials.
  It streams every matching held record in a UTF-8 BOM CSV, independent of the current page.
  Columns: Batch ID, Part Number, Born WO, QTY, Hold Since (UTC), QC Status,
  RW Frozen, Held By (latest HOLD audit actor), Hold Reason (latest HOLD audit reason).
  Formula-like text values are prefixed with an apostrophe to mitigate CSV spreadsheet formula injection.
- Authorization: both endpoints verify QC/IT actor/password per request. No credentials in URLs or CSV.
  FE password remains in component memory only. Use HTTPS; long-term fix is signed auth sessions.
- There is no new SQL/DDL. Reuses V0003 (`IsQCHeld`, `QCHeldAtUTC`, `MES_BatchHoldAudit`),
  and NEVER changes permanent `IsFrozen` or Hold/Unhold transaction semantics.
- Export is a live database query at click time. If other workstations change Hold states after
  list refresh, CSV can differ from the previously displayed Total; refresh to reconcile.
- Validation: test scoped filters; date boundaries; literal `%`, `_`, `[`, `\`; CSV all matching
  pages, filename, BOM/columns, formula escape; 401/403 rejection; zero matches; QC only scope;
  RW FROZEN never released; two workstation update after refresh.


## v1.3 — Bulk QC Unhold

- Supported selection: explicit Batch checkboxes (across pages) OR all matching the *applied* server-side filters.
- Full-filter mode requires a keyword or UTC hold-date bound. Limit **500 matched rows per operation**, including RW Frozen.
- APIs: `POST /qc-batch/bulk-unhold/preview`, `/qc-batch/bulk-unhold/apply`.
- Each endpoint reauthenticates the QC/IT operator. Preview provides count and data fingerprint; apply rejects expired (>120s) or stale preview and re-reads with `UPDLOCK, HOLDLOCK`.
- SQL transaction is all-or-nothing: clear `IsQCHeld`, null `QCHeldAtUTC`, append one `UNHOLD` row to `MES_BatchHoldAudit` for each changed Batch. Never touch `IsFrozen`.
- RW Frozen batches may match filters but are skipped with an explicit count. Only selected rows are eligible for explicit selection.
- **Warning:** The existing MES password login is not backed by a signed session; use HTTPS, review access controls, and do not expose API directly to the internet.
- No SQL migration; requires QC Hold V0003 and v1.2 schema/code.
