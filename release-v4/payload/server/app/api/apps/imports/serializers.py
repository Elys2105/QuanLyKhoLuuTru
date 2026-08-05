from rest_framework import serializers


class ProfileImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    dry_run = serializers.BooleanField(required=False, default=False)
    client_rows_json = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
    sheet_name = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate_file(self, file):
        """
        Chỉ cho upload file Excel .xlsx.
        """

        if not file:
            raise serializers.ValidationError("Vui lòng chọn file Excel.")

        filename = file.name.lower()

        if not filename.endswith(".xlsx"):
            raise serializers.ValidationError("Chỉ hỗ trợ file Excel .xlsx.")

        max_size = 10 * 1024 * 1024

        if file.size > max_size:
            raise serializers.ValidationError("File Excel không được vượt quá 10MB.")

        return file