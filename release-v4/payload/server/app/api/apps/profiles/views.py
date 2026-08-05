from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.common.views import BaseModelViewSet
from apps.profiles.models import Profile
from apps.profiles.serializers import ProfileSerializer
from apps.permissions.permissions import AuthenticatedReadOnlyArchivePermission


class ProfileViewSet(BaseModelViewSet):
    queryset = (
        Profile.objects
        .select_related(
            "catalog",
            "catalog__fond",
            "storage_file",
            "storage_file__box",
            "storage_file__box__location",
            "storage_file__box__location__warehouse",
        )
        .all()
    )
    serializer_class = ProfileSerializer
    permission_classes = [AuthenticatedReadOnlyArchivePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "catalog",
        "storage_file",
        "year",
        "profile_type",
        "retention_period",
        "physical_condition",
        "is_deleted",
    ]
    search_fields = [
        "profile_type",
        "profile_code",
        "file_notation",
        "title",
        "description",
        "preservation_unit_number",
        "historical_archive_code",
        "profile_group_name",
        "retention_period",
        "physical_condition",
        "keywords",
        "topic",
        "storage_position_text",
        "search_text",
        "storage_file__file_number",
        "storage_file__box__box_number",
        "storage_file__box__location__code",
        "storage_file__box__location__name",
        "storage_file__box__location__warehouse__code",
        "storage_file__box__location__warehouse__name",
        "catalog__code",
        "catalog__name",
        "catalog__fond__code",
        "catalog__fond__name",
    ]
    ordering_fields = [
        "id",
        "profile_code",
        "file_notation",
        "title",
        "year",
        "created_at",
        "updated_at",
    ]
    ordering = ["catalog", "profile_code"]