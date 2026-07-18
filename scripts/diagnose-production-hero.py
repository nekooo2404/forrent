from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://forrent.io.vn"
DEFAULT_API_URL = "https://api.forrent.io.vn"
TIMEOUT_SECONDS = 20


@dataclass(frozen=True)
class ApiSummary:
    first_thumbnail_url: str
    published_count: int
    room_id: str
    room_slug: str
    rooms_with_thumbnail: int


@dataclass(frozen=True)
class HeroSummary:
    data_source: str
    fallback_detected: bool
    next_optimizes_cloudinary: bool
    room_id: str
    room_slug: str


@dataclass(frozen=True)
class Diagnosis:
    api: ApiSummary
    hero: HeroSummary
    message: str
    recommendation: str
    status: str


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "forrent-hero-diagnostic/1.0"})
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_text(url))


def rooms_api_url(api_url: str) -> str:
    params = urlencode({"ordering": "-created_at", "page_size": 24, "status": "PUBLISHED"})
    return f"{api_url.rstrip('/')}/api/rooms/?{params}"


def summarize_api(payload: dict[str, Any]) -> ApiSummary:
    data = payload.get("data", payload)
    results = data.get("results", []) if isinstance(data, dict) else []
    published_count = int(data.get("count", len(results))) if isinstance(data, dict) else len(results)
    rooms_with_thumbnail = [room for room in results if room.get("thumbnail_url")]
    first_room = rooms_with_thumbnail[0] if rooms_with_thumbnail else {}
    return ApiSummary(
        first_thumbnail_url=str(first_room.get("thumbnail_url") or ""),
        published_count=published_count,
        room_id=str(first_room.get("id") or ""),
        room_slug=str(first_room.get("slug") or ""),
        rooms_with_thumbnail=len(rooms_with_thumbnail),
    )


def extract_attr(html: str, attr: str) -> str:
    match = re.search(rf'\b{re.escape(attr)}="([^"]*)"', html)
    return match.group(1) if match else ""


def summarize_hero(html: str) -> HeroSummary:
    return HeroSummary(
        data_source=extract_attr(html, "data-hero-source"),
        fallback_detected="forrent-hero-old-quarter.jpg" in html,
        next_optimizes_cloudinary="/_next/image?url=https%3A%2F%2Fres.cloudinary.com" in html,
        room_id=extract_attr(html, "data-hero-room-id"),
        room_slug=extract_attr(html, "data-hero-room-slug"),
    )


def diagnose(api: ApiSummary, hero: HeroSummary) -> Diagnosis:
    if hero.data_source == "listing" and hero.next_optimizes_cloudinary:
        return Diagnosis(
            api=api,
            hero=hero,
            message="Homepage hero uses a listing image, but Cloudinary is still routed through Next Image optimization.",
            recommendation=(
                "Serve the Cloudinary transformation URL directly with Next Image unoptimized or native media, "
                "then rebuild frontend_client and re-run the field probe."
            ),
            status="DOUBLE_OPTIMIZED_HERO_IMAGE",
        )

    if hero.data_source == "listing" and hero.room_id and hero.room_slug and not hero.fallback_detected:
        return Diagnosis(
            api=api,
            hero=hero,
            message="Homepage hero is using a real published room image.",
            recommendation="Run the UI/UX field gate and attach the screenshot to the release evidence.",
            status="PASS",
        )

    if api.rooms_with_thumbnail > 0 and (hero.fallback_detected or not hero.data_source):
        return Diagnosis(
            api=api,
            hero=hero,
            message="Production API has published rooms with thumbnails, but homepage still serves the fallback hero.",
            recommendation=(
                "Rebuild frontend_client without cache, restart it, clear reverse proxy/CDN cache if present, "
                "then re-run this diagnostic and the UI/UX field gate."
            ),
            status="STALE_FRONTEND_BUILD",
        )

    if api.published_count == 0:
        return Diagnosis(
            api=api,
            hero=hero,
            message="No published rooms were returned by the production API.",
            recommendation="Publish at least one room with a Cloudinary thumbnail before claiming the hero gate.",
            status="MISSING_PUBLISHED_ROOMS",
        )

    return Diagnosis(
        api=api,
        hero=hero,
        message="Published rooms exist, but none of the sampled rooms has a thumbnail URL.",
        recommendation="Upload or migrate primary room images to Cloudinary and verify thumbnail_url in the API response.",
        status="MISSING_ROOM_THUMBNAILS",
    )


def as_dict(diagnosis: Diagnosis) -> dict[str, Any]:
    return {
        "api": diagnosis.api.__dict__,
        "hero": diagnosis.hero.__dict__,
        "message": diagnosis.message,
        "recommendation": diagnosis.recommendation,
        "status": diagnosis.status,
    }


def render_markdown(diagnosis: Diagnosis) -> str:
    return "\n".join(
        [
            "# Production Hero Diagnostic",
            "",
            f"- Status: `{diagnosis.status}`",
            f"- Message: {diagnosis.message}",
            f"- Recommendation: {diagnosis.recommendation}",
            "",
            "## API",
            "",
            "| Field | Value |",
            "| --- | --- |",
            f"| Published rooms | {diagnosis.api.published_count} |",
            f"| Rooms with thumbnail | {diagnosis.api.rooms_with_thumbnail} |",
            f"| First thumbnail room | id={diagnosis.api.room_id or 'n/a'} slug={diagnosis.api.room_slug or 'n/a'} |",
            f"| First thumbnail URL | {diagnosis.api.first_thumbnail_url or 'n/a'} |",
            "",
            "## Homepage",
            "",
            "| Field | Value |",
            "| --- | --- |",
            f"| data-hero-source | {diagnosis.hero.data_source or 'not-found'} |",
            f"| data-hero-room-id | {diagnosis.hero.room_id or 'not-found'} |",
            f"| data-hero-room-slug | {diagnosis.hero.room_slug or 'not-found'} |",
            f"| Fallback brand hero detected | {str(diagnosis.hero.fallback_detected).lower()} |",
            f"| Next optimizes Cloudinary URLs | {str(diagnosis.hero.next_optimizes_cloudinary).lower()} |",
            "",
            "## Release Note",
            "",
            (
                "Attach this artifact to the release note when the UI/UX hero field gate is not PASS. "
                "A `STALE_FRONTEND_BUILD` status means production content is available, but the public "
                "frontend must be rebuilt or cache must be cleared before claiming the gate."
            ),
            "",
        ]
    )


def write_artifacts(diagnosis: Diagnosis, output_path: str) -> tuple[Path, Path]:
    json_path = Path(output_path)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(as_dict(diagnosis), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    markdown_path = json_path.with_suffix(".md")
    markdown_path.write_text(render_markdown(diagnosis), encoding="utf-8")
    return json_path, markdown_path


def print_human(diagnosis: Diagnosis) -> None:
    print(f"Status: {diagnosis.status}")
    print(f"Message: {diagnosis.message}")
    print(f"Recommendation: {diagnosis.recommendation}")
    print("")
    print("API:")
    print(f"- published_count: {diagnosis.api.published_count}")
    print(f"- rooms_with_thumbnail: {diagnosis.api.rooms_with_thumbnail}")
    print(f"- first_thumbnail_room: id={diagnosis.api.room_id or 'n/a'} slug={diagnosis.api.room_slug or 'n/a'}")
    print(f"- first_thumbnail_url: {diagnosis.api.first_thumbnail_url or 'n/a'}")
    print("")
    print("Homepage:")
    print(f"- data-hero-source: {diagnosis.hero.data_source or 'not-found'}")
    print(f"- data-hero-room-id: {diagnosis.hero.room_id or 'not-found'}")
    print(f"- data-hero-room-slug: {diagnosis.hero.room_slug or 'not-found'}")
    print(f"- fallback brand hero detected: {str(diagnosis.hero.fallback_detected).lower()}")
    print(f"- Next is optimizing Cloudinary image URLs: {str(diagnosis.hero.next_optimizes_cloudinary).lower()}")


def self_test() -> None:
    api = summarize_api(
        {
            "data": {
                "count": 1,
                "results": [
                    {
                        "id": 25,
                        "slug": "studio-6",
                        "thumbnail_url": "https://res.cloudinary.com/demo/image/upload/v1/room.jpg",
                    }
                ],
            }
        }
    )
    stale = diagnose(api, summarize_hero('<header><img src="/brand/forrent-hero-old-quarter.jpg"></header>'))
    assert stale.status == "STALE_FRONTEND_BUILD"

    passing = diagnose(
        api,
        summarize_hero(
            '<header data-hero-source="listing" data-hero-room-id="25" data-hero-room-slug="studio-6">'
            '<img src="https://res.cloudinary.com/demo/image/upload/v1/room.jpg"></header>'
        ),
    )
    assert passing.status == "PASS"

    double_optimized = diagnose(
        api,
        summarize_hero(
            '<header data-hero-source="listing" data-hero-room-id="25" data-hero-room-slug="studio-6">'
            '<img src="/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdemo%2Fimage%2Fupload%2Fv1%2Froom.jpg&w=1920&q=82"></header>'
        ),
    )
    assert double_optimized.status == "DOUBLE_OPTIMIZED_HERO_IMAGE"

    missing = diagnose(summarize_api({"data": {"count": 0, "results": []}}), summarize_hero("<header></header>"))
    assert missing.status == "MISSING_PUBLISHED_ROOMS"

    with TemporaryDirectory() as tmp:
        json_path, markdown_path = write_artifacts(passing, str(Path(tmp) / "hero.json"))
        assert json.loads(json_path.read_text(encoding="utf-8"))["status"] == "PASS"
        assert "Production Hero Diagnostic" in markdown_path.read_text(encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnose whether the production homepage hero can close the UI/UX field gate.")
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    parser.add_argument("--output", help="Write JSON plus a Markdown sidecar artifact to this path.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    try:
        api_summary = summarize_api(fetch_json(rooms_api_url(args.api_url)))
        hero_summary = summarize_hero(fetch_text(args.base_url.rstrip("/") + "/"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"Production hero diagnostic could not fetch required data: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc

    diagnosis = diagnose(api_summary, hero_summary)
    if args.output:
        json_path, markdown_path = write_artifacts(diagnosis, args.output)
        print(f"Wrote diagnostic artifacts: {json_path} and {markdown_path}", file=sys.stderr)

    if args.json:
        print(json.dumps(as_dict(diagnosis), ensure_ascii=False, indent=2))
    else:
        print_human(diagnosis)

    raise SystemExit(0 if diagnosis.status == "PASS" else 1)


if __name__ == "__main__":
    main()
