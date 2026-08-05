# V4-14 Central Workspace baseline

Baseline frozen: 2026-08-05 20:09:00 +07:00

## Verified source/runtime locations

- Source root: D:\archive-management
- Development API: D:\archive-management\api
- Development web: D:\archive-management\web
- Installed runtime: D:\Server\app\api
- Installed V4-13 runtime database: SQLite
- Verified private backup: D:\archive-management\release-v4\v4-14\baseline\V414_BASELINE_20260804_164855

## Baseline rules

1. V4-13 runtime remains unchanged while V4-14 is developed.
2. Database migrations are introduced only after backup and rollback tests.
3. Secrets, databases, uploaded documents, OCR weights, virtual environments, node_modules and installer binaries are not committed.
4. Every V4-14 PACK must have a focused commit, validation evidence and rollback notes.
5. The production/office machine is updated only after clean test-machine PASS.

## Target architecture

V4-14 uses a central Django API, central PostgreSQL, central file storage, Workspace membership and per-user audit logging. Offline synchronization is added only after the online-first path is stable.
