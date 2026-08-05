from django.contrib import admin

from apps.fonds.models import Fond


@admin.register(Fond)
class FondAdmin(admin.ModelAdmin):
    list_display = ["id", "code", "name", "is_deleted", "created_at"]
    search_fields = ["code", "name"]
    list_filter = ["is_deleted", "created_at"]