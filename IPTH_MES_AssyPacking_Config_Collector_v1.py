#!/usr/bin/env python3
"""IPTH MES Assy/Packing Config source-only collector (READ ONLY).

Put this file inside Interplex_MES_FE. Execute from Interplex_MES_BE:
    python ../Interplex_MES_FE/IPTH_MES_AssyPacking_Config_Collector_v1.py --scan
    python ../Interplex_MES_FE/IPTH_MES_AssyPacking_Config_Collector_v1.py --collect

Never touches SQL Server or application data, and never modifies the repos.
Exports selected application SOURCE FILES, so REVIEW THE ZIP for hard-coded secrets
before sharing. No .env, databases, node_modules or runtime data are included.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import zipfile

FE_NAME = "Interplex_MES_FE"
BE_NAME = "Interplex_MES_BE"
ALLOW_EXT = {".py", ".js", ".jsx", ".ts", ".tsx", ".sql"}
SKIP_DIRS = {
    ".git", ".venv", "venv", "env", "node_modules", "dist", "build", "out", ".next",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ipynb_checkpoints", "coverage", ".cache",
    "tmp", "temp", "logs", "uploads", "media", "staticfiles", "migration_backups",
    ".ipth_updater_backups", "backups", "backup", "public", "assets", "data", "db_data",
}
SKIP_PREFIX = (".ipth_",)
SKIP_FILE_RE = re.compile(r"(?i)(?:^\.|\.min\.(?:js|css)$|(?<!\w)(?:updater|collector|dump|backup|snapshot|secret|credential|token|keyfile|private_key)(?!\w))")
ANCHOR_NAMES = {
    "bomconfig.jsx", "bomconfig.tsx", "modelconfigstore.js", "modelconfigstore.ts",
    "assy_packing_linkage_service.py", "wovalidation.py",
}
# Content categories let us inspect UI -> JSON -> backend -> workstation/traceability.
PATTERNS = {
    "A_config_BOM_tree": [
        r"\bBomConfig\b", r"\b(?:bomTree|treeData|treeNodes|expandedKeys|expandedNodes|expandedItems)\b",
        r"\b(?:setExpanded|expandAll|collapseAll|isExpanded|defaultExpanded|onExpand|toggleExpand|expandedRowKeys|expandedPaths)\w*\b",
        r"\b(?:loadConfig|getConfig|fetchConfig|saveConfig|ModelConfigStore|ModelConfigs)\b",
        r"\b(?:generateRule|generateRules|ruleSummary|compactRules)\b",
    ],
    "B_random_box_rule": [
        r"\b(?:random\w*|isRandom\w*|fixedString|fixedLength|variableLength)\b",
        r"\b(?:boxCode|boxBarcode|boxRule|BOX_RULE|Box_Status|Box_Master)\b",
        r"\b(?:scanType|regex|ruleType|length|barcodeLength|Generate Rule)\b",
    ],
    "C_subassy_ignore_count": [
        r"sub[ _-]?(?:assy|assembly)", r"\b(?:ignore|ignored|isIgnored|skipSubassy|skipScan)\b",
        r"\b(?:packingQty|boxQty|boxCapacity|targetQty|expectedQty|quantityPerBox|unitsPerBox)\b",
        r"\b(?:AssyPackingLinkage|PACKING|OUTPUT_MAIN|REQUIRED)\b",
    ],
    "D_runtime_trace": [
        r"\b(?:WoValidation|tracebywo|boxforward|Batches_Consumption_Log|AssyPackingLinkage)\b",
        r"\b(?:PackingWO|RequestedWO|RedirectedFromAssy|canonical_wo)\b",
        r"\b(?:validateScan|handleScan|scanBarcode|barcodeScan|scanEvent|confirmedQty)\b",
        r"\b(?:Box_Status|Box_Master|Batches_Master|MES_ReworkJobs)\b",
    ],
}
RX = {key: re.compile("|".join(f"(?:{p})" for p in pats), re.I) for key, pats in PATTERNS.items()}
HIGH_SIGNAL = re.compile(r"(?i)(?:sub[ _-]?(?:assy|assembly)|randomCode|randomBarcode|isRandom|" 
    r"generateRule|compactRules|expandedKeys|setExpanded|BomConfig|ModelConfigStore|" 
    r"assy_packing_linkage_service|boxCapacity|boxQty|PackingWO)")
FILE_LIMIT_BYTES = 1_200_000
SNIPPET_RADIUS = 7
SNIPPET_MAX_BLOCKS = 24


def find_root(start: Path) -> Path:
    for parent in (start, *start.parents):
        if (parent / FE_NAME).is_dir() and (parent / BE_NAME).is_dir():
            return parent
        if parent.name in {FE_NAME, BE_NAME}:
            p = parent.parent
            if (p / FE_NAME).is_dir() and (p / BE_NAME).is_dir():
                return p
    raise SystemExit(f"[ERROR] Cannot locate siblings {FE_NAME} and {BE_NAME} from {start}.")


def within_safe_tree(path: Path, repo: Path) -> bool:
    try:
        resolved = path.resolve()
        resolved.relative_to(repo.resolve())
    except (ValueError, OSError):
        return False
    return True


def is_safe_name(path: Path, repo: Path) -> bool:
    if not within_safe_tree(path, repo):
        return False
    rel = path.relative_to(repo)
    if any(x in SKIP_DIRS or x.startswith(SKIP_PREFIX) for x in rel.parts[:-1]):
        return False
    if path.suffix.lower() not in ALLOW_EXT or SKIP_FILE_RE.search(path.name):
        return False
    if any(p.startswith(".") for p in rel.parts):
        return False
    try:
        return 0 < path.stat().st_size <= FILE_LIMIT_BYTES
    except OSError:
        return False


def find_source_files(root: Path) -> list[Path]:
    result = []
    for repo_name in (FE_NAME, BE_NAME):
        repo = root / repo_name
        for folder, dirs, files in os.walk(repo, followlinks=False):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(SKIP_PREFIX)
                        and not d.startswith(".") and not (Path(folder) / d).is_symlink()]
            for name in files:
                p = Path(folder) / name
                if is_safe_name(p, repo) and not p.is_symlink():
                    result.append(p)
    return result


def analyze(path: Path, root: Path) -> dict | None:
    try:
        data = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    rel = path.relative_to(root).as_posix()
    lower = rel.lower()
    matches = {}
    for category, rx in RX.items():
        count = len(rx.findall(data))
        if count:
            matches[category] = count
    is_anchor = path.name.lower() in ANCHOR_NAMES
    fname_hits = sum(bool(re.search(token, lower)) for token in (
        r"bom", r"config", r"packing", r"assembly", r"assy", r"workstation", r"validation",
        r"trace", r"scan", r"rule", r"model", r"barcode"))
    if not matches and not is_anchor:
        return None
    # Avoid pulling every generic model/config/validation file solely due to one word.
    total = sum(matches.values())
    high_signal = len(HIGH_SIGNAL.findall(data))
    category_diversity = len(matches)
    score = (min(total, 80) + min(high_signal, 50) * 3 + category_diversity * 7
             + min(fname_hits, 4) * 11 + (150 if is_anchor else 0))
    if total <= 2 and high_signal == 0 and fname_hits < 2 and not is_anchor:
        return None
    return {"path": rel, "score": score, "anchor": is_anchor, "size_bytes": path.stat().st_size,
            "lines": data.count("\n") + 1, "sha256": hashlib.sha256(data.encode("utf-8")).hexdigest(),
            "categories": matches, "high_signal_hits": high_signal, "text": data}


def snippet(text: str) -> str:
    lines = text.splitlines()
    hits = [i for i, line in enumerate(lines) if HIGH_SIGNAL.search(line)]
    if not hits:
        hits = [i for i, line in enumerate(lines)
                if any(rx.search(line) for rx in RX.values())]
    spans = []
    for i in hits[:SNIPPET_MAX_BLOCKS]:
        a, b = max(0, i-SNIPPET_RADIUS), min(len(lines), i+SNIPPET_RADIUS+1)
        if spans and a <= spans[-1][1]:
            spans[-1] = (spans[-1][0], max(b, spans[-1][1]))
        else:
            spans.append((a, b))
    out = []
    for a, b in spans:
        out.append(f"==== LINES {a+1} - {b} ====")
        out.extend(f"{j+1:05d}: {lines[j]}" for j in range(a, b))
    return "\n".join(out) + "\n"


def main() -> int:
    p = argparse.ArgumentParser(description="Source-only read-only MES config collector")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--scan", action="store_true", help="Preview candidates, no files written")
    group.add_argument("--collect", action="store_true", help="Export selected source and snippets to zip")
    p.add_argument("--max-files", type=int, default=55, help="Max full-source files to include (default 55)")
    p.add_argument("--max-excerpts", type=int, default=80, help="Max additional excerpt files (default 80)")
    p.add_argument("--output-dir", type=Path, default=Path.home()/"Downloads")
    args = p.parse_args()
    if not 1 <= args.max_files <= 200:
        p.error("--max-files must be from 1 to 200")
    if not 0 <= args.max_excerpts <= 300:
        p.error("--max-excerpts must be from 0 to 300")
    root = find_root(Path.cwd())
    print(f"[MES CONFIG COLLECTOR] Root: {root}")
    print(f"[MODE] {'SCAN' if args.scan else 'COLLECT'} | SOURCE-ONLY | NO DB | NO CODE CHANGES")
    files = find_source_files(root)
    candidates = [r for file in files if (r := analyze(file, root)) is not None]
    candidates.sort(key=lambda r: (-r["score"], r["path"]))
    # Allocate coverage across categories and both FE/BE before filling by score.
    selected_paths = set()
    def keep(r):
        if len(selected_paths) < args.max_files:
            selected_paths.add(r["path"])
    for r in candidates:
        if r["anchor"]:
            keep(r)
    for category in PATTERNS:
        matched = [r for r in candidates if category in r["categories"]]
        for r in matched[:7]:
            keep(r)
    for repo_name in (FE_NAME, BE_NAME):
        repo_items = [r for r in candidates if r["path"].startswith(repo_name + "/")]
        for r in repo_items[:12]:
            keep(r)
    for r in candidates:
        keep(r)
    selected = [r for r in candidates if r["path"] in selected_paths]
    excerpts = [r for r in candidates if r["path"] not in selected_paths][:args.max_excerpts]
    if not selected:
        print("[ERROR] No matching source files; verify this is the correct MES root.")
        return 2
    print(f"[SCAN] Source files eligible: {len(files)} | candidates: {len(candidates)} | full files: {len(selected)}")
    print("[TOP CANDIDATES] (relative to project root)")
    for r in candidates[:65]:
        tag = "*FULL*" if r in selected else "EXCERPT"
        print(f"  {tag:7} score={r['score']:>3} hits={sum(r['categories'].values()):>3} {r['path']}")
    if args.scan:
        print("\n[NEXT] Run the same command with --collect, then upload the generated ZIP.")
        return 0

    args.output_dir.mkdir(parents=True, exist_ok=True)
    tag = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = args.output_dir / f"IPTH_MES_AssyPacking_Config_Source_{tag}.zip"
    manifest = []
    excerpt_paths = {r["path"] for r in excerpts}
    for r in candidates:
        manifest.append({k: v for k, v in r.items() if k != "text"} | {"export": "full" if r["path"] in selected_paths else ("excerpt" if r["path"] in excerpt_paths else "listed_only")})
    notes = """# IPTH MES — Assy/Packing Config Source Collection

Source-only inspection. Does not connect to SQL Server or modify FE/BE.
The ZIP contains SOURCE CODE and may include hard-coded secrets; review before uploading.
No .env, secrets files, database rows, binaries, assets or node_modules included.

Questions to investigate:
1. Subassy ignored, box configured Qty=54: how runtime knows and verifies contents; traceability consequences.
2. Random box barcode mode leaves default PN in generated rule JSON unless input manually cleared.
3. Reload existing BOM: expand state lost; generator may omit collapsed descendants.

Check paths in manifest.json. `source/` contains full selected source files with original relative paths.
`excerpts/` contains numbered relevant lines for additional candidates.
Keep runtime logs / DB data separate. Collector does not capture them.
"""
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as z:
        z.writestr("README.md", notes)
        z.writestr("manifest.json", json.dumps({"root": str(root), "generated": datetime.now().isoformat(),
            "files_scanned": len(files), "candidates": len(candidates),
            "full_files": len(selected), "files": manifest}, ensure_ascii=False, indent=2))
        grouped = Counter(cat for r in selected for cat in r["categories"])
        z.writestr("coverage.txt", "\n".join(f"{k}: {v} full-source files" for k,v in sorted(grouped.items()))+"\n")
        for r in (selected + excerpts):
            arc = ("source/" if r["path"] in selected_paths else "excerpts/") + r["path"]
            if r["path"] not in selected_paths:
                arc += ".excerpt.txt"
            z.writestr(arc, r["text"] if r["path"] in selected_paths else snippet(r["text"]))
    print(f"\n[COLLECTED] {target}")
    print(f"[ZIP SIZE] {target.stat().st_size:,} bytes | full sources={len(selected)} | excerpts={len(excerpts)} | listed-only={len(candidates)-len(selected)-len(excerpts)}")
    print("[IMPORTANT] Review ZIP for any hard-coded credentials before uploading.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
