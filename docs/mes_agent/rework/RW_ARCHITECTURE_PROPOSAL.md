# MES2 — RW architecture proposal (NOT deployed)

**Version:** Phase 0, 2026-11-11. **Status:** Proposal based on accepted business rules and 2026-11-07 source snapshot. Must validate against live audit before SQL design.

## Logical model

```text
Master_WO_Log (existing WO identity)
    1 ────── N  MES_ReworkCases (ONE_TO_ONE | BULK, status, completed cumulative qty)
                      │
                      ├── 1 ─── N MES_ReworkInputs ─── N:1 Batches_Master (existing)
                      └── 1 ─── N MES_ReworkOutputs ── N:1 Batches_Master (new issued batch)

Batches_Master: status for printing remains as is;
new independent validity/lifecycle (ACTIVE | FROZEN), with transition metadata.
```

Names are tentative. A single WO may own multiple RW cases (repeated rework), while a bulk WO must retain `BULK` classification across sessions. The existing WO ID, not a new production WO for ONE_TO_ONE, remains the identifier.

## Critical state transitions

1. User selects Rework → enters WO. Read persistent RW records **before** inferring type. Existing production WO = candidate ONE_TO_ONE; new WO = candidate BULK, subject to defined WO creation policy.
2. User scans full Input Batch(es); check ownership for ONE_TO_ONE; check eligibility and non-frozen state for both types.
3. **Single transaction:** persist RW input association + freeze batch from any downstream reuse. Do not remove batch history.
4. User records **cumulative** successfully reworked quantity, with optimistic version or row locking; maintain audit of updates.
5. Allocation issues new output batches in RW pool, links them to RW case and WO, and decrements unallocated RW qty transactionally.
6. Output batches become normal active batches; may subsequently be reworked again by a new case.

## Important invariants (must become DB/API tests)

- One batch cannot appear as active input of multiple RW cases; already frozen input never returns to ACTIVE.
- New RW output barcodes are globally unique under existing batch uniqueness scope.
- For ONE_TO_ONE, original WO `Type` does not change when initiating RW.
- For BULK, inbound RW input consumption is **not** a production upstream edge in trace graph; retain source IDs in RW audit details.
- Normal vs RW available allocation calculated independently. Frozen input and reworked output must not be double counted.
- `QTY_OK` may be total cumulative production; *do not rewrite it* to make accounting look right without proving current meaning in code.
- The physical quantity input can exceed recovered successful output due scrap/NG; any difference must be classified (remaining, scrap) and not silently lost.

## Planned UX (not implemented)

- **Production:** choose Rework → WO lookup → reuse existing RW type or confirm creation → Input Batches / Additional RAW / Completed cumulative qty.
- **Allocation:** 4th `Reworked` metric + selectable `Normal Production` or `Reworked Output` source, without changing label generation semantics for normal production.
- **Traceability:** RW badge at WO node. Click opens `Input Batches` and `Output Batches (Reworked)`. Bulk RW is a genealogy root even if its RW input records refer to earlier WOs.

## Manual SQL workflow

Phase A after audit will emit numbered `00_PRECHECK.sql`, `01_APPLY.sql`, `02_VERIFY.sql` under `BE/database/sql_updates/V0002__...` **only after checking V0002 is unused**. Customer/developer executes SQL manually; Python updater never runs schema DDL.
