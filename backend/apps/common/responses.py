from rest_framework.response import Response


def success_response(data=None, message="Success", status_code=200, **extra):
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {},
    }
    payload.update(extra)
    return Response(payload, status=status_code)


def error_response(message="Error", errors=None, status_code=400, **extra):
    payload = {
        "success": False,
        "message": message,
        "errors": errors if errors is not None else {},
    }
    payload.update(extra)
    return Response(payload, status=status_code)
