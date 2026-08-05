# V4-14 architecture decisions

## ADR-001: Central Workspace before peer-to-peer sync

Status: Accepted

All clients use one central API and one authoritative database. Independent PostgreSQL/SQLite databases are not synchronized directly in the first production release.

## ADR-002: Preserve V4-13 runtime during development

Status: Accepted

Development occurs in D:\archive-management. Installed runtime under D:\Server is not modified until migration and rollback tests pass.

## ADR-003: Files are not stored inside Git

Status: Accepted

Uploaded PDFs, images, OCR artifacts, databases, secrets and generated release binaries are stored outside version control. Git stores application code, migrations, scripts, configuration templates and documentation only.
