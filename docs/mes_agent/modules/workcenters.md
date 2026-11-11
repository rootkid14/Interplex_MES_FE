# WorkCenter_Master and job station selection

**Verified:** `WoValidation.py` lines containing `getWorkCenters` and `setWCTR`, plus `WctrSelectionModal.jsx` upload.

```text
SQL Server WorkCenter_Master(StationType, LineCode, ID)
     → GET /api/v1/validation/getWorkCenters
     → [{"station": "CNC", "lines": ["C-01", ...]}, ...]
     → WctrSelectionModal.jsx
        select StationType; searchable list of LineCode
     → POST /api/v1/validation/setWCTR
     → Master_WO_Log.WCtr = selected LineCode
```

- The dropdown is dynamically populated **each time the modal opens**; new StationTypes (`NCT`, `Molding`) appear when they exist in the database used by BE. No hardcoded FE list in supplied modal.
- Initial station selection prefers match to `woData.WC_Type` (which is derived from model configuration/type); unmatched fallback picks first group.
- Modal currently lets user type line code directly; `handleConfirm` checks nonblank, not strict membership in selected station lines.
- BE stores the LineCode string, **not** the ID. Still do not assume other tables never reference WorkCenter IDs.
- The customer provided `MC-LINE list.xlsx` as a replacement master list (166 unique `(StationType,LineCode)` pairs after deduplicating `Stamping/M156`). The exact DB current rows must be re-queried; don't infer success from old screenshots.

## Change / test checklist

- Back up SQL Server before bulk replacing Workcenter rows; check existing FK and history references.
- Query `SELECT StationType, LineCode FROM dbo.WorkCenter_Master ORDER BY ...` and verify `/getWorkCenters` returns same. Confirm correct DB target.
- Confirm default station selection and line assignment for `NCT`, `Molding`; check duplicate LineCodes across different StationTypes.
