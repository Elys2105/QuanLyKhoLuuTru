from __future__ import annotations

import json
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from config.env_contract import (  # noqa: E402
    get_env_bool,
    get_env_csv,
    resolve_database_config,
    resolve_storage_root,
)


def expect_error(callback, contains: str) -> None:
    try:
        callback()
    except ImproperlyConfigured as exc:
        if contains.lower() not in str(exc).lower():
            raise AssertionError(f"Unexpected error: {exc}") from exc
    else:
        raise AssertionError("Expected ImproperlyConfigured")


base = Path(r"C:\qlklt-test-api")
checks: list[str] = []

canonical = {
    "DB_ENGINE": "postgres",
    "DB_NAME": "archive_v414",
    "DB_USER": "archive_user",
    "DB_PASSWORD": "not-a-real-secret",
    "DB_HOST": "127.0.0.1",
    "DB_PORT": "5432",
}
engine, db = resolve_database_config(base, app_env="central", environ=canonical)
assert engine == "postgresql"
assert db["ENGINE"] == "django.db.backends.postgresql"
assert db["NAME"] == "archive_v414"
checks.append("canonical-postgresql")

installer_aliases = {
    "DATABASE_ENGINE": "django.db.backends.postgresql",
    "DATABASE_NAME": "archive_v414",
    "DATABASE_USER": "archive_user",
    "DATABASE_PASSWORD": "not-a-real-secret",
    "DATABASE_HOST": "localhost",
    "DATABASE_PORT": "5432",
}
engine, db = resolve_database_config(base, app_env="server", environ=installer_aliases)
assert engine == "postgresql"
assert db["HOST"] == "localhost"
checks.append("database-aliases")

postgres_aliases = {
    "DB_ENGINE": "postgresql",
    "POSTGRES_DB": "archive_v414",
    "POSTGRES_USER": "archive_user",
    "POSTGRES_PASSWORD": "not-a-real-secret",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
}
engine, db = resolve_database_config(base, app_env="production", environ=postgres_aliases)
assert engine == "postgresql"
assert db["USER"] == "archive_user"
checks.append("postgres-aliases")

engine, db = resolve_database_config(
    base,
    app_env="local",
    environ={"DB_ENGINE": "sqlite", "DB_NAME": "local.sqlite3"},
)
assert engine == "sqlite"
assert str(db["NAME"]).lower().endswith("local.sqlite3")
checks.append("explicit-local-sqlite")

storage = resolve_storage_root(base, environ={"MEDIA_ROOT": "records"})
assert storage == base / "records"
checks.append("storage-alias")

assert get_env_bool("DEBUG", ("DJANGO_DEBUG",), environ={"DJANGO_DEBUG": "true"}) is True
assert get_env_csv("ALLOWED_HOSTS", environ={"ALLOWED_HOSTS": "localhost, 127.0.0.1"}) == [
    "localhost",
    "127.0.0.1",
]
checks.append("typed-values")

expect_error(
    lambda: resolve_database_config(
        base,
        app_env="central",
        environ={"DB_ENGINE": "sqlite", "DB_NAME": "bad.sqlite3"},
    ),
    "SQLite is not permitted",
)
checks.append("central-sqlite-blocked")

expect_error(
    lambda: resolve_database_config(base, app_env="central", environ={}),
    "DB_ENGINE is required",
)
checks.append("central-missing-engine-blocked")

missing_password = dict(canonical)
missing_password.pop("DB_PASSWORD")
expect_error(
    lambda: resolve_database_config(base, app_env="central", environ=missing_password),
    "Missing required configuration",
)
checks.append("missing-postgres-credential-blocked")

conflict = dict(canonical)
conflict["DATABASE_NAME"] = "different_database"
expect_error(
    lambda: resolve_database_config(base, app_env="central", environ=conflict),
    "Conflicting values",
)
checks.append("conflicting-alias-blocked")

engine, db = resolve_database_config(
    base,
    app_env="local",
    environ={"DATABASE_URL": "postgresql://ignored.invalid/example"},
)
assert engine == "sqlite"
assert db["ENGINE"] == "django.db.backends.sqlite3"
checks.append("database-url-not-consumed")

print(
    json.dumps(
        {
            "ok": True,
            "check_count": len(checks),
            "checks": checks,
        },
        indent=2,
    )
)
