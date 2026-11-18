# Module map — Disk-Based WO / Message transition

| Module | Change | Preserved behavior |
|---|---|---|
| `endpoints/WoValidation.py` | Remove WO `.with_hint` and `UPDATE ... WITH (SNAPSHOT)` | WO validation, production status and quantities |
| `endpoints/batchallocation.py` | Remove WO hints | normal/rework allocation, verify/print |
| `endpoints/dashboardstreaming.py` | Remove WO + Message hints | SSE dashboard and message acknowledgment |
| `endpoints/db_engine.py` | Do not inject hint on Admin database query | dynamic query filters and pagination |
| `endpoints/logPacking.py` | Remove WO update hint | packing log |
| `endpoints/packing_master.py` | Remove WO update hints | packing service |
| `endpoints/smart_repair.py` | Remove WO read/delete hints | smart repair |
| `endpoints/traceability.py` | Remove WO read hints | WO / BOX / Product / Batch trace |
| `services/assy_packing_linkage_service.py` | Remove WO read hint | linkage validation |
| `services/log_cleaner.py` | Stop invalid message cleanup; no snapshot branch | DefectsLog and BOM queue retention |
| `services/raw_material_service.py` | Remove WO read hint | RAW lot scanning/transfer |
| `services/rework_service.py` | Remove WO read hint | one-to-one and bulk RW |

Source baseline and hashes are embedded in the updater. Run runtime `--scan`
to refuse unknown changes, and use `--verify` to check deployed bytes.

**Do not** convert the deleted hints to `NOLOCK`; do not rewrite historical SQL.
**No schema changes** belong to this updater.
