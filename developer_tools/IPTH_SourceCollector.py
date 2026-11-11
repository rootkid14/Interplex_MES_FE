#!/usr/bin/env python3
"""IPTH MES safe source collector (standard library only).

Run from Interplex_MES_BE, while this file lives in Interplex_MES_FE:
  python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --list
  python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --module batch_allocator --scan
  python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --collect
  python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --request ~/Downloads/agent_request.json --collect

No SQL access, source editing, network, or external packages. Default output: ~/Downloads.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath

# Patterns are relative to the directory holding Interplex_MES_FE and Interplex_MES_BE.
PRESETS: dict[str, tuple[str, ...]] = {
    "routing": (
        "Interplex_MES_BE/app/api/v1/endpoints/routing_modes_api.py",
        "Interplex_MES_BE/app/api/v1/endpoints/bom.py",
        "Interplex_MES_BE/app/api/v1/api.py",
        "Interplex_MES_FE/src/api/bomAPI.js",
        "Interplex_MES_FE/src/utils/allocatorRoutingV4.js",
    ),
    "batch_allocator": (
        "Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx",
        "Interplex_MES_FE/src/api/workstationApi.js",
        "Interplex_MES_FE/src/store/productionStore.js",
        "Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py",
    ),
    "outsource_allocator": (
        "Interplex_MES_FE/src/components/production/FrameOutSourceAllocator.jsx",
        "Interplex_MES_FE/src/api/workstationApi.js",
        "Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py",
        "Interplex_MES_BE/app/api/v1/endpoints/routing_modes_api.py",
    ),
    "workorders": (
        "Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py",
        "Interplex_MES_BE/app/schemas/WoValidationResponse.py",
        "Interplex_MES_BE/app/schemas/SetWctrRequest.py",
        "Interplex_MES_FE/src/api/workstationApi.js",
        "Interplex_MES_FE/src/store/productionStore.js",
    ),
    "workcenters": (
        "Interplex_MES_FE/src/**/WctrSelectionModal.jsx",
        "Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py",
        "Interplex_MES_FE/src/api/workstationApi.js",
    ),
    "database_tab": (
        "Interplex_MES_FE/src/**/*Database*.jsx",
        "Interplex_MES_FE/src/**/*Database*.js",
        "Interplex_MES_FE/src/**/*DB*.jsx",
        "Interplex_MES_BE/app/api/v1/endpoints/db_engine.py",
    ),
    "packing": (
        "Interplex_MES_BE/app/api/v1/endpoints/logPacking.py",
        "Interplex_MES_BE/app/api/v1/endpoints/packing_master.py",
        "Interplex_MES_BE/app/services/assy_packing_linkage_service.py",
    ),
    "printing": (
        "Interplex_MES_BE/app/test_may_in*.py",
        "Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx",
        "Interplex_MES_FE/src/components/production/FrameOutSourceAllocator.jsx",
        "Interplex_MES_FE/src/utils/allocatorRoutingV4.js",
        "Interplex_MES_FE/src/api/workstationApi.js",
    ),
    "api_core": (
        "Interplex_MES_FE/src/api/client.js",
        "Interplex_MES_BE/app/api/v1/api.py",
        "Interplex_MES_BE/app/db/session.py",
        "Interplex_MES_BE/app/main.py",
    ),
    "schemas": ("Interplex_MES_BE/app/schemas/*.py",),
    "frontend_production": ("Interplex_MES_FE/src/components/production/*.*",),
    "documentation": ("Interplex_MES_FE/docs/mes_agent/**/*.md",),
}
ALLOWED_SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".sql", ".txt", ".toml", ".yaml", ".yml", ".ini", ".sh", ".css", ".html", ".cfg"}
FORBIDDEN_PARTS = {".git", "node_modules", "dist", "build", "venv", ".venv", "__pycache__", ".ipth_updater_backups", "backups", ".pytest_cache", ".next", ".lambda_updater_backups"}
FORBIDDEN_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"}
SENSITIVE_REGEX = re.compile(r"(^|[._-])(secret|credential|password|private[_-]?key|token)([._-]|$)", re.I)
DOC_GLOB = "Interplex_MES_FE/docs/mes_agent/**/*.md"


def project_root(path: Path) -> Path:
    for candidate in (path, *path.parents):
        if (candidate / "Interplex_MES_FE").is_dir() and (candidate / "Interplex_MES_BE").is_dir():
            return candidate.resolve()
    raise ValueError("Cannot find project root containing Interplex_MES_FE and Interplex_MES_BE")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_pattern(pattern: str) -> str:
    pattern = pattern.replace("\\", "/").strip()
    pure = PurePosixPath(pattern)
    if not pattern or pure.is_absolute() or ".." in pure.parts or pure.parts[0] not in {"Interplex_MES_FE", "Interplex_MES_BE"}:
        raise ValueError(f"Unsafe source pattern: {pattern!r}")
    if any(part in FORBIDDEN_PARTS for part in pure.parts):
        raise ValueError(f"Excluded directory in source pattern: {pattern!r}")
    return pattern


def eligible(path: Path, root: Path, max_bytes: int) -> bool:
    if not path.is_file() or path.is_symlink():
        return False
    try:
        rel = path.resolve().relative_to(root)
    except ValueError:
        return False
    if any(part in FORBIDDEN_PARTS for part in rel.parts):
        return False
    if path.name.lower() in FORBIDDEN_NAMES or path.name.lower().startswith(".env") or SENSITIVE_REGEX.search(path.name):
        return False
    if path.suffix.lower() not in ALLOWED_SUFFIXES:
        return False
    return path.stat().st_size <= max_bytes


def expand(root: Path, patterns: list[str], max_bytes: int):
    selected = {}
    not_found = []
    rejected = []
    for item in dict.fromkeys(patterns):
        item = validate_pattern(item)
        matches = sorted(root.glob(item))
        if not matches:
            not_found.append(item)
        for path in matches:
            if eligible(path, root, max_bytes):
                selected[path.relative_to(root).as_posix()] = path
            elif path.is_file():
                rejected.append(path.relative_to(root).as_posix())
    return selected, not_found, rejected


def load_request(file_path: Path) -> dict:
    info = json.loads(file_path.read_text(encoding="utf-8"))
    if not isinstance(info, dict):
        raise ValueError("Request must be a JSON object")
    for field in ("modules", "paths"):
        if field in info and (not isinstance(info[field], list) or any(not isinstance(x, str) for x in info[field])):
            raise ValueError(f"Request field {field!r} must be an array of strings")
    return info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--list", action="store_true", help="List known modules and source patterns")
    mode.add_argument("--scan", action="store_true", help="Read-only preview of selected source files")
    mode.add_argument("--collect", action="store_true", help="Create ZIP (source + manifest + documentation)")
    ap.add_argument("--module", action="append", default=[], help="Module preset; repeat as needed")
    ap.add_argument("--path", action="append", default=[], help="Extra repo-relative path or glob")
    ap.add_argument("--request", type=Path, help="JSON request supplied by another agent")
    ap.add_argument("--root", type=Path, help="Optional project root; auto-detected from BE cwd")
    ap.add_argument("--output", type=Path, help="ZIP path for --collect (default ~/Downloads)")
    ap.add_argument("--no-docs", action="store_true", help="Do not add agent handoff Markdown files")
    ap.add_argument("--max-file-mb", type=float, default=2.0, help="Limit per file, default 2 MiB")
    args = ap.parse_args()
    if args.list:
        for name, files in sorted(PRESETS.items()):
            print(f"\n[{name}]")
            for f in files: print("  "+f)
        return 0
    root = project_root(args.root.resolve() if args.root else Path.cwd().resolve())
    request = load_request(args.request.expanduser()) if args.request else {}
    modules = list(dict.fromkeys([*args.module, *request.get("modules", [])]))
    extra = [*args.path, *request.get("paths", [])]
    if not modules and not extra:
        ap.error("Use --module, --path, or --request to select files")
    unknown = set(modules) - PRESETS.keys()
    if unknown:
        ap.error("Unknown module(s): " + ", ".join(sorted(unknown)) + ". Try --list")
    patterns = [p for module in modules for p in PRESETS[module]] + extra
    if not args.no_docs and "documentation" not in modules:
        patterns.append(DOC_GLOB)
    max_bytes = int(args.max_file_mb * 1024 * 1024)
    if max_bytes <= 0:
        ap.error("--max-file-mb must be positive")
    selected, missing, rejected = expand(root, patterns, max_bytes)
    print(f"Project root: {root}")
    print(f"Requested modules: {', '.join(modules) or '(explicit paths only)'}")
    for f in sorted(selected):
        print(f"  INCLUDE {f} ({selected[f].stat().st_size:,} bytes)")
    for f in missing: print(f"  MISSING {f}")
    for f in rejected: print(f"  SKIPPED {f} (unsupported, sensitive, symlink, or exceeds size limit)")
    print(f"Selected: {len(selected)} files")
    if not selected:
        return 2
    if args.scan:
        print("SCAN ONLY — no ZIP created; no files modified.")
        return 0
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    output = args.output.expanduser() if args.output else (Path.home() / "Downloads" / f"IPTH_Source_{now}.zip")
    output = output.resolve()
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing collection: {output}")
    if output.suffix.lower() != ".zip":
        raise ValueError("Output must be a .zip")
    # Snapshot file bytes BEFORE writing ZIP, to avoid bundling a partially modified file.
    contents = {rel: path.read_bytes() for rel, path in sorted(selected.items())}
    if sum(len(v) for v in contents.values()) > 25 * 1024 * 1024:
        raise ValueError("Collection exceeds 25 MiB. Narrow --module / --path selection.")
    manifest = {
        "format_version": 1,
        "collected_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "project": "IPTH_Traceability",
        "purpose": request.get("purpose", "Agent source review"),
        "modules": modules,
        "unmatched_patterns": missing,
        "skipped_files": rejected,
        "files": [{"path": rel, "bytes": len(data), "sha256": sha256(data)} for rel, data in contents.items()],
        "note": "Source snapshots are untrusted until reviewed; do not upload credentials, DB dumps, or secrets.",
    }
    note = ("# IPTH MES source package\n\n"
            "This ZIP contains only selected source files and context Markdown.\n"
            "Open `COLLECTION_MANIFEST.json` for file list and SHA256.\n"
            "Agent: treat source as authoritative and handoff docs as potentially stale.\n"
            "Do not assume uncollected files or endpoints exist.\n")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
        archive.writestr("COLLECTION_MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        archive.writestr("README_FOR_AGENT.md", note)
        for rel, data in contents.items():
            archive.writestr(rel, data)
    print(f"\nCreated: {output}\nReview archive contents for secrets before sharing with an agent.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
