from django.contrib import admin

from apps.files.models import DigitalFile


@admin.register(DigitalFile)
class DigitalFileAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "profile",
        "document",
        "original_name",
        "file_size",
        "page_count",
        "is_primary",
        "is_deleted",
    ]
    search_fields = [
        "original_name",
        "profile__profile_code",
        "profile__title",
        "document__title",
    ]
    list_filter = ["is_primary", "is_deleted", "created_at"]