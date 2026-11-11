# Label TXT contract and Windows Zebra printer

## Contract (as of Allocator v4.1)

One label per CSV row, saved with `.txt` extension. **Column order must not change silently:**

```csv
BARCODE,WO,QTY,CURRENT_PN,CURRENT_PROCESS,NEXT_PROCESS
```

Example (without header; FE export currently uses data rows):

```csv
BC001,777777,50,NVI0241701011IPO,Mattin plating +Nikel plating; Hipot testing 2,Assembly; Checking Dimension & Flatness
BC002,777778,50,NVI0241701001A1O,Outsource,packing
BC003,777779,50,NVI0241701011IPO,Outsource,-
```

- FE uses `formatAllocatorLabelRow` in `src/utils/allocatorRoutingV4.js`, wrapping commas/quotes according to CSV quoting rules. Python printer should parse with `csv.reader`, **not** `str.split(',')`.
- `CURRENT_PN`: Inhouse = allocated PN; Outsource = **New Part Number (Sau Outsource)**.
- `CURRENT_PROCESS`: Inhouse = routing current step or `-`; Outsource always `Outsource`.
- `NEXT_PROCESS`: routing next step; manual fallback; `-` if blank.
- Exported TXT is **not** the print action itself. Desktop Python/Tkinter app opens file, renders ZPL, sends RAW via `win32print`.

## Physical label requirements

- Zebra ZD421 (example installed driver name `ZDesigner ZD421-300dpi ZPL`).
- 100 mm × 75 mm, 300 DPI; ZPL `^PW1181` and `^LL886` approx; barcode Code128.
- Print Current PN, Current Process, Next Process, WO, Batch barcode, QTY and manufacturing date.
- **Quality Status content must be blank**, leaving a physical box for QA handwriting. Do not print `PASS` by default.
- User requests compact printer UI to fit small laptop screens; print buttons should remain visible.

## Locations, deployment

- User-supplied Python printer source `LambdaMES_BatchLabelPrinter_v41.py` and prior `test_may_in_next_process.py`. This is **external Windows app**, not FE browser printer.
- FE downloadable EXE location (from prior v3 updater): `Interplex_MES_FE/public/downloads/LambdaMES_BatchLabelPrinter.exe`; deployed static web serving should expose `/downloads/...`.
- Build Windows EXE using PyInstaller Onefile with `pywin32` installed in the *same Python build environment*. Inspect hidden-import and DLL packaging on target Windows computer; don't assume Linux PyInstaller builds Windows EXE.
- Test a printed label for truncation; font wrapping in ZPL is printer-dependent.

## Regression cases

Quoted commas in process, double quotes, missing processes (`-`), many labels, long PN, small screen, QA blank, correct dimensions and barcode readability. Verify export and test print before final rollout.
