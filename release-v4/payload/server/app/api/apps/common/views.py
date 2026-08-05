from rest_framework import viewsets
from apps.common.constants import ResponseMessage
from apps.common.responses import success_response

from apps.permissions.permissions import ArchiveCRUDPermission

class BaseModelViewSet(viewsets.ModelViewSet):
    """
    ViewSet nền cho các API CRUD nghiệp vụ.

    Tính năng:
    - Mặc định yêu cầu đăng nhập.
    - Tự động ẩn bản ghi is_deleted=True.
    - DELETE là xóa mềm, không xóa vật lý.
    - Response trả về format chuẩn success/message/data.
    """

    permission_classes = [ArchiveCRUDPermission]

    def get_queryset(self):
        queryset = super().get_queryset()

        model = getattr(queryset, "model", None)

        if model and hasattr(model, "is_deleted"):
            queryset = queryset.filter(is_deleted=False)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return success_response(
            data=serializer.data,
            message=ResponseMessage.CREATED,
            status_code=201,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return success_response(
            data=serializer.data,
            message=ResponseMessage.OK,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return success_response(
            data=serializer.data,
            message=ResponseMessage.UPDATED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if hasattr(instance, "is_deleted"):
            instance.is_deleted = True
            instance.save(update_fields=["is_deleted", "updated_at"])

            return success_response(
                data=None,
                message=ResponseMessage.DELETED,
            )

        self.perform_destroy(instance)

        return success_response(
            data=None,
            message=ResponseMessage.DELETED,
        )