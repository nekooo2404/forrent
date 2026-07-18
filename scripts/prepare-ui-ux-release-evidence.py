from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TEMPLATE = ROOT / "docs" / "releases" / "ui-ux-field-evidence-template.md"


@dataclass(frozen=True)
class Row:
    evidence: str
    gate: str
    link: str
    status: str


def parse_markdown_table(markdown: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line.startswith("|") or not line.endswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if not cells or all(set(cell) <= {"-", " "} for cell in cells):
            continue
        rows.append(cells)
    return rows


def rows_by_gate(path: Path) -> dict[str, Row]:
    rows: dict[str, Row] = {}
    for cells in parse_markdown_table(path.read_text(encoding="utf-8")):
        if len(cells) < 4 or cells[0] == "Gate":
            continue
        gate, status, evidence, link = cells[:4]
        rows[gate] = Row(evidence=evidence, gate=gate, link=link, status=status.upper())
    return rows


def ordered_template_rows(template_path: Path) -> list[Row]:
    rows = rows_by_gate(template_path)
    ordered: list[Row] = []
    for cells in parse_markdown_table(template_path.read_text(encoding="utf-8")):
        if len(cells) < 4 or cells[0] == "Gate":
            continue
        gate = cells[0]
        if gate in rows:
            ordered.append(rows[gate])
    return ordered


def escape_cell(value: str) -> str:
    return value.replace("\n", "<br>").replace("|", "\\|").strip()


def summarize_rows(rows: list[Row]) -> tuple[dict[str, int], dict[str, list[str]]]:
    counts = {"PASS": 0, "OPEN": 0, "FAIL": 0, "SKIP": 0, "UNKNOWN": 0}
    grouped: dict[str, list[str]] = {key: [] for key in counts}
    for row in rows:
        status = row.status if row.status in counts else "UNKNOWN"
        counts[status] += 1
        grouped[status].append(row.gate)
    return counts, grouped


def render_summary(rows: list[Row]) -> str:
    counts, grouped = summarize_rows(rows)
    total = len(rows)
    lines = [
        "## Summary",
        "",
        f"- Total gates: {total}",
        f"- PASS: {counts['PASS']}",
        f"- OPEN: {counts['OPEN']}",
        f"- FAIL: {counts['FAIL']}",
        f"- SKIP: {counts['SKIP']}",
        f"- UNKNOWN: {counts['UNKNOWN']}",
    ]

    for status in ("FAIL", "OPEN", "SKIP", "UNKNOWN"):
        if not grouped[status]:
            continue
        lines.extend(["", f"### {status} gates"])
        lines.extend(f"- {gate}" for gate in grouped[status])

    return "\n".join(lines)


def render(args: argparse.Namespace) -> str:
    template_rows = ordered_template_rows(args.template)
    probe_rows = rows_by_gate(args.field_evidence) if args.field_evidence else {}
    generated_at = datetime.now(UTC).isoformat(timespec="seconds")

    rendered = []
    for template_row in template_rows:
        row = probe_rows.get(template_row.gate, template_row)
        rendered.append(row)

    rendered_rows = [
            f"| {escape_cell(row.gate)} | {escape_cell(row.status)} | {escape_cell(row.evidence)} | {escape_cell(row.link)} |"
            for row in rendered
        ]

    source_line = f"- Source field evidence: {args.field_evidence}" if args.field_evidence else "- Source field evidence: not attached"
    summary = render_summary(rendered)
    return f"""# UI/UX Field Evidence

## Release

- Date: {args.date}
- Production commit SHA: {args.sha}
- Tester: {args.tester}
- Environment: {args.environment}
- Related release note: {args.release_note}

## Evidence Table

Use `PASS` only when the artifact path or dashboard link is attached. Keep
`OPEN` when evidence is not collected yet; do not delete rows.

| Gate | Status | Evidence | Link |
| --- | --- | --- | --- |
{chr(10).join(rendered_rows)}

{summary}

## Notes

- Prepared at: {generated_at}
{source_line}
- Validate normally with:
  `python scripts/check-ui-ux-field-evidence.py {args.output}`
- Validate final release closure with:
  `python scripts/check-ui-ux-field-evidence.py {args.output} --require-all-pass`
"""


def self_test() -> None:
    hero_gate = "Hero uses a representative real room photo"
    with TemporaryDirectory() as raw_tmp:
        tmp = Path(raw_tmp)
        field_evidence = tmp / "field.md"
        output = tmp / "prepared.md"
        field_evidence.write_text(
            "\n".join(
                [
                    "# Field Probe",
                    "",
                    "| Gate | Status | Evidence | Link |",
                    "| --- | --- | --- | --- |",
                    f"| {hero_gate} | PASS | Hero probe used room id 2 and captured homepage hero | output/homepage-hero.png |",
                ]
            ),
            encoding="utf-8",
        )
        args = argparse.Namespace(
            date="2026-07-18",
            environment="production",
            field_evidence=field_evidence,
            output=output,
            release_note="docs/releases/demo.md",
            sha="abc1234",
            template=DEFAULT_TEMPLATE,
            tester="Codex self-test",
        )
        output.write_text(render(args), encoding="utf-8")
        text = output.read_text(encoding="utf-8")
        rows = rows_by_gate(output)

    assert "- Date: 2026-07-18" in text
    assert "- Production commit SHA: abc1234" in text
    assert "- Tester: Codex self-test" in text
    assert "- Environment: production" in text
    assert "- Related release note: docs/releases/demo.md" in text
    assert "## Summary" in text
    assert "- Total gates: " in text
    assert "- PASS: 1" in text
    assert "### OPEN gates" in text
    assert len(rows) == len(ordered_template_rows(DEFAULT_TEMPLATE))
    assert rows[hero_gate].status == "PASS"
    assert rows[hero_gate].link == "output/homepage-hero.png"


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a UI/UX release evidence file from template and field probe output.")
    parser.add_argument("--date", default=datetime.now(UTC).date().isoformat(), help="Release date in YYYY-MM-DD format.")
    parser.add_argument("--environment", default="production")
    parser.add_argument("--field-evidence", type=Path, help="Generated field probe Markdown, for example output/ui-ux-field-evidence.md.")
    parser.add_argument("--output", type=Path, help="Output release evidence Markdown path.")
    parser.add_argument("--release-note", help="Release note path or URL.")
    parser.add_argument("--sha", default=os.environ.get("GITHUB_SHA", ""), help="Production commit SHA.")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--template", default=DEFAULT_TEMPLATE, type=Path)
    parser.add_argument("--tester")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if not args.sha:
        parser.error("--sha is required unless GITHUB_SHA is set")
    if not args.output:
        parser.error("--output is required unless --self-test is used")
    if not args.release_note:
        parser.error("--release-note is required unless --self-test is used")
    if not args.tester:
        parser.error("--tester is required unless --self-test is used")
    if args.field_evidence and not args.field_evidence.exists():
        parser.error(f"--field-evidence does not exist: {args.field_evidence}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render(args), encoding="utf-8")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
