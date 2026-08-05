from django.contrib import admin

from apps.storage.models import StorageBox, StorageFile, StorageLocation, Warehouse


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["id", "code", "name", "address", "is_deleted"]
    search_fields = ["code", "name", "address"]
    list_filter = ["is_deleted"]


@admin.register(StorageLocation)
class StorageLocationAdmin(admin.ModelAdmin):
    list_display = ["id", "warehouse", "code", "name", "is_deleted"]
    search_fields = ["code", "name", "warehouse__name"]
    list_filter = ["warehouse", "is_deleted"]


@admin.register(StorageBox)
class StorageBoxAdmin(admin.ModelAdmin):
    list_display = ["id", "box_number", "fond", "catalog", "location", "is_deleted"]
    search_fields = ["box_number", "title", "fond__name", "catalog__name"]
    list_filter = ["fond", "catalog", "location", "is_deleted"]


@admin.register(StorageFile)
class StorageFileAdmin(admin.ModelAdmin):
    list_display = ["id", "file_number", "box", "title", "is_deleted"]
    search_fields = ["file_number", "title", "box__box_number"]
    list_filter = ["box", "is_deleted"]