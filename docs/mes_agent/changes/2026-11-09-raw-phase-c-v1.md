# MES2 RAW Phase C — Scanner / Serial / Remainder (2026-11-09)

- Migrates RAW runtime reads and writes from legacy `Raw_Materials_Master` / `RawMaterialLog` to V0001's `RawMaterialLots` and `RawMaterialUsage`.
- Enforces strict `PN;QTY;UOM;SERIAL`, validates configured UOM from ModelConfig, handles duplicate and stale remainder transfer with per-lot SQL Server transaction lock.
- Makes shared FE scan/remainder UI available in Machining, Assembly and Assy Packing Master; keeps Batch logic unchanged.
- Extends Traceability and read-only DB browser with the V0001 RAW tables.
- Rejects RAW-only non-PCS Packing output calculations lacking approved PCS capacity conversion (fail-closed).
- **No new SQL files / schema changes.** Requires V0001 verified and Phase B configs re-saved.
- `--scan` performs static source + readonly SQL V0001 compatibility checks; `--apply` only modifies FE/BE source and Markdown. No SQL write or automatic migration.
- Not production-certified: physical scanner integration, customer DB and end-to-end SQL Server transaction/concurrency tests require on-site validation.
