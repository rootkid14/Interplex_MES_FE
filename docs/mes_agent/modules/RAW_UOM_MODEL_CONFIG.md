# MES2 — RAW Material Unit in Model Scan Rules (Phase B)

Status: **code patch prepared, not live-verified**. Source provenance: `IPTH_Source_20261107_033151Z.zip` (FE/BE files collected on 2026-11-07). Release: `MES2_RAW_UOM_PHASE_B_v1_20261109`.

## Why

`IPTH_BOM_LIST.Unit` (SQL `NCHAR(10)`) already exists and is exposed by `GET /api/v1/bom/lazy/{parent_material}`. `ModelConfigStore.parseMasterRoutingToRules()` previously dropped this field from `rawMaterials`, so production rules had no UOM context.

## New behavior (Model Configuration only)

- At load, normalize each active `RAW_QTY` node's `Unit` using trim + uppercase; store it as `expected_uom` in FE `configRules`.
- Display a **read-only** `UOM from BOM` label beside the Raw rule; the reviewer screen shows `UOM` next to each RAW PN.
- On editing saved configurations, re-read Unit from the loaded BOM, surface changes, and require operator confirmation before continuing.
- When a RAW rule is enabled, fill `expected_uom` from the selected BOM node. When a HALF-assembly BOM is lazy-loaded, hydrate its RAW rules as well.
- Before `Generate` / `Save`, reject empty Unit, duplicate PN with incompatible Units, and RAW rules not backed by a visible BOM node.
- Generate `ModelConfigs.JsonData.rawMaterials[]` entries `{partNumber, fixedString, expected_uom, bom_id}`. `ModelConfigs.routingData.compactRules[PN]` includes `{scanType:'RAW_QTY', expected_uom, IDBOM, ...}`. No schema migration is necessary because these are existing JSON columns.
- On `PUT /api/v1/models/{modelNo}`, BE rechecks each RAW rule's IDBOM/PN/Unit against `dbo.IPTH_BOM_LIST` and rejects missing/conflicting UOM (HTTP 422). This is a **save-time** check, not scanner runtime enforcement.

## UOM source of truth

`IPTH_BOM_LIST.Unit` is read-only; do not introduce a separate UOM catalog or auto-convert units. `NCHAR` whitespace is trimmed; comparison is case-insensitive (normalized uppercase). Conflicting Units for the same RAW PN in one configured tree **must be resolved in BOM** before save.

## Important limits / next release

**This Phase B patch does not alter** `FrameMachiningProc.jsx`, `FrameAssemblyProc.jsx`, `FrameAssyPackingMaster.jsx`, `/logRawMaterial`, or the two V0001 RAW tables. Those production scanners still have the legacy/manual quantity workflow and **do not yet enforce the UOM at scan time**. Do not treat this update as completion of `PN;QTY;UOM;SERIAL` traceability. Runtime parsing, serial identity, duplicate handling, Decimal quantities, remainder transfer, and production result display are Phase C.

Legacy Model configs containing RAW rules without `expected_uom` must be opened in **Routing & Scan Configurator** and re-generated before editing/saving via the new backend validation. Direct editing with the separate legacy `ModelConfig.jsx` editor may be rejected until synchronized.

## Components

- FE: `src/store/ModelConfigStore.js` (`fetchConfigOrBom`, `lazyLoadHalb`, `enableScanning`, `parseMasterRoutingToRules`, `saveConfig`).
- FE: `src/pages/BomConfig.jsx` (Raw UOM label, Review modal, Generate/Save checks).
- BE: `app/api/v1/endpoints/modelconfigs.py` (`validate_raw_uom_rules`, `PUT /{modelNo}`).
- BOM: `app/api/v1/endpoints/bom.py` (`get_lazy_bom`, already returns `Unit`, no modification).

## Regression checklist

1. Load a valid ROH with `Unit='KG        '` and save: `expected_uom='KG'`, same `bom_id`/IDBOM, backend accepts.
2. UOM blank/missing: Generate rejects.
3. Same RAW PN occurs twice under one model with inconsistent Unit: Generate rejects.
4. Change BOM Unit after loading a saved config: FE warns, backend rejects stale config if submitted unchanged.
5. Save a RAW rule with forged PN, IDBOM or UOM via API: 422.
6. Save a non-RAW model: existing config flow continues unchanged.
7. Load an expanded HALB and verify its RAW children receive Unit.
8. Verify three production scanners are untouched in this release.

## Deployment

Run updater from BE; `--scan` is read-only and checks source hashes, FE/BE dependencies and SQL metadata; `--apply` only changes source + Markdown, no SQL is executed. Restart BE; rebuild/redeploy FE. No V0001 SQL needs rerunning.
