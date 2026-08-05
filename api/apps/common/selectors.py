def get_object_or_none(model_class, **filters):
    """
    Lấy object hoặc trả None nếu không tồn tại.
    """

    try:
        return model_class.objects.get(**filters)
    except model_class.DoesNotExist:
        return None


def get_active_queryset(model_class):
    """
    Lấy queryset chưa bị xóa mềm nếu model có is_deleted.
    """

    queryset = model_class.objects.all()

    if hasattr(model_class, "is_deleted"):
        queryset = queryset.filter(is_deleted=False)

    return queryset