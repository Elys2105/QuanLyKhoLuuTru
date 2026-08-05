# V4-14 configuration contract

This contract applies to V4-14 source development. The installed V4-13 runtime remains unchanged until a separate migration and deployment pack is approved.

## Application mode

`APP_ENV` accepts `local`, `development`, `test`, `central`, `server`, `staging`, or `production`.

SQLite is permitted only in `local`, `development`, and `test`. Central/server/staging/production requires an explicit PostgreSQL engine and complete credentials. The application must fail clearly rather than silently falling back to SQLite.

## Canonical keys

Application: `APP_ENV`, `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`.

Database: `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.

Storage: `ARCHIVE_STORAGE_ROOT`, `MEDIA_URL`.

## Transitional aliases

Existing installer aliases are accepted temporarily: `DATABASE_*`, `POSTGRES_*`, `DJANGO_*`, and `MEDIA_ROOT`. Conflicting canonical and alias values cause startup failure. Error messages identify keys but never print their values.

`DATABASE_URL` is intentionally not consumed in this transition contract.

## Storage rule

`MEDIA_ROOT` is assigned once and is always derived from `ARCHIVE_STORAGE_ROOT` after alias resolution. Relative storage paths are resolved under the API base directory.

## Deployment boundary

PACK V4-14-01B V3 changes source only. It does not edit `D:\Server`, connect to a database, migrate data, build installers, or restart services.


## Explicit environment file selection

Launchers and Windows services may set `QLKLT_ENV_FILE` to an absolute path such as `D:\QLKLT-V414-Data\config\central.env` before Django starts. When this selector is present, settings load only that file and do not also load `api\.env`.

The selector must be set by the launcher or service and must not be placed inside an env file. If it is absent, local development keeps the existing default of `api\.env`. An explicit path that does not exist causes startup to fail clearly.

This prevents local-development values or transitional aliases such as `MEDIA_ROOT` from being mixed with central values such as `ARCHIVE_STORAGE_ROOT`.
