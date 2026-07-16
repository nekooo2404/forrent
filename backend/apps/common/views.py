from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.views import APIView

from apps.common.email import SendifyEmailError, fetch_sendify_templates
from apps.common.permissions import IsAdmin
from apps.common.responses import error_response, success_response


class SendifyTemplatesAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, _request):
        try:
            templates = fetch_sendify_templates()
        except ImproperlyConfigured:
            return error_response(
                message="Sendify Account Key is not configured.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except SendifyEmailError:
            return error_response(
                message="Unable to load Sendify email templates.",
                status_code=status.HTTP_502_BAD_GATEWAY,
            )

        return success_response(data=templates)
