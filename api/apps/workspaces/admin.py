from django.contrib import admin

from .models import Device, Workspace, WorkspaceMembership


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "status",
        "created_by",
        "created_at",
        "updated_at",
    )
    list_filter = ("status",)
    search_fields = ("name", "slug")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "workspace",
        "user",
        "role",
        "status",
        "is_default",
        "joined_at",
    )
    list_filter = ("role", "status", "is_default")
    search_fields = (
        "workspace__name",
        "workspace__slug",
        "user__username",
        "user__email",
    )
    readonly_fields = ("id", "joined_at", "updated_at")


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "workspace",
        "user",
        "platform",
        "app_version",
        "is_active",
        "last_seen_at",
    )
    list_filter = ("platform", "is_active")
    search_fields = (
        "name",
        "installation_id",
        "workspace__name",
        "user__username",
    )
    readonly_fields = (
        "id",
        "installation_id",
        "registered_at",
        "updated_at",
    )