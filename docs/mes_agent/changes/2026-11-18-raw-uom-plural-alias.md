# MES2 RAW — UOM supplier plural alias hotfix (2026-11-18)

## Problem / Bug

BOM / Model Config `expected_uom` contains singular `PC`, `KG`, ... while
supplier barcode `PN;QTY;UOM;SerialNumber` may contain `PCS`, `KGS`.
Both `useRawMaterialFlow.jsx` and `raw_material_service.py` previously rejected
these barcodes via strict equality. This caused valid RAW labels to fail scan.

## Locked behavior

- The **BOM** remains authoritative. Accept the QR UOM only when it equals
  `expected_uom`, or equals exactly `expected_uom + "S"` (only if the BOM unit
  does not already end in `S`). Strip outer whitespace; compare uppercase.
- Do NOT use a raw prefix comparison (`startswith`, `slice` alone). Invalid
  `KGX`, `KGSX`, `PCS123` must remain rejected.
- New RAW lots persist `RawMaterialLots.UOMCode` as the canonical BOM UOM.
  `RawMaterialLots.RawBarcode` preserves original supplier QR unchanged.
  Existing rows with `PCS`/`KGS` remain readable and are accepted for identity
  comparison with `PC`/`KG` in the same PN + serial + quantity context.
- Normalization applies to **both** `/validation/logRawMaterial` and
  `/validation/transferRawMaterial` via shared service validation.
- No qty conversion, rounding, PN relaxation, or scan rule save changes.
- `modelconfigs.py` continues to verify that persisted `expected_uom` equals
  `IPTH_BOM_LIST.Unit` exactly. No database migrations.
- Frontend retains the original RAW string when sending to Backend; Backend
  validates independently and treats original QR as traceability source.

## Examples

| BOM UOM | Barcode UOM | Result | Canonical stored UOM |
| --- | --- | --- | --- |
| PC | PC | ACCEPT | PC |
| PC | PCS | ACCEPT | PC |
| KG | KG | ACCEPT | KG |
| KG | KGS | ACCEPT | KG |
| PC | KG | REJECT | — |
| KG | KGSX | REJECT | — |
| PC | PCS123 | REJECT | — |

## Files changed

- BE `app/services/raw_material_service.py` — canonical unit helper,
  validation of unit, normalization at register/transfer, historical lot
  unit alias match, preserve original barcode.
- FE `src/hooks/useRawMaterialFlow.jsx` — align scan prevalidation.

## Apply / testing

Run from `Interplex_MES_BE`:

```bash
python ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --scan
python ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --self-test
python ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --apply
python ../Interplex_MES_FE/IPTH_MES2_RAW_UOM_PluralAlias_Hotfix_v1.py --verify
```

Restart Backend; rebuild/restart FE (`npm run build`). Test both new RAW
and the *same existing serial* with variant singular/plural QR. Expect an
already-logged/remainder response as normal (not a UOM conflict); no quantity
must be allocated twice. Run tests only with controlled Dev records.

## Compatibility

Updater only accepts the exact verified snapshot of FE RAW hook and either:
1. BE RAW service from 2026-11-16 source audit before disk-based patch; or
2. BE RAW service after Disk-Based Compatibility updater.
Any unexpected source SHA256, or pre-existing output doc, is REJECTED to avoid
clobbering recent user edits. Code only; no database or business-data writes.
Backup is outside repositories; rollback only restores code/docs and does not
undo any RAW lots written while new code was running.
