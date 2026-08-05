from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Mapping, Sequence

from django.core.exceptions import ImproperlyConfigured


_MISSING = object()
_CENTRAL_ENVS = {"central", "server", "staging", "production"}
_ALLOWED_APP_ENVS = {"local", "development", "test"} | _CENTRAL_ENVS


def _environment(environ: Mapping[str, str] | None = None) -> Mapping[str, str]:
    return os.environ if environ is None else environ


def _resolve(
    canonical: str,
    aliases: Sequence[str] = (),
    *,
    default: object = _MISSING,
    required: bool = False,
    normalizer: Callable[[str], object] | None = None,
    environ: Mapping[str, str] | None = None,
) -> object:
    env = _environment(environ)
    found: list[tuple[str, str, object]] = []

    for key in (canonical, *aliases):
        if key not in env:
            continue
        raw = str(env[key]).strip()
        if not raw:
            continue
        normalized = normalizer(raw) if normalizer else raw
        found.append((key, raw, normalized))

    distinct = {repr(item[2]) for item in found}
    if len(distinct) > 1:
        keys = ", ".join(item[0] for item in found)
        raise ImproperlyConfigured(
            f"Conflicting values were supplied for {canonical} through: {keys}. "
            "Keep one canonical value or make all aliases equivalent."
        )

    if found:
        canonical_match = next((item for item in found if item[0] == canonical), None)
        selected = canonical_match or found[0]
        return selected[2] if normalizer else selected[1]

    if default is not _MISSING:
        return default

    if required:
        accepted = ", ".join((canonical, *aliases))
        raise ImproperlyConfigured(f"Missing required configuration. Set one of: {accepted}")

    return ""


def get_env_value(
    canonical: str,
    aliases: Sequence[str] = (),
    *,
    default: object = _MISSING,
    required: bool = False,
    environ: Mapping[str, str] | None = None,
) -> str:
    value = _resolve(
        canonical,
        aliases,
        default=default,
        required=required,
        environ=environ,
    )
    return str(value)


def _normalize_bool(raw: str) -> bool:
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ImproperlyConfigured(f"Invalid boolean configuration value for a protected setting.")


def get_env_bool(
    canonical: str,
    aliases: Sequence[str] = (),
    *,
    default: bool = False,
    environ: Mapping[str, str] | None = None,
) -> bool:
    return bool(
        _resolve(
            canonical,
            aliases,
            default=default,
            normalizer=_normalize_bool,
            environ=environ,
        )
    )


def _normalize_csv(raw: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in raw.split(",") if item.strip())


def get_env_csv(
    canonical: str,
    aliases: Sequence[str] = (),
    *,
    default: str = "",
    environ: Mapping[str, str] | None = None,
) -> list[str]:
    value = _resolve(
        canonical,
        aliases,
        default=_normalize_csv(default),
        normalizer=_normalize_csv,
        environ=environ,
    )
    return list(value)


def get_app_env(environ: Mapping[str, str] | None = None) -> str:
    app_env = get_env_value("APP_ENV", default="local", environ=environ).strip().lower()
    if app_env not in _ALLOWED_APP_ENVS:
        allowed = ", ".join(sorted(_ALLOWED_APP_ENVS))
        raise ImproperlyConfigured(f"Unsupported APP_ENV={app_env!r}. Allowed values: {allowed}")
    return app_env


def normalize_db_engine(raw: str) -> str:
    value = raw.strip().lower()
    aliases = {
        "sqlite": "sqlite",
        "sqlite3": "sqlite",
        "django.db.backends.sqlite3": "sqlite",
        "postgres": "postgresql",
        "postgresql": "postgresql",
        "django.db.backends.postgresql": "postgresql",
    }
    try:
        return aliases[value]
    except KeyError as exc:
        accepted = ", ".join(sorted(aliases))
        raise ImproperlyConfigured(
            f"Unsupported DB_ENGINE. Accepted values: {accepted}"
        ) from exc


def resolve_database_config(
    base_dir: Path,
    *,
    app_env: str,
    environ: Mapping[str, str] | None = None,
) -> tuple[str, dict[str, object]]:
    env = _environment(environ)
    has_engine = any(str(env.get(key, "")).strip() for key in ("DB_ENGINE", "DATABASE_ENGINE"))

    if app_env in _CENTRAL_ENVS and not has_engine:
        raise ImproperlyConfigured(
            "DB_ENGINE is required when APP_ENV is central, server, staging or production."
        )

    engine = str(
        _resolve(
            "DB_ENGINE",
            ("DATABASE_ENGINE",),
            default="sqlite",
            normalizer=normalize_db_engine,
            environ=env,
        )
    )

    if app_env in _CENTRAL_ENVS and engine != "postgresql":
        raise ImproperlyConfigured(
            "SQLite is not permitted in central/server/staging/production mode."
        )

    if engine == "postgresql":
        name = get_env_value(
            "DB_NAME",
            ("DATABASE_NAME", "POSTGRES_DB"),
            required=True,
            environ=env,
        )
        user = get_env_value(
            "DB_USER",
            ("DATABASE_USER", "POSTGRES_USER"),
            required=True,
            environ=env,
        )
        password = get_env_value(
            "DB_PASSWORD",
            ("DATABASE_PASSWORD", "POSTGRES_PASSWORD"),
            required=True,
            environ=env,
        )
        host = get_env_value(
            "DB_HOST",
            ("DATABASE_HOST", "POSTGRES_HOST"),
            required=True,
            environ=env,
        )
        port = get_env_value(
            "DB_PORT",
            ("DATABASE_PORT", "POSTGRES_PORT"),
            required=True,
            environ=env,
        )
        return engine, {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": name,
            "USER": user,
            "PASSWORD": password,
            "HOST": host,
            "PORT": port,
        }

    sqlite_name = get_env_value(
        "DB_NAME",
        ("DATABASE_NAME",),
        default="db.sqlite3",
        environ=env,
    )
    sqlite_path = Path(sqlite_name)
    if not sqlite_path.is_absolute():
        sqlite_path = Path(base_dir) / sqlite_path

    return engine, {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": sqlite_path,
    }


def resolve_storage_root(
    base_dir: Path,
    *,
    environ: Mapping[str, str] | None = None,
) -> Path:
    raw = get_env_value(
        "ARCHIVE_STORAGE_ROOT",
        ("MEDIA_ROOT",),
        default=str(Path(base_dir) / "media"),
        environ=environ,
    )
    path = Path(raw)
    if not path.is_absolute():
        path = Path(base_dir) / path
    return path
