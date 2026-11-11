# RW Phase A — Schema & Data Contract

**Status:** designed and packaged; only SQL applied by operator changes the database. Source evidence: RW Phase 0 audit at 2026-11-11 01:54:29 UTC. Audit checked 19 files and required SQL Server objects; it did *not* include full source or business rows. Some current source had already been obtained in the November source collector and RAW Phase C package.

## Object graph

```text
Master_WO_Log (WO PK)
  -> MES_ReworkJobs (RW_ID PK, WO UNIQUE, ONE_TO_ONE | BULK)
      -> MES_ReworkInputs (BatchID UNIQUE -> Batches_Master.ID)
      -> MES_ReworkOutputs (BatchID UNIQUE -> Batches_Master.ID)
Batches_Master.IsFrozen + FrozenAtUTC  # independently of print Status
```

**One RW header per WO** for current scope; opening an existing BULK RW WO must reuse header type, not reinterpret as ONE_TO_ONE. An individual output batch can later become an input to a *new* RW operation if not frozen; the input uniqueness prevents repeated enrollment of the same batch forever.

ONE_TO_ONE: Production WO exists and remains normal; Batch input `Born_by_WO == RW.WO` (plus downstream checks at runtime). BULK: create local WO with appropriate validated ModelNO/PN; tracer stops upstream traversal at this WO, but `MES_ReworkInputs` retain evidence of source input batches.

The new tables do not compute `Produced/Allocated/Wait Allocate` for the existing FE. Phase B must alter allocation formula; do not expose RW allocation before that code is deployed. Case-level input-output mapping is many-to-many *through RW_ID only*; if an exact per-unit or per-output genealogy is later required, add explicit links in a new SQL release.

**No auto migration:** FE-updater `--scan`/`--apply` only installs SQL and docs; operator runs 00→01→02 independently.


[MES2_RW_V0002_SQL_COMPILE_ERRATUM_20261111] SQL erratum: corrected APPLY binds IsFrozen/FrozenAtUTC after they are added; use 03_DIAGNOSE_STATE.sql before retry; PRECHECK and schema design unchanged.

[MES2_RW_V0002_MEMORY_OPTIMIZED_FK_ERRATUM_20261111] RW header WO is a logical reference: Master_WO_Log is memory-optimized on audited Dev; SQL Server 10778 prohibits disk-to-memory FK. Backend Phase B must validate WO, whereas 4 other FKs stay enforced.

<!-- MES2_RW_PHASE_B_V1 -->
**Backend Phase B contract:** source code consumes V0002 schema without further SQL changes. `Master_WO_Log` is memory optimized and has no RW FK; `/rework/open` must validate or create the corresponding WO transactionally. `Batches_Master.Status` remains print workflow, independent from `IsFrozen`. See `modules/REWORK_PHASE_B.md`.
