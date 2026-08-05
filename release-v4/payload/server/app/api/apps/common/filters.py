import django_filters


class BaseDateRangeFilter(django_filters.FilterSet):
    """
    Filter ngày tạo/cập nhật dùng chung.

    Hỗ trợ query:
    ?created_from=2026-01-01
    ?created_to=2026-12-31
    ?updated_from=2026-01-01
    ?updated_to=2026-12-31
    ?is_deleted=false
    """

    created_from = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    created_to = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )
    updated_from = django_filters.DateTimeFilter(
        field_name="updated_at",
        lookup_expr="gte",
    )
    updated_to = django_filters.DateTimeFilter(
        field_name="updated_at",
        lookup_expr="lte",
    )
    is_deleted = django_filters.BooleanFilter(field_name="is_deleted")

    class Meta:
        fields = [
            "created_from",
            "created_to",
            "updated_from",
            "updated_to",
            "is_deleted",
        ]