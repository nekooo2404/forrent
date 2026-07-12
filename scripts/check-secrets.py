from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

SKIP_PARTS = {".git", ".next", "node_modules", "playwright-report", "test-results", "venv", ".venv"}
EXTENSIONS = {".css", ".env", ".example", ".json", ".md", ".py", ".sh", ".ts", ".tsx", ".yml", ".yaml"}
SENSITIVE_KEYS = {
    "ADMIN_SENTRY_DSN",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "DJANGO_SECRET_KEY",
    "FRONTEND_SENTRY_DSN",
    "SENTRY_DSN",
    "SUPABASE_SECRET_KEY",
}
ASSIGNMENT = re.compile(r"(?P<key>[A-Z][A-Z0-9_]*(?:SECRET|KEY|DSN)[A-Z0-9_]*)\s*[:=]\s*(?P<value>.+)")
ALLOW_VALUE_PARTS = (
    "${",
    "change-me",
    "ci-",
    "demo",
    "env(",
    "example",
    "placeholder",
    "unsafe-local",
    "<",
)
ALLOW_EXACT_VALUES = {"key", "secret"}


def listed_files() -> list[Path]:
    output = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        text=True,
    )
    return [Path(line) for line in output.splitlines() if line]


def clean_value(raw: str) -> str:
    return raw.strip().strip(",").strip('"').strip("'")


def is_allowed_value(value: str) -> bool:
    lowered = value.lower()
    return not value or lowered in ALLOW_EXACT_VALUES or any(part in lowered for part in ALLOW_VALUE_PARTS)


def should_scan(path: Path) -> bool:
    return path.is_file() and path.suffix in EXTENSIONS and not any(part in SKIP_PARTS for part in path.parts)


def scan_file(path: Path) -> list[tuple[int, str]]:
    findings = []
    for number, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
        match = ASSIGNMENT.search(line)
        if not match:
            continue
        key = match.group("key")
        value = clean_value(match.group("value"))
        if key in SENSITIVE_KEYS and not is_allowed_value(value):
            findings.append((number, key))
    return findings


def self_test() -> None:
    assert is_allowed_value("")
    assert is_allowed_value("${{ secrets.CLOUDINARY_API_SECRET }}")
    assert is_allowed_value("change-me")
    assert is_allowed_value('env("CLOUDINARY_API_SECRET", default="")')
    assert is_allowed_value("key")
    assert is_allowed_value("secret")
    assert not is_allowed_value("A1b2C3d4E5f6G7h8I9j0K1l2M3")
    assert clean_value('"abc",') == "abc"


def main() -> None:
    if "--self-test" in sys.argv:
        self_test()
        return

    failures = []
    for path in listed_files():
        if should_scan(path):
            hits = scan_file(path)
            if hits:
                failures.append((path, hits))

    for path, hits in failures:
        print(path)
        for number, key in hits:
            print(f"  {number}: {key}=<redacted>")

    if failures:
        raise SystemExit("potential committed secret found")


if __name__ == "__main__":
    main()
