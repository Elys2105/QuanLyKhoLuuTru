from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


User = get_user_model()

ROLE_ADMIN = "ADMIN"
ROLE_MANAGER = "MANAGER"
ROLE_STAFF = "STAFF"
ROLE_VIEWER = "VIEWER"

ROLE_PRIORITY = [
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_VIEWER,
]

VALID_ROLES = set(ROLE_PRIORITY)


def get_user_groups(user) -> list[str]:
    if not user:
        return []

    group_names = []

    for name in user.groups.values_list("name", flat=True):
        normalized = str(name or "").strip().upper()

        if normalized in VALID_ROLES and normalized not in group_names:
            group_names.append(normalized)

    return group_names


def get_user_effective_role(user) -> str:
    if not user:
        return ROLE_VIEWER

    if user.is_superuser:
        return ROLE_ADMIN

    groups = get_user_groups(user)

    for role in ROLE_PRIORITY:
        if role in groups:
            return role

    if user.is_staff:
        return ROLE_MANAGER

    return ROLE_VIEWER


def build_user_payload(user) -> dict:
    full_name = user.get_full_name() or user.username
    groups = get_user_groups(user)
    role = get_user_effective_role(user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": full_name,
        "role": role,
        "groups": groups,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "date_joined": user.date_joined,
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer đăng nhập JWT.

    Output bổ sung:
    - user.role
    - user.groups
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = build_user_payload(self.user)
        return data


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer trả thông tin user đang đăng nhập.
    Role lấy từ Django Group, không thêm field role vào DB.
    """

    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "groups",
            "is_staff",
            "is_superuser",
            "is_active",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        full_name = obj.get_full_name()
        return full_name or obj.username

    def get_role(self, obj):
        return get_user_effective_role(obj)

    def get_groups(self, obj):
        return get_user_groups(obj)


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer đổi mật khẩu.
    """

    old_password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
    )

    def validate_old_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng")

        return value

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Mật khẩu xác nhận không khớp"
                }
            )

        validate_password(new_password, self.context["request"].user)

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])

        return user


class LogoutSerializer(serializers.Serializer):
    """
    Serializer logout.
    """

    refresh = serializers.CharField(required=True)
