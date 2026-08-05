from apps.common.responses import success_response
from apps.common.constants import ResponseMessage


class ResponseMixin:
    """
    Mixin giúp ViewSet trả response chuẩn.
    """

    def success_response(self, data=None, message=ResponseMessage.OK, status_code=200, meta=None):
        return success_response(
            data=data,
            message=message,
            status_code=status_code,
            meta=meta,
        )


class SoftDeleteQuerySetMixin:
    """
    Mixin cho queryset loại bỏ dữ liệu đã xóa mềm.
    """

    def get_queryset(self):
        queryset = super().get_queryset()

        model = getattr(queryset, "model", None)

        if model and hasattr(model, "is_deleted"):
            queryset = queryset.filter(is_deleted=False)

        return queryset