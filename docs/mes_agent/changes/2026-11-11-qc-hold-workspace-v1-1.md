# MES2 QC Batch Hold Workspace — UI hotfix v1.1 (2026-11-11)

## Motivation

Previous V1 UI had a centered `max-w-4xl` single-card form. Direct route lacked a full-page
background; empty surrounding viewport could be white. No server endpoint existed to list
QC-held Batches, so QC operators couldn't see current holds.

## Scope (FE/BE code, no SQL)

- Replace QC Hold single-card page with a dark 2-column workspace (35% actions, 65% held list),
  responsive stacking on narrow screens.
- Left: scan/lookup Batch, current status, reason, password verification, Hold/Unhold,
  consumption warning, recent audit. RW FROZEN cannot be released.
- Right: paged `IsQCHeld=1` list, search by Batch/PN/Born WO, select row, refresh, live refresh
  following a successful Hold/Unhold. 20 rows/page.
- Backend `POST /api/v1/qc-batch/held-list` requires QC/IT actor ID and password on each read;
  server enforces role, queries current DB state, uses SQL Server-compatible `ROW_NUMBER` paging.
- Existing `GET /status` and `POST /change` remain unchanged; no schema/data migration.
- Local CSS scoped to `.qchw-workspace` to prevent style changes on other modules.

## Dependencies / safeguards

- Utilities V1 installed unchanged; V0003 SQL manually applied and verified by operator.
- Only `IsQCHeld` is reversible. `IsFrozen` (RW) stays permanent; this release never updates it.
- No signed MES auth session currently. Password is held in ephemeral component memory, no
  browser persistence. HTTPS is required; stronger token-based auth is future work.
- `--scan` / `--apply` / `--rollback` verify SHA256 and branch phase2 before changing files.

## Test checklist

1. Open workspace: dark full-viewport background, two responsive panels, no white inputs.
2. Sign in as QC, enter password, click search in held list; wrong password -> 401.
3. Hold a clean Batch: appears on right after refresh; selecting row loads details.
4. Unhold with mandatory reason: disappears from currently-held list, audit retained.
5. IT can Hold/Unhold; non-QC/IT denied (403 at backend even if FE forged).
6. RW `IsFrozen=1` cannot be Unhold; both flags preserved correctly.
7. Search, page next/prev, reload after another workstation changes Hold state.
8. Check no regression to Allocation/Production/Traceability.

## Test limitations

Offline validation covers Python/JS parsing, updater lifecycle, and source consistency.
Real SQL Server integration, HTTPS security and real browser QA are pending.
