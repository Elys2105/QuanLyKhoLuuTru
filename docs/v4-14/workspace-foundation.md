# V4-14 Workspace foundation

## Scope

This source-only foundation introduces a dedicated `apps.workspaces` domain.
It deliberately does not add `workspace` foreign keys to existing archival
business models yet.

## Models

### Workspace

A central collaboration boundary identified by a UUID primary key and a
human-readable unique slug. A workspace may be active or archived.

### WorkspaceMembership

Links the configured `AUTH_USER_MODEL` to a workspace. The pair
`(workspace, user)` is unique. One active default membership is allowed per
user. Roles are owner, administrator, editor and viewer.

### Device

Represents one client installation inside a workspace. The UUID primary key is
the server record identity. `installation_id` is a separate globally unique
client-installation identity used for registration and later synchronization.
Only an optional hash may be stored in `fingerprint_hash`; raw hardware
identifiers must not be persisted.

## Migration boundary

PACK V4-14-03B creates `workspaces.0001_initial` in source and validates its SQL
plan. It does not apply any migration to `archive_v414`.

A separate gated pack must apply the complete existing migration graph plus the
workspace foundation to the empty V4-14 database and then verify rollback and
schema invariants.

## Next boundary

Workspace foreign keys, global UUIDs, revisions and actor/device metadata for
existing archival models belong to the next model-transition phase. They must
not be mixed into the initial workspace foundation migration.