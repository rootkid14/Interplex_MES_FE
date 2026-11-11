# Additional registered modules — inventory only

From the supplied `app/api/v1/api.py` router registry:

- `/auth` — auth endpoint module `auth.py`.
- `/system` — system endpoints `system.py`.
- `/models` — model configs `modelconfigs.py`.
- `/dashboard` — dashboard streaming `dashboardstreaming.py`.
- `/packing`, `/packing/master` — packing modules.
- `/tracebility` — traceability module (spelling in source registry).
- `/defect-codes` — defect codes.
- `/wip` — warehouse.
- `/smart-repair` — smart repair.
- `/dbengine` — database tab engine.

**This is not a full architecture description** of these modules. When asked to modify one, collect the module's source, update this documentation with verified API/model/FE ownership, and add a release note.
