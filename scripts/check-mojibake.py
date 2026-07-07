from pathlib import Path

SKIP_DIRS = {".git", ".next", "node_modules", "staticfiles", "venv", ".venv", "playwright-report", "test-results"}
EXTENSIONS = {".css", ".json", ".md", ".py", ".ts", ".tsx", ".yml", ".yaml"}
PATTERNS = (
    "Ã¡", "Ã ", "Ã¢", "Ã£", "Ã©", "Ã¨", "Ãª", "Ã­", "Ã¬", "Ã³", "Ã²", "Ã´", "Ãµ",
    "Ãº", "Ã¹", "Ã½", "áº", "á»", "Æ°", "Æ¡", "Ä‘", "Ä", "Â·", "â€", "â€¢",
)


def scan_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="ignore")
    return [(number, line.strip()) for number, line in enumerate(text.splitlines(), 1) if any(pattern in line for pattern in PATTERNS)]


def main():
    failures = []
    self_path = Path(__file__).resolve()
    for path in Path(".").rglob("*"):
        if path.resolve() == self_path:
            continue
        if any(part in SKIP_DIRS for part in path.parts) or path.suffix not in EXTENSIONS or not path.is_file():
            continue
        hits = scan_file(path)
        if hits:
            failures.append((path, hits[:5]))

    for path, hits in failures:
        print(path)
        for number, line in hits:
            print(f"  {number}: {line[:180]}")

    if failures:
        raise SystemExit("mojibake-looking text found")


if __name__ == "__main__":
    main()
