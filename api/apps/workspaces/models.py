from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class Workspace(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_workspaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workspaces"
        ordering = ("name", "id")
        indexes = [
            models.Index(
                fields=("status", "name"),
                name="ws_status_name_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class WorkspaceMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Administrator"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        default=Role.VIEWER,
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    is_default = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workspace_memberships"
        ordering = ("workspace_id", "user_id")
        constraints = [
            models.UniqueConstraint(
                fields=("workspace", "user"),
                name="uq_workspace_member",
            ),
            models.UniqueConstraint(
                fields=("user",),
                condition=models.Q(
                    is_default=True,
                    status="active",
                ),
                name="uq_user_default_workspace",
            ),
        ]
        indexes = [
            models.Index(
                fields=("workspace", "status"),
                name="wm_workspace_status_idx",
            ),
            models.Index(
                fields=("user", "status"),
                name="wm_user_status_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.workspace} / {self.user} / {self.role}"


class Device(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    installation_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="devices",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workspace_devices",
    )
    name = models.CharField(max_length=200)
    platform = models.CharField(max_length=64, blank=True)
    app_version = models.CharField(max_length=32, blank=True)
    fingerprint_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="Optional SHA-256-style hash; never store raw hardware identifiers.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workspace_devices"
        ordering = ("workspace_id", "name", "id")
        indexes = [
            models.Index(
                fields=("workspace", "is_active"),
                name="wd_workspace_active_idx",
            ),
            models.Index(
                fields=("user", "is_active"),
                name="wd_user_active_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.installation_id})"