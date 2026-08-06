from __future__ import annotations

import json
import os
import sys
import traceback
import uuid
from pathlib import Path

expected_argv_count = 3

if len(sys.argv) != expected_argv_count:
    raise SystemExit(
        "Usage: checker.py <api_root> <output_json>; "
        f"expected sys.argv={expected_argv_count}, actual={len(sys.argv)}"
    )

api_root = Path(sys.argv[1]).resolve()
output_path = Path(sys.argv[2]).resolve()

result: dict[str, object] = {
    "ok": False,
    "api_root": str(api_root),
    "output_path": str(output_path),
    "sys_path_injected": False,
    "working_directory_selected": False,
    "checks": {},
    "failed": [],
    "errors": [],
}

try:
    settings_path = api_root / "config" / "settings.py"
    manage_path = api_root / "manage.py"

    if not settings_path.is_file():
        raise RuntimeError(f"config/settings.py not found under API root: {api_root}")

    if not manage_path.is_file():
        raise RuntimeError(f"manage.py not found under API root: {api_root}")

    api_root_text = str(api_root)

    while api_root_text in sys.path:
        sys.path.remove(api_root_text)

    sys.path.insert(0, api_root_text)
    result["sys_path_injected"] = sys.path[0] == api_root_text

    os.chdir(api_root)
    result["working_directory_selected"] = Path.cwd().resolve() == api_root

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    import django

    django.setup()

    from django.conf import settings
    from django.db import models
    from django.db.migrations.loader import MigrationLoader

    from apps.workspaces.models import Device, Workspace, WorkspaceMembership

    def constraint_names(model: type[models.Model]) -> set[str]:
        return {
            item.name
            for item in model._meta.constraints
            if getattr(item, "name", None)
        }

    def index_names(model: type[models.Model]) -> set[str]:
        return {
            item.name
            for item in model._meta.indexes
            if getattr(item, "name", None)
        }

    def related_label(model: type[models.Model], field_name: str) -> str:
        field = model._meta.get_field(field_name)
        return field.remote_field.model._meta.label

    checks: dict[str, bool] = {
        "api_root_on_sys_path": sys.path[0] == api_root_text,
        "working_directory_is_api_root": Path.cwd().resolve() == api_root,
        "app_installed": "apps.workspaces" in settings.INSTALLED_APPS,
        "workspace_uuid_primary_key": (
            isinstance(Workspace._meta.pk, models.UUIDField)
            and Workspace._meta.pk.primary_key
            and Workspace._meta.pk.default is uuid.uuid4
        ),
        "membership_uuid_primary_key": (
            isinstance(WorkspaceMembership._meta.pk, models.UUIDField)
            and WorkspaceMembership._meta.pk.primary_key
            and WorkspaceMembership._meta.pk.default is uuid.uuid4
        ),
        "device_uuid_primary_key": (
            isinstance(Device._meta.pk, models.UUIDField)
            and Device._meta.pk.primary_key
            and Device._meta.pk.default is uuid.uuid4
        ),
        "workspace_table": Workspace._meta.db_table == "workspaces",
        "membership_table": (
            WorkspaceMembership._meta.db_table == "workspace_memberships"
        ),
        "device_table": Device._meta.db_table == "workspace_devices",
        "workspace_user_reference": (
            related_label(Workspace, "created_by") == settings.AUTH_USER_MODEL
        ),
        "membership_user_reference": (
            related_label(WorkspaceMembership, "user")
            == settings.AUTH_USER_MODEL
        ),
        "device_user_reference": (
            related_label(Device, "user") == settings.AUTH_USER_MODEL
        ),
        "membership_workspace_reference": (
            related_label(WorkspaceMembership, "workspace")
            == Workspace._meta.label
        ),
        "device_workspace_reference": (
            related_label(Device, "workspace") == Workspace._meta.label
        ),
        "membership_unique_constraints": {
            "uq_workspace_member",
            "uq_user_default_workspace",
        }.issubset(constraint_names(WorkspaceMembership)),
        "workspace_index": (
            "ws_status_name_idx" in index_names(Workspace)
        ),
        "membership_indexes": {
            "wm_workspace_status_idx",
            "wm_user_status_idx",
        }.issubset(index_names(WorkspaceMembership)),
        "device_indexes": {
            "wd_workspace_active_idx",
            "wd_user_active_idx",
        }.issubset(index_names(Device)),
        "installation_id_unique": (
            Device._meta.get_field("installation_id").unique
        ),
        "fingerprint_is_hash_only": (
            Device._meta.get_field("fingerprint_hash").max_length == 64
        ),
    }

    loader = MigrationLoader(None, ignore_no_migrations=True)
    leaf_nodes = {
        f"{app_label}.{name}"
        for app_label, name in loader.graph.leaf_nodes()
    }

    checks["workspace_initial_migration_leaf"] = (
        "workspaces.0001_initial" in leaf_nodes
    )

    failed = sorted(
        name
        for name, passed in checks.items()
        if not passed
    )

    result.update(
        {
            "ok": not failed,
            "checks": checks,
            "failed": failed,
            "auth_user_model": settings.AUTH_USER_MODEL,
            "models": [
                Workspace._meta.label,
                WorkspaceMembership._meta.label,
                Device._meta.label,
            ],
            "leaf_nodes": sorted(leaf_nodes),
        }
    )
except Exception as exc:
    result["errors"].append(
        {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
    )
finally:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

if not result["ok"]:
    failed_text = ", ".join(result.get("failed", []))
    error_text = "; ".join(
        f"{item['type']}: {item['message']}"
        for item in result.get("errors", [])
    )

    details = " | ".join(
        part
        for part in (failed_text, error_text)
        if part
    )

    raise SystemExit(
        "Workspace foundation checks failed"
        + (f": {details}" if details else "")
    )