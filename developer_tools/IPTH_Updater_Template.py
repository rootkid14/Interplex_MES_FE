#!/usr/bin/env python3
"""Reusable IPTH MES updater runner: mandatory --scan / --apply, optional --rollback.

Future agents generate a PATCH BUNDLE DIRECTORY (manifest.json + payload files) and
ship it with this runner, or embed the same validated data in a standalone updater.

Run from Interplex_MES_BE:
  python ../Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py --scan --patch-dir ../patches/my_change
  python ../Interplex_MES_FE/developer_tools/IPTH_Updater_Template.py --apply --patch-dir ../patches/my_change

No network access; backups are stored in ~/.ipth_mes_updater_backups (OUTSIDE git repos).
Mandatory manifest.compatibility checks fail-closed on risky or unknown versions.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
from importlib import metadata
import tempfile
from pathlib import Path, PurePosixPath

DOC_PREFIX = "Interplex_MES_FE/docs/mes_agent/"
UPDATE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{3,100}$")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def locate_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "Interplex_MES_FE").is_dir() and (candidate / "Interplex_MES_BE").is_dir():
            return candidate.resolve()
    raise ValueError("Run from Interplex_MES_BE or provide --root pointing to IPTH_Traceability")


def safe_relative(raw: str) -> Path:
    if not isinstance(raw, str) or not raw:
        raise ValueError("Missing relative path")
    value = raw.replace("\\", "/")
    p = PurePosixPath(value)
    if p.is_absolute() or ".." in p.parts or p.parts[0] not in {"Interplex_MES_FE", "Interplex_MES_BE"}:
        raise ValueError("Unsafe path: " + repr(raw))
    if any(x in p.parts for x in (".git", "node_modules", "dist", ".env", "__pycache__", ".ipth_updater_backups")):
        raise ValueError("Forbidden path: " + repr(raw))
    return Path(*p.parts)


def safe_target(root: Path, relative: Path) -> Path:
    target = root / relative
    if not target.parent.resolve().is_relative_to(root):
        raise ValueError("Symlink escapes repo root: " + str(relative))
    if target.is_symlink():
        raise ValueError("Refusing symlink target: " + str(relative))
    return target


def atomic_write(dest: Path, data: bytes):
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".ipth-update-", dir=str(dest.parent))
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def load_patch(patch_dir: Path):
    manifest_file = patch_dir / "manifest.json"
    if not manifest_file.is_file():
        raise ValueError("Patch missing manifest.json in " + str(patch_dir))
    info = json.loads(manifest_file.read_text(encoding="utf-8"))
    update_id = info.get("update_id")
    if not isinstance(update_id, str) or not UPDATE_ID_PATTERN.fullmatch(update_id):
        raise ValueError("Invalid manifest.update_id")
    changes = info.get("files")
    if not isinstance(changes, list) or not changes:
        raise ValueError("Manifest must include nonempty files list")
    docs = info.get("documentation")
    if not isinstance(docs, dict) or not isinstance(docs.get("updated"), list) or not isinstance(docs.get("release_note"), str):
        raise ValueError("Manifest must list documentation.updated and documentation.release_note")
    rels = []
    bundles = {}
    for item in changes:
        if not isinstance(item, dict):
            raise ValueError("Each file entry must be an object")
        relative = safe_relative(item.get("path"))
        rel = relative.as_posix()
        if rel in rels:
            raise ValueError("Duplicate manifest file: " + rel)
        expected_before = item.get("before_sha256")
        if expected_before is not None and (not isinstance(expected_before, str) or not re.fullmatch(r"[a-f0-9]{64}", expected_before)):
            raise ValueError("before_sha256 must be SHA256 hex or null for: " + rel)
        payload = (patch_dir / "files" / relative).resolve()
        if not payload.is_relative_to((patch_dir / "files").resolve()) or not payload.is_file():
            raise ValueError("Missing payload file: " + rel)
        body = payload.read_bytes()
        expected_after = item.get("after_sha256")
        if not isinstance(expected_after, str) or digest(body) != expected_after:
            raise ValueError("Payload hash mismatch: " + rel)
        rels.append(rel)
        bundles[rel] = (expected_before, expected_after, body)
    updated = docs["updated"]
    release_note = docs["release_note"]
    if not updated or any(not isinstance(p, str) or not p.startswith(DOC_PREFIX) or not p.endswith(".md") for p in updated):
        raise ValueError("documentation.updated must list changed .md files inside docs/mes_agent")
    if any(d not in rels for d in updated):
        raise ValueError("All documentation.updated files must be included in manifest.files")
    if not release_note.startswith(DOC_PREFIX + "changes/") or not release_note.endswith(".md") or release_note not in updated:
        raise ValueError("Every updater must add a Markdown release note inside docs/mes_agent/changes")
    if not any(d.startswith(DOC_PREFIX + "modules/") for d in updated):
        raise ValueError("Every updater must change at least one module Markdown document")
    if DOC_PREFIX + "CHANGELOG.md" not in updated:
        raise ValueError("Every updater must update docs/mes_agent/CHANGELOG.md")
    reviewed = docs.get("reviewed_unchanged", [])
    if not isinstance(reviewed, list) or any(not isinstance(p, str) or not p.startswith(DOC_PREFIX) or not p.endswith(".md") for p in reviewed):
        raise ValueError("documentation.reviewed_unchanged must be an array of docs paths")
    compatibility = info.get("compatibility")
    if not isinstance(compatibility, dict) or compatibility.get("schema") != 1:
        raise ValueError("REJECT [COMPAT_MANIFEST]: compatibility.schema=1 is required; obtain updated manifest from agent")
    checks = compatibility.get("checks")
    if not isinstance(checks, list) or not checks:
        raise ValueError("REJECT [COMPAT_MANIFEST]: compatibility.checks must be a nonempty list")
    if not any(isinstance(c, dict) and c.get("severity", "critical") == "critical" for c in checks):
        raise ValueError("REJECT [COMPAT_MANIFEST]: declare at least one critical compatibility check")
    ids = set()
    valid_kinds = {"file_exists", "file_sha256", "file_contains", "json_value", "python_version", "python_distribution", "git_branch"}
    for c in checks:
        if not isinstance(c, dict) or not isinstance(c.get("id"), str) or not re.fullmatch(r"[A-Za-z0-9_.-]{3,80}", c["id"]):
            raise ValueError("REJECT [COMPAT_MANIFEST]: checks need unique ids [A-Za-z0-9_.-], length 3..80")
        if c["id"] in ids:
            raise ValueError("REJECT [COMPAT_MANIFEST]: duplicate check id " + c["id"])
        ids.add(c["id"])
        if c.get("kind") not in valid_kinds or c.get("severity", "critical") not in {"critical", "advisory"}:
            raise ValueError("REJECT [COMPAT_MANIFEST]: unsupported kind/severity in " + c["id"])
        if c.get("when", "always") not in {"always", "pre_apply"}:
            raise ValueError("REJECT [COMPAT_MANIFEST]: invalid when in " + c["id"])
        if c["kind"] in {"file_exists", "file_sha256", "file_contains", "json_value"}:
            safe_relative(c.get("path"))
        if c["kind"] == "git_branch" and c.get("repo") not in {"FE", "BE"}:
            raise ValueError("REJECT [COMPAT_MANIFEST]: git_branch.repo must be FE or BE")
        if c["kind"] in {"python_version", "python_distribution"} and not ({"min", "max_exclusive"} & set(c)):
            raise ValueError("REJECT [COMPAT_MANIFEST]: version check must declare min and/or max_exclusive")
    return info, bundles


def version_tuple(raw: str):
    if not isinstance(raw, str) or not re.fullmatch(r"\d+(\.\d+){0,3}", raw):
        raise ValueError("unsupported version format: " + repr(raw))
    parts = tuple(int(x) for x in raw.split("."))
    return parts + (0,) * (4 - len(parts))


def check_version(found: str, item: dict):
    v = version_tuple(found)
    if "min" in item and v < version_tuple(item["min"]):
        return False, f"found {found}; minimum required {item['min']}"
    if "max_exclusive" in item and v >= version_tuple(item["max_exclusive"]):
        return False, f"found {found}; requires below {item['max_exclusive']}"
    return True, f"found {found}; version range compatible"


def one_compatibility_check(root: Path, item: dict):
    kind = item["kind"]
    if kind == "python_version":
        found = ".".join(map(str, sys.version_info[:3]))
        return check_version(found, item)
    if kind == "python_distribution":
        package = item.get("name")
        if not isinstance(package, str) or not package:
            raise ValueError("missing python distribution name")
        try:
            found = metadata.version(package)
        except metadata.PackageNotFoundError:
            return False, "Python package not installed in this interpreter: " + package
        return check_version(found, item)
    if kind == "git_branch":
        folder = root / ("Interplex_MES_FE" if item["repo"] == "FE" else "Interplex_MES_BE")
        result = subprocess.run(["git", "-C", str(folder), "branch", "--show-current"], capture_output=True, text=True, timeout=10)
        if result.returncode != 0 or not result.stdout.strip():
            return False, "Git branch unavailable (detached HEAD or not a repository)"
        found = result.stdout.strip()
        allowed = item.get("allowed")
        if not isinstance(allowed, list) or not allowed:
            raise ValueError("git_branch.allowed needs a list of branch names")
        return found in allowed, f"branch={found}; accepted={allowed}"
    rel = safe_relative(item["path"])
    p = safe_target(root, rel)
    if kind == "file_exists":
        return p.is_file(), f"path={rel}; file_exists={p.is_file()}"
    if not p.is_file():
        return False, "required file missing: " + str(rel)
    data = p.read_bytes()
    if kind == "file_sha256":
        accepted = item.get("accepted_sha256")
        if not isinstance(accepted, list) or not accepted or any(not isinstance(x, str) or re.fullmatch(r"[a-f0-9]{64}", x) is None for x in accepted):
            raise ValueError("accepted_sha256 must be a list of SHA256 hashes")
        h = digest(data)
        return h in accepted, f"path={rel}; sha256={h}; expected={accepted}"
    if kind == "file_contains":
        snippet = item.get("text")
        if not isinstance(snippet, str) or not snippet:
            raise ValueError("file_contains.text must be a nonempty string")
        matched = snippet in data.decode("utf-8")
        return matched, f"path={rel}; required anchor={snippet[:90]!r}; present={matched}"
    if kind == "json_value":
        keys = item.get("keys")
        if not isinstance(keys, list) or not keys or not all(isinstance(k, str) and k for k in keys):
            raise ValueError("json_value.keys must be a list of JSON object keys")
        current = json.loads(data)
        for key in keys:
            if not isinstance(current, dict) or key not in current:
                return False, f"JSON key missing: {keys} in {rel}"
            current = current[key]
        if "equals" in item:
            allowed = [item["equals"]]
        else:
            allowed = item.get("one_of")
        if not isinstance(allowed, list) or not allowed:
            raise ValueError("json_value requires equals or one_of")
        return current in allowed, f"path={rel}; keys={keys}; found={current!r}; accepted={allowed!r}"
    raise ValueError("unknown check kind")


def compatibility_scan(root: Path, info: dict, rows):
    all_applied = all(r[1] == "ALREADY" for r in rows)
    outcomes = []
    for c in info["compatibility"]["checks"]:
        if all_applied and c.get("when", "always") == "pre_apply":
            outcomes.append(("PASS", c["id"], "already applied: pre-apply condition skipped"))
            continue
        try:
            passed, detail = one_compatibility_check(root, c)
            status = "PASS" if passed else ("REJECT" if c.get("severity", "critical") == "critical" else "WARN")
        except (OSError, ValueError, RuntimeError, json.JSONDecodeError, UnicodeError, subprocess.TimeoutExpired) as exc:
            status = "REJECT" if c.get("severity", "critical") == "critical" else "WARN"
            detail = "cannot verify: " + str(exc)
        outcomes.append((status, c["id"], detail))
    return outcomes


def inspect(root: Path, bundles):
    result = []
    for rel, (before_hash, after_hash, data) in bundles.items():
        target = safe_target(root, safe_relative(rel))
        current = target.read_bytes() if target.is_file() else None
        current_hash = digest(current) if current is not None else None
        if current_hash == after_hash:
            state = "ALREADY"
        elif current_hash == before_hash:
            state = "CREATE" if before_hash is None else "UPDATE"
        else:
            state = "CONFLICT"
        result.append((rel, state, current_hash, before_hash, after_hash, current, data))
    return result


def scan(info, rows, root: Path):
    print("\nIPTH MES Updater:", info["update_id"])
    print("Summary:", info.get("summary", "(missing)"))
    print("\nREPOSITORY CONTEXT (read-only):")
    for repo in ("Interplex_MES_FE", "Interplex_MES_BE"):
        try:
            result = subprocess.run(["git", "-C", str(root / repo), "branch", "--show-current"],
                                    capture_output=True, text=True, timeout=10)
            branch = result.stdout.strip() if result.returncode == 0 else "unknown"
        except (OSError, subprocess.TimeoutExpired):
            branch = "unknown"
        print(f"  {repo}: branch={branch or 'unknown'}")
    print("\nCOMPATIBILITY GATE (NO WRITES):")
    outcomes = compatibility_scan(root, info, rows)
    for status, check_id, detail in outcomes:
        print(f"  [{status:6s}] {check_id}: {detail}")
    print("\nSOURCE + DOCUMENTATION PLAN (NO WRITES):")
    for rel, state, current_hash, before_hash, after_hash, _old, _new in rows:
        print(f"  {state:8s}  {rel}")
        print(f"            current={current_hash or '-'}\n            expect ={before_hash or '(absent)'}\n            after  ={after_hash}")
    docs = info["documentation"]
    print("\nMARKDOWN FILES TO UPDATE:")
    for item in docs["updated"]:
        print("  - " + item)
    print("\nMARKDOWN FILES REVIEWED, UNCHANGED:")
    for item in docs.get("reviewed_unchanged", []):
        print("  - " + item)
    print("\nRELEASE NOTE: " + docs["release_note"])
    print("\nALL AGENT MD FILES (inventory):")
    doc_root = root / "Interplex_MES_FE" / "docs" / "mes_agent"
    current_docs = {p.relative_to(root).as_posix() for p in doc_root.rglob("*.md")} if doc_root.exists() else set()
    all_docs = sorted(current_docs | set(docs["updated"]) | set(docs.get("reviewed_unchanged", [])))
    for item in all_docs:
        state = "UPDATE" if item in docs["updated"] else ("REVIEWED" if item in docs.get("reviewed_unchanged", []) else "NOT REVIEWED")
        print(f"  {state:12s} {item}")
    if any(status == "REJECT" for status, _id, _detail in outcomes):
        print("\nVERDICT: REJECT - incompatible or unverifiable critical requirements. NO WRITES.")
        return 2
    if any(row[1] == "CONFLICT" for row in rows):
        print("\nVERDICT: REJECT - source changed or wrong version. NO WRITES.")
        return 2
    if all(row[1] == "ALREADY" for row in rows):
        print("\nALREADY APPLIED: all payload files match.")
        return 0
    if any(row[1] == "ALREADY" for row in rows):
        print("\nVERDICT: REJECT - partially applied updater; inspect files manually.")
        return 2
    if any(status == "WARN" for status, _id, _detail in outcomes):
        print("\nVERDICT: PASS WITH WARNINGS - only advisory checks failed. Review before apply.")
    else:
        print("\nVERDICT: PASS - ready to apply. --scan has modified nothing.")
    return 0


def backup_location(update_id: str) -> Path:
    return Path.home() / ".ipth_mes_updater_backups" / update_id


def apply(root: Path, info, rows):
    if scan(info, rows, root) != 0:
        raise RuntimeError("REJECT - preflight failed; refusing --apply")
    # Re-read files and re-run checks immediately before writing: stop on drift.
    new_rows = inspect(root, {r[0]: (r[3], r[4], r[6]) for r in rows})
    if any((a[0], a[1], a[2]) != (b[0], b[1], b[2]) for a, b in zip(rows, new_rows)):
        raise RuntimeError("REJECT - project changed during preflight; refusing --apply")
    if any(status == "REJECT" for status, _cid, _reason in compatibility_scan(root, info, new_rows)):
        raise RuntimeError("REJECT - compatibility changed before write")
    if all(row[1] == "ALREADY" for row in rows):
        return
    backup = backup_location(info["update_id"])
    if backup.exists():
        raise RuntimeError("Backup location already exists: " + str(backup))
    backup.mkdir(parents=True, mode=0o700)
    saved = {rel: old for rel, _state, _cur, _before, _after, old, _data in rows}
    journal = {"update_id": info["update_id"], "files": [
        {"path": rel, "before_sha256": before, "after_sha256": after, "existed": old is not None}
        for rel, _state, _cur, before, after, old, _data in rows
    ]}
    try:
        for rel, original in saved.items():
            if original is not None:
                dest = backup / "files" / safe_relative(rel)
                atomic_write(dest, original)
        atomic_write(backup / "journal.json", json.dumps(journal, ensure_ascii=False, indent=2).encode("utf-8"))
        for rel, _state, _cur, _before, _after, _old, updated in rows:
            atomic_write(safe_target(root, safe_relative(rel)), updated)
        print("\nAPPLIED AND BACKED UP TO:", backup)
    except Exception:
        for rel, original in saved.items():
            dest = safe_target(root, safe_relative(rel))
            if original is None:
                if dest.exists():
                    dest.unlink()
            else:
                atomic_write(dest, original)
        raise


def rollback(root: Path, update_id: str):
    backup = backup_location(update_id)
    file = backup / "journal.json"
    if not file.is_file():
        raise RuntimeError("No backup journal for " + update_id)
    journal = json.loads(file.read_text(encoding="utf-8"))
    records = []
    for row in journal["files"]:
        rel = safe_relative(row["path"])
        target = safe_target(root, rel)
        if not target.is_file() or digest(target.read_bytes()) != row["after_sha256"]:
            raise RuntimeError("Changed after apply; cannot rollback safely: " + str(rel))
        original = (backup / "files" / rel).read_bytes() if row["existed"] else None
        if original is not None and digest(original) != row["before_sha256"]:
            raise RuntimeError("Backup corrupted: " + str(rel))
        records.append((target, original))
    for target, original in records:
        if original is None:
            target.unlink()
        else:
            atomic_write(target, original)
    archived = backup.with_name(backup.name + ".rolledback-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    if archived.exists():
        raise RuntimeError("Rollback files restored, but archive path exists: " + str(archived))
    backup.rename(archived)
    print("ROLLED BACK:", update_id)
    print("Old backup archived (reapply now possible):", archived)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument("--scan", action="store_true")
    actions.add_argument("--apply", action="store_true")
    actions.add_argument("--rollback", action="store_true")
    parser.add_argument("--patch-dir", type=Path, help="Patch directory containing manifest.json + files/")
    parser.add_argument("--update-id", help="Required with --rollback")
    parser.add_argument("--root", type=Path, help="IPTH_Traceability project root")
    args = parser.parse_args()
    root = locate_root((args.root or Path.cwd()).resolve())
    if args.rollback:
        if not args.update_id: parser.error("--rollback requires --update-id")
        if not UPDATE_ID_PATTERN.fullmatch(args.update_id): parser.error("Invalid --update-id")
        rollback(root, args.update_id)
        return 0
    if not args.patch_dir:
        parser.error("--scan / --apply require --patch-dir (future agent provides the patch folder)")
    info, bundles = load_patch(args.patch_dir.expanduser().resolve())
    rows = inspect(root, bundles)
    if args.scan:
        return scan(info, rows, root)
    apply(root, info, rows)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as exc:
        error_text = str(exc)
        print("REJECT:" if "REJECT" in error_text else "ERROR:", error_text, file=sys.stderr)
        raise SystemExit(2 if "REJECT" in error_text else 1)
