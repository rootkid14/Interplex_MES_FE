# Source provenance and verification

## Source materials examined when generating baseline docs

| Snapshot | Status | Primary files |
| --- | --- | --- |
| `ipth_allocator_routing_v4_sources.zip` | Supplied by user and inspected | `FrameBatchAllocator.jsx`, `FrameOutSourceAllocator.jsx`, `workstationApi.js`, `bomAPI.js`, `client.js`, `productionStore.js`, `routing_modes_api.py`, `bom.py`, `batchallocation.py`, `WoValidation.py`, `api.py`, `WoValidationResponse.py` |
| `ipth_allocator_routing_v41_updater.py` | Uploaded updater, payload inspected | v4.1 copies of `routing_modes_api.py`, FE allocator components, `workstationApi.js`, and new `allocatorRoutingV4.js`. **v4.1 payload takes precedence over v4 ZIP for these five files.** |
| `WctrSelectionModal.jsx`, `WoValidation(3).py` | User uploads | Workcenter lookup and WO station assignment |
| `LambdaMES_BatchLabelPrinter_v41.py` | User-visible printer deliverable | TXT parsing, ZPL, UI behavior, not a production EXE checksum |
| SQL script + `MC-LINE list.xlsx` | Provided prior in conversation | Workcenter master replacement project; do not assume current DB contents |

## Known gaps / uncertainty

- No complete current FE and BE Git checkout was supplied; code may have changed after v4.1.
- Database tab FE code and `db_engine.py` full implementation not verified in these materials.
- Current SQL Server DDL, constraints and foreign keys not inspected as a whole.
- Runtime deployment, authz roles, config/secret management and install services not comprehensively inspected.
- No live Zebra/printer testing or Windows EXE binary verification in this document set.

## Agent rule

When new source contradicts these docs: **trust current collected code, describe the discrepancy, update docs in the same updater**. Preserve a clear changelog rather than silently replacing history.
