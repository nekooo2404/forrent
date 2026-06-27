from rest_framework.renderers import JSONRenderer


class StandardJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") if renderer_context else None
        if response is not None and isinstance(data, dict) and {"success", "message"}.issubset(data.keys()):
            return super().render(data, accepted_media_type, renderer_context)
        if response is not None and response.exception:
            payload = {
                "success": False,
                "message": "Error",
                "errors": data,
            }
        else:
            payload = {
                "success": True,
                "message": "Success",
                "data": data if data is not None else {},
            }
        return super().render(payload, accepted_media_type, renderer_context)
