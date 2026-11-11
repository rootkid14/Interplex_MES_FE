# MES2 RAW UOM Phase B — Release note (2026-11-09)

ID: `MES2_RAW_UOM_PHASE_B_v1_20261109`. Scope: Model Configuration UOM capture and authoritative backend check at config save. Source: `IPTH_Source_20261107_033151Z.zip`.

## Before → after

Before: `rawMaterials` scan rules contained `partNumber`/`fixedString`, without unit; backend accepted `ModelConfigs.JsonData` without checking BOM Unit.

After: FE derives `expected_uom` and `bom_id` from the actual BOM node, shows the unit in Configurator and Review, rejects missing/conflicting units, and backend verifies PN/IDBOM/Unit against `IPTH_BOM_LIST` before saving.

## Files

- FE modified: `src/store/ModelConfigStore.js`, `src/pages/BomConfig.jsx`
- BE modified: `app/api/v1/endpoints/modelconfigs.py`
- FE docs added: `docs/mes_agent/modules/RAW_UOM_MODEL_CONFIG.md`, this release note.
- FE docs appended: `docs/mes_agent/MODULE_INDEX.md`, `docs/mes_agent/CHANGELOG.md`.

## API and schema contract

- No new API. Existing `/api/v1/bom/lazy/{parent_material}` already supplies BOM `Unit`.
- Existing `PUT /api/v1/models/{modelNo}` now validates UOM for active RAW rules. Invalid/missing `expected_uom`, `bom_id`, `IDBOM` or mismatched BOM values yield HTTP 422.
- Existing `ModelConfigs.JsonData` and `routingData` JSON strings store new keys; no SQL DDL.
- No effect on `RawMaterialLots` / `RawMaterialUsage` V0001 and no database migration.

## Compatibility / limitation

Updater hashes based on the 2026-11-07 Collector. If source has changed, `--scan` must REJECT. The patch DOES NOT activate scan-time UOM/Serial/Remainder validation. Production scanners currently use the old API and manual quantity dialog; do not deploy new barcode labels expecting serial tracking until Phase C.

## Test results

Python syntax and JS module syntax checks performed offline; updater scan/apply/rollback tested on source snapshot. Integration with real SQL Server and live FE build NOT yet verified. See `RAW_UOM_MODEL_CONFIG.md` regression list.

## Rollback

Use updater `--rollback` only if its post-patch files are unchanged; otherwise inspect diffs first. Rollback does not undo configs already saved; existing ModelConfigs JSON containing `expected_uom` can coexist with old code, but backup DB before any production configuration migrations.
