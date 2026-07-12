from __future__ import annotations

import re
import sys
from pathlib import Path

ROOTS = [Path("frontend-client"), Path("frontend-admin")]
EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}
SENSITIVE_KEY_PARTS = ("access", "auth", "refresh", "session", "token", "user")
SET_ITEM = re.compile(r"(?:window\.)?(?:localStorage|sessionStorage)\s*\.\s*setItem\(\s*['\"]([^'\"]+)['\"]")
BRACKET_WRITE = re.compile(r"(?:window\.)?(?:localStorage|sessionStorage)\s*\[\s*['\"]([^'\"]+)['\"]\s*\]")


def is_sensitive_key(key: str) -> bool:
    lowered = key.lower()
    return any(part in lowered for part in SENSITIVE_KEY_PARTS)


def scan_line(line: str) -> str | None:
    for pattern in (SET_ITEM, BRACKET_WRITE):
        match = pattern.search(line)
        if match and is_sensitive_key(match.group(1)):
            return match.group(1)
    return None


def scan_file(path: Path) -> list[tuple[int, str]]:
    findings = []
    for number, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
        key = scan_line(line)
        if key:
            findings.append((number, key))
    return findings


def iter_files() -> list[Path]:
    return [
        path
        for root in ROOTS
        if root.exists()
        for path in root.rglob("*")
        if path.is_file() and path.suffix in EXTENSIONS and "node_modules" not in path.parts
    ]


def self_test() -> None:
    assert scan_line('localStorage.setItem("theme", theme)') is None
    assert scan_line('window.localStorage.setItem("access", token)') == "access"
    assert scan_line('sessionStorage.setItem("currentUser", JSON.stringify(user))') == "currentUser"


def main() -> None:
    if "--self-test" in sys.argv:
        self_test()
        return

    failures = [(path, hits) for path in iter_files() if (hits := scan_file(path))]
    for path, hits in failures:
        print(path)
        for number, key in hits:
            print(f"  {number}: browser storage write to sensitive key {key!r}")

    if failures:
        raise SystemExit("browser auth data must not be persisted in localStorage/sessionStorage")


if __name__ == "__main__":
    main()
