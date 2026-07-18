#!/bin/sh
set -e

python - <<'PY'
import os
import socket
import time
from urllib.parse import urlparse


def wait_for_service(env_name, default_port, attempts=60):
    url = os.getenv(env_name)
    if not url:
        return

    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or default_port
    if not host:
        return

    print(f"Waiting for {env_name} at {host}:{port}...")
    for attempt in range(1, attempts + 1):
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"{env_name} is ready.")
                return
        except OSError:
            if attempt == attempts:
                raise
            time.sleep(1)


wait_for_service("DATABASE_URL", 5432)
wait_for_service("REDIS_URL", 6379)
PY

if [ "${RUN_DJANGO_STARTUP_TASKS:-1}" = "1" ]; then
    echo "Running Django startup tasks..."
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
else
    echo "Skipping Django startup tasks for this service."
fi

exec "$@"
