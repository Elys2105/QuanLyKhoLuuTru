from django.contrib import admin

from apps.profiles.models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "profile_code",
        "title",
        "catalog",
        "storage_file",
        "year",
        "retention_period",
        "is_deleted",
    ]
    search_fields = [
        "profile_code",
        "title",
        "description",
        "search_text",
        "storage_file__file_number",
        "storage_file__box__box_number",
    ]
    list_filter = [
        "catalog",
        "year",
        "retention_period",
        "is_deleted",
    ]