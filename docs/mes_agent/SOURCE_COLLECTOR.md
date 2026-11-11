# Source collector handbook

## Motivation

An LLM agent often needs only a coherent group of FE/BE source files, not an entire app. The collector generates a reproducible ZIP with a manifest and SHA256 checksums, while excluding obvious secrets and large generated directories.

## Run from BE (scripts physically live in FE)

```bash
cd ~/IPTH_Traceability/Interplex_MES_BE
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --list
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --scan
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --module routing --module batch_allocator --collect
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --request ../Interplex_MES_FE/developer_tools/requests/allocator_routing.example.json --collect
python ../Interplex_MES_FE/developer_tools/IPTH_SourceCollector.py --path 'Interplex_MES_BE/app/api/v1/endpoints/*.py' --scan
```

`--scan` only lists what would be collected. `--collect` creates `~/Downloads/IPTH_Source_<timestamp>.zip` unless `--output ...zip` is supplied.

## Request JSON contract

```json
{
  "purpose": "Review routing and allocator for a new feature",
  "modules": ["routing", "batch_allocator", "outsource_allocator"],
  "paths": ["Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py"]
}
```

Agent may provide a similar file with more module names or exact source paths. User puts request JSON in Downloads and runs `--request ... --scan`, then `--collect`.

## Safety and limitations

- No network/database/SQL calls. Does not mutate application source.
- No `.env`, git history, node_modules, dist, binaries, pycache, backups, giant files; fails on unsafe `..` paths and escapes.
- Checks filenames/extensions, **not every secret inside a source file**. Always review generated ZIP before uploading.
- `--list` shows configured presets. A missing file is reported as `MISSING`; this can indicate renamed paths or a changed project layout.
- Handoff Markdown is included by default, even if collecting only one module. Use `--no-docs` only if you specifically don't need it.
- ZIP manifest records collected files and checksums; current code may be newer than these handoff documents.
