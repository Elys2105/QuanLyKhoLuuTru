from apps.audit.services import create_audit_log_from_request


class AuditLogMiddleware:
    """
    Middleware ghi audit log tự động cho các API quan trọng.

    Đặt sau AuthenticationMiddleware trong settings.py.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        create_audit_log_from_request(request, response)

        return response