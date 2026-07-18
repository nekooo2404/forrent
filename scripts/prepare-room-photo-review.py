from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_API_URL = "https://api.forrent.io.vn"
TIMEOUT_SECONDS = 20
ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = ROOT / "backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_PATH))

try:
    from apps.rooms.public_copy import public_room_title
except ImportError:  # pragma: no cover - defensive for standalone artifact use.
    public_room_title = None


@dataclass(frozen=True)
class RoomPhotoRow:
    auto_checks: list[str]
    created_at: str
    public_title: str
    raw_title: str
    room_id: str
    slug: str
    suggested_public_title: str
    thumbnail_url: str


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "forrent-room-photo-review/1.0"})
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_text(url))


def rooms_api_url(api_url: str, limit: int) -> str:
    params = urlencode({"ordering": "-created_at", "page_size": limit, "status": "PUBLISHED"})
    return f"{api_url.rstrip('/')}/api/rooms/?{params}"


def api_results(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data", payload)
    if not isinstance(data, dict):
        return []
    results = data.get("results", [])
    return results if isinstance(results, list) else []


def has_emoji(value: str) -> bool:
    return bool(re.search(r"[\U0001F300-\U0001FAFF]", value))


def has_internal_code(value: str) -> bool:
    return bool(re.search(r"\b(?:P|PHONG|ROOM|CAN|CH|A|B|C)\s*[-_.]?\s*\d{2,}\b", value, re.IGNORECASE))


def has_mojibake(value: str) -> bool:
    markers = (
        "\u00c3",
        "\u00c4",
        "\u00c6",
        "\u00e1\u00ba",
        "\u00e1\u00bb",
        "\u00e2\u20ac",
        "\u00ef\u00bf\u00bd",
        "\ufffd",
    )
    return any(marker in value for marker in markers)


def mostly_uppercase(value: str) -> bool:
    letters = [char for char in value if char.isalpha()]
    if len(letters) < 8:
        return False
    uppercase = sum(1 for char in letters if char.upper() == char and char.lower() != char)
    return uppercase / len(letters) >= 0.75


def auto_checks(room: dict[str, Any]) -> list[str]:
    checks: list[str] = []
    slug = str(room.get("slug") or "")
    title = str(room.get("public_title") or room.get("title") or "")
    thumbnail_url = str(room.get("thumbnail_url") or room.get("thumbnail") or "")

    if not thumbnail_url:
        checks.append("missing-thumbnail")
    elif not thumbnail_url.startswith("https://res.cloudinary.com/"):
        checks.append("non-cloudinary-thumbnail")

    if has_emoji(title):
        checks.append("title-has-emoji")
    if has_internal_code(title):
        checks.append("title-has-internal-code")
    if has_mojibake(title):
        checks.append("title-has-mojibake")
    if has_mojibake(slug):
        checks.append("slug-has-mojibake")
    if mostly_uppercase(title):
        checks.append("title-mostly-uppercase")

    return checks


def suggested_public_title(room: dict[str, Any]) -> str:
    if public_room_title is None:
        return ""

    title = str(room.get("public_title") or room.get("title") or "")
    suggestion = public_room_title(title)
    return suggestion if suggestion and suggestion != title else ""


def summarize(payload: dict[str, Any], limit: int) -> list[RoomPhotoRow]:
    rows: list[RoomPhotoRow] = []
    for room in api_results(payload)[:limit]:
        rows.append(
            RoomPhotoRow(
                auto_checks=auto_checks(room),
                created_at=str(room.get("created_at") or ""),
                public_title=str(room.get("public_title") or room.get("title") or ""),
                raw_title=str(room.get("title") or ""),
                room_id=str(room.get("id") or ""),
                slug=str(room.get("slug") or ""),
                suggested_public_title=suggested_public_title(room),
                thumbnail_url=str(room.get("thumbnail_url") or room.get("thumbnail") or ""),
            )
        )
    return rows


def as_dict(rows: list[RoomPhotoRow]) -> dict[str, Any]:
    failed_rows = [row for row in rows if row.auto_checks]
    return {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "review_required": True,
        "sample_size": len(rows),
        "technical_status": "NEEDS_CONTENT_FIX" if failed_rows else "READY_FOR_HUMAN_REVIEW",
        "rooms": [
            {
                "auto_checks": row.auto_checks,
                "created_at": row.created_at,
                "id": row.room_id,
                "public_title": row.public_title,
                "raw_title": row.raw_title,
                "slug": row.slug,
                "suggested_public_title": row.suggested_public_title,
                "thumbnail_url": row.thumbnail_url,
            }
            for row in rows
        ],
    }


def escape_cell(value: str) -> str:
    return value.replace("\n", "<br>").replace("|", "\\|").strip()


def render_markdown(rows: list[RoomPhotoRow], api_url: str) -> str:
    payload = as_dict(rows)
    technical_status = payload["technical_status"]
    lines = [
        "# Room Photo Review",
        "",
        f"- Generated at: {payload['generated_at']}",
        f"- API source: {api_url.rstrip('/')}/api/rooms/",
        f"- Sample size: {len(rows)}",
        f"- Technical status: `{technical_status}`",
        "- Review status: `OPEN - requires human approval for lighting, framing, aspect ratio, and real-room relevance`",
        "",
        "Use this contact sheet for the `Source photo quality is consistent` UI/UX field gate. "
        "Do not mark that gate PASS until a reviewer has checked the real photos and linked this artifact.",
        "If a row shows `suggested public title`, deploy the latest backend and run "
        "`python manage.py sanitize_public_room_titles --status PUBLISHED --apply` before review.",
        "",
        "| Preview | Room | Technical checks | Human review |",
        "| --- | --- | --- | --- |",
    ]

    for row in rows:
        preview = (
            f'<img src="{escape_cell(row.thumbnail_url)}" alt="Room {escape_cell(row.room_id)} thumbnail" width="180">'
            if row.thumbnail_url
            else "missing thumbnail"
        )
        room_details = [
            f"id: `{escape_cell(row.room_id or 'n/a')}`",
            f"slug: `{escape_cell(row.slug or 'n/a')}`",
            f"public title: {escape_cell(row.public_title or 'n/a')}",
            f"raw title: {escape_cell(row.raw_title or 'n/a')}",
        ]
        if row.suggested_public_title:
            room_details.append(f"suggested public title: {escape_cell(row.suggested_public_title)}")
        room_details.append(f"created: {escape_cell(row.created_at or 'n/a')}")
        room = "<br>".join(room_details)
        checks = ", ".join(row.auto_checks) if row.auto_checks else "pass technical checks"
        lines.append(f"| {preview} | {room} | {escape_cell(checks)} | OPEN |")

    lines.extend(
        [
            "",
            "## Human Review Checklist",
            "",
            "- [ ] At least 10 published listings were reviewed, or every listing if fewer than 10 exist.",
            "- [ ] Photos show real ForRent rooms, not generic marketing apartments.",
            "- [ ] Lighting is clear enough to inspect the room.",
            "- [ ] Framing shows useful rental details: bed, desk, kitchen, bathroom, balcony, or storage.",
            "- [ ] Aspect ratios/crops do not hide important room details.",
            "- [ ] No internal room codes, promotional emoji, or operational labels are visible in user-facing titles.",
            "- [ ] Reviewer name, date, and release SHA are recorded in the release note.",
            "",
        ]
    )
    return "\n".join(lines)


def write_artifacts(rows: list[RoomPhotoRow], output_path: str, api_url: str) -> tuple[Path, Path]:
    json_path = Path(output_path)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(as_dict(rows), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    markdown_path = json_path.with_suffix(".md")
    markdown_path.write_text(render_markdown(rows, api_url), encoding="utf-8")
    return json_path, markdown_path


def self_test() -> None:
    payload = {
        "data": {
            "results": [
                {
                    "created_at": "2026-07-18T00:00:00+07:00",
                    "id": 25,
                    "slug": "studio-6",
                    "public_title": "Studio",
                    "thumbnail_url": "https://res.cloudinary.com/demo/image/upload/v1/room.jpg",
                    "title": "Studio",
                },
                {
                    "created_at": "2026-07-18T00:00:00+07:00",
                    "id": 26,
                    "slug": "g\u00c3\u00a1c-x\u00c3\u00a9p",
                    "public_title": "P502 G\u00c3\u00a1c x\u00c3\u00a9p \U0001F389",
                    "thumbnail_url": "https://example.com/room.jpg",
                    "title": "P502 G\u00c3\u00a1c x\u00c3\u00a9p \U0001F389",
                },
            ]
        }
    }
    rows = summarize(payload, limit=10)
    assert len(rows) == 2
    assert rows[0].auto_checks == []
    assert "non-cloudinary-thumbnail" in rows[1].auto_checks
    assert "title-has-emoji" in rows[1].auto_checks
    assert "title-has-internal-code" in rows[1].auto_checks
    assert "title-has-mojibake" in rows[1].auto_checks
    assert "slug-has-mojibake" in rows[1].auto_checks
    assert rows[1].suggested_public_title
    assert as_dict(rows)["technical_status"] == "NEEDS_CONTENT_FIX"

    with TemporaryDirectory() as tmp:
        json_path, markdown_path = write_artifacts(rows, str(Path(tmp) / "photo-review.json"), DEFAULT_API_URL)
        assert json.loads(json_path.read_text(encoding="utf-8"))["sample_size"] == 2
        markdown = markdown_path.read_text(encoding="utf-8")
        assert "Room Photo Review" in markdown
        assert "suggested public title" in markdown


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a room-photo review contact sheet for UI/UX field evidence.")
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--limit", default=10, type=int)
    parser.add_argument("--output", default="output/room-photo-review.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if args.limit < 1:
        parser.error("--limit must be greater than zero")

    try:
        rows = summarize(fetch_json(rooms_api_url(args.api_url, args.limit)), args.limit)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"Room photo review could not fetch required data: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc

    json_path, markdown_path = write_artifacts(rows, args.output, args.api_url)
    print(f"Wrote room photo review artifacts: {json_path} and {markdown_path}")
    if any(row.auto_checks for row in rows):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
