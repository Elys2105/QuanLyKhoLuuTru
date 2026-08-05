from django.contrib import admin

from apps.catalogs.models import Catalog


@admin.register(Catalog)
class CatalogAdmin(admin.ModelAdmin):
    list_display = ["id", "code", "name", "fond", "year", "is_deleted"]
    search_fields = ["code", "name", "fond__name"]
    list_filter = ["fond", "year", "is_deleted"]