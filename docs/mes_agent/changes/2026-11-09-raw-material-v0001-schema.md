# 2026-11-09 — MES2 RAW Material database V0001

- **Release type:** Manual SQL package; self-contained code updater copies SQL/doc files only.
- **New DB objects (operator action, NOT automatically created):** `dbo.RawMaterialLots`, `dbo.RawMaterialUsage`.
- **Schema choices:** `DECIMAL(18,4)` for all RAW quantities, text Serial, one active WO per lot, unique `(PN,Serial)`, history chain with same-lot FK.
- **UOM:** No lookup table. Future Scan Rule config reads `IPTH_BOM_LIST.Unit`, stores expected UOM; scan checks equality after normalization. V0001 itself does not change configuration or scanners.
- **Existing business objects:** no alterations/deletions, no legacy row migration; customer `IPTH_*` tables remain untouched.
- **Packaging:** `00_PRECHECK.sql`, `01_APPLY.sql`, `02_VERIFY.sql`, `SHA256SUMS.txt`, `RELEASE_NOTES.md`, handoff MD.
- **Validation:** static SQL/package validation and updater simulation only; live SQL Server Dev/Customer not yet tested.
- **Next change:** New Backend/FE implementation for barcode `PN;QTY;UOM;SERIAL`, idempotent scan and remainder transfer.

**Supersedes** earlier automated V0000 baseline/migration workflow for new releases; operator deploys SQL manually in explicit sequence.
