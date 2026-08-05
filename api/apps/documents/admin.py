from django.contrib import admin

from apps.documents.models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "document_code",
        "title",
        "profile",
        "document_date",
        "author",
        "is_deleted",
    ]
    search_fields = [
        "document_code",
        "title",
        "author",
        "summary",
        "search_text",
        "profile__profile_code",
        "profile__title",
    ]
    list_filter = ["document_date", "author", "is_deleted"]