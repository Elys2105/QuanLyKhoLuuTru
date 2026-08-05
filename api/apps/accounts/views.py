from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    UserMeSerializer,
)
from apps.common.constants import ResponseMessage
from apps.common.responses import success_response


class LoginView(TokenObtainPairView):
    """
    API đăng nhập.

    POST /api/auth/login/

    Body:
    {
        "username": "Admin",
        "password": "..."
    }
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RefreshTokenView(TokenRefreshView):
    """
    API refresh access token.

    POST /api/auth/refresh/

    Body:
    {
        "refresh": "..."
    }
    """

    permission_classes = [AllowAny]


class MeView(APIView):
    """
    API lấy thông tin user đang đăng nhập.

    GET /api/auth/me/
    Header:
    Authorization: Bearer <access_token>
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserMeSerializer

    def get(self, request):
        serializer = UserMeSerializer(request.user)

        return success_response(
            data=serializer.data,
            message=ResponseMessage.OK,
        )


class ChangePasswordView(APIView):
    """
    API đổi mật khẩu user đang đăng nhập.

    POST /api/auth/change-password/
    Header:
    Authorization: Bearer <access_token>

    Body:
    {
        "old_password": "...",
        "new_password": "...",
        "confirm_password": "..."
    }
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return success_response(
            data=None,
            message="Đổi mật khẩu thành công",
        )


class LogoutView(APIView):
    """
    API logout.

    POST /api/auth/logout/
    Header:
    Authorization: Bearer <access_token>

    Body:
    {
        "refresh": "..."
    }
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()

        return success_response(
            data=None,
            message="Đăng xuất thành công",
            status_code=status.HTTP_200_OK,
        )