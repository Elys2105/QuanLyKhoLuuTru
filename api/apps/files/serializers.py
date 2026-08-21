from rest_framework import serializers

from apps.files.models import DigitalFile


class DigitalFileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    profile_title = serializers.CharField(source="profile.title", read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)
    storage_path = serializers.SerializerMethodField(read_only=True)
    file_url = serializers.SerializerMethodField(read_only=True)
    preview_url = serializers.SerializerMethodField(read_only=True)
    download_url = serializers.SerializerMethodField(read_only=True)
    pdf_preview_url = serializers.SerializerMethodField(read_only=True)
    pdf_download_url = serializers.SerializerMethodField(read_only=True)

    file_extension = serializers.SerializerMethodField(read_only=True)
    file_type = serializers.SerializerMethodField(read_only=True)
    file_type_label = serializers.SerializerMethodField(read_only=True)
    is_pdf = serializers.SerializerMethodField(read_only=True)
    is_word = serializers.SerializerMethodField(read_only=True)
    is_excel = serializers.SerializerMethodField(read_only=True)
    can_preview_inline = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DigitalFile
        fields = [
            "id",
            "profile",
            "profile_code",
            "profile_title",
            "document",
            "document_title",
            "file",
            "storage_path",
            "file_url",
            "preview_url",
            "download_url",
            "pdf_preview_url",
            "pdf_download_url",
            "original_name",
            "file_size",
            "mime_type",
            "file_extension",
            "file_type",
            "file_type_label",
            "is_pdf",
            "is_word",
            "is_excel",
            "can_preview_inline",
            "page_count",
            "is_primary",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "profile_code",
            "profile_title",
            "document_title",
            "storage_path",
            "file_url",
            "preview_url",
            "download_url",
            "pdf_preview_url",
            "pdf_download_url",
            "original_name",
            "file_size",
            "mime_type",
            "file_extension",
            "file_type",
            "file_type_label",
            "is_pdf",
            "is_word",
            "is_excel",
            "can_preview_inline",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

    def validate(self, attrs):
        """
        Kiểm tra tính hợp lệ khi upload file số hóa.

        Trường hợp có truyền document:
        - document phải thuộc đúng profile đang upload file.
        - Tránh lỗi: chọn hồ sơ A nhưng chọn thành phần hồ sơ của hồ sơ B.
        """

        profile = attrs.get("profile")
        document = attrs.get("document")

        if document and profile and document.profile_id != profile.id:
            raise serializers.ValidationError(
                "Thành phần hồ sơ không thuộc hồ sơ đã chọn."
            )

        return attrs

    def create(self, validated_data):
        """
        Tạo file số hóa mới.

        Nếu file mới được đánh dấu is_primary=True:
        - Các file khác cùng hồ sơ sẽ bị đổi is_primary=False.
        - Đảm bảo mỗi hồ sơ chỉ có 1 file chính.
        """

        instance = super().create(validated_data)

        if instance.is_primary:
            DigitalFile.objects.filter(
                profile=instance.profile,
                is_deleted=False,
            ).exclude(id=instance.id).update(is_primary=False)

        return instance

    def update(self, instance, validated_data):
        """
        Cập nhật file số hóa.

        Nếu cập nhật file này thành file chính:
        - Các file khác cùng hồ sơ sẽ bị tắt file chính.
        """

        instance = super().update(instance, validated_data)

        if instance.is_primary:
            DigitalFile.objects.filter(
                profile=instance.profile,
                is_deleted=False,
            ).exclude(id=instance.id).update(is_primary=False)

        return instance

    def get_storage_path(self, obj) -> str:
        try:
            return str(obj.file.name or "")
        except Exception:
            return ""

    # STEP21_12B_SECURE_FILE_URLS
    def _build_secure_file_url(self, obj, action: str) -> str | None:
        if not obj or not getattr(obj, "id", None):
            return None

        request = self.context.get("request")
        path = f"/api/digital-files/{obj.id}/{action}/"

        if request:
            return request.build_absolute_uri(path)

        return path

    def get_file_url(self, obj) -> str | None:
        # Giữ tên field cũ để frontend cũ không vỡ, nhưng không trả /media trực tiếp nữa.
        return self._build_secure_file_url(obj, "preview")

    def get_preview_url(self, obj) -> str | None:
        return self._build_secure_file_url(obj, "preview")

    def get_download_url(self, obj) -> str | None:
        return self._build_secure_file_url(obj, "download")

    def get_pdf_preview_url(self, obj) -> str | None:
        if not getattr(obj, "can_preview_inline", False):
            return None

        return self.get_preview_url(obj)

    def get_pdf_download_url(self, obj) -> str | None:
        return self.get_download_url(obj)
    def get_file_extension(self, obj) -> str:
        return obj.file_extension

    def get_file_type(self, obj) -> str:
        return obj.file_type

    def get_file_type_label(self, obj) -> str:
        return obj.file_type_label

    def get_is_pdf(self, obj) -> bool:
        return obj.is_pdf

    def get_is_word(self, obj) -> bool:
        return obj.is_word

    def get_is_excel(self, obj) -> bool:
        return obj.is_excel

    def get_can_preview_inline(self, obj) -> bool:
        return obj.can_preview_inline
