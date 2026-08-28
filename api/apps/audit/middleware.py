from apps.audit.services import create_audit_log_from_request


class AuditLogMiddleware:
    """
    Middleware ghi audit log tự động cho các API quan trọng.

    Đặt sau AuthenticationMiddleware trong settings.py.
    """

    INTERNAL_SERVICE_PREFIXES = (
        "/api/ocr/worker/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Durable OCR worker endpoints are authenticated by the dedicated
        # X-QLKLT-Worker-Token service credential, not a Django user/JWT.
        # They are a high-frequency internal control plane (health, claim,
        # heartbeat, chunk/result). Do not send them through the user audit
        # pipeline: doing so can both flood audit_logs and turn a valid worker
        # response into HTTP 500 if user-audit extraction rejects the request.
        path = str(getattr(request, "path", "") or "")
        if any(path.startswith(prefix) for prefix in self.INTERNAL_SERVICE_PREFIXES):
            return response

        create_audit_log_from_request(request, response)

        return response
