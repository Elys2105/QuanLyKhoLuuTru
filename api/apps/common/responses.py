from rest_framework.response import Response
from rest_framework import status

from apps.common.constants import ResponseMessage


def success_response(
    data=None,
    message=ResponseMessage.OK,
    status_code=status.HTTP_200_OK,
    meta=None,
):
    """
    Response thành công chuẩn.

    Format trả về:
    {
        "success": true,
        "message": "...",
        "data": {...},
        "meta": {...}
    }
    """

    body = {
        "success": True,
        "message": message,
        "data": data,
    }

    if meta is not None:
        body["meta"] = meta

    return Response(body, status=status_code)


def error_response(
    message,
    code=None,
    status_code=status.HTTP_400_BAD_REQUEST,
    details=None,
):
    """
    Response lỗi chuẩn.

    Format trả về:
    {
        "success": false,
        "error": {
            "code": "...",
            "message": "...",
            "details": {...}
        }
    }
    """

    error = {
        "code": code,
        "message": message,
    }

    if details is not None:
        error["details"] = details

    return Response(
        {
            "success": False,
            "error": error,
        },
        status=status_code,
    )