from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ACCEPTANCE = ROOT / "docs" / "ui-ux-acceptance.md"
DEFAULT_EVIDENCE_TEMPLATE = ROOT / "docs" / "releases" / "ui-ux-field-evidence-template.md"
DEFAULT_MANUAL_CHECKLIST = ROOT / "docs" / "releases" / "ui-ux-manual-evidence-checklists.md"

PLACEHOLDER_RE = re.compile(
    r"\b(TODO|TBD|N/A|NA|pending|chua|none|missing|placeholder|<[^>]+>)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class EvidenceRow:
    evidence: str
    gate: str
    link: str
    status: str


REQUIRED_RELEASE_FIELDS = {
    "date": "Date",
    "environment": "Environment",
    "production commit sha": "Production commit SHA",
    "related release note": "Related release note",
    "tester": "Tester",
}


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


def acceptance_gates(path: Path = DEFAULT_ACCEPTANCE) -> list[str]:
    rows = parse_markdown_table(path.read_text(encoding="utf-8"))
    gates = []
    for cells in rows:
        if len(cells) >= 2 and cells[0] not in {"Gate", "---"}:
            gates.append(cells[0])
    return gates


def evidence_rows(path: Path) -> dict[str, EvidenceRow]:
    rows = parse_markdown_table(path.read_text(encoding="utf-8"))
    parsed: dict[str, EvidenceRow] = {}
    for cells in rows:
        if len(cells) < 4 or cells[0] in {"Gate", "---"}:
            continue
        gate, status, evidence, link = cells[:4]
        parsed[gate] = EvidenceRow(evidence=evidence, gate=gate, link=link, status=status.upper())
    return parsed


def release_metadata(path: Path) -> dict[str, str]:
    metadata: dict[str, str] = {}
    in_release = False
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line == "## Release":
            in_release = True
            continue
        if in_release and line.startswith("## "):
            break
        if not in_release or not line.startswith("- ") or ":" not in line:
            continue
        key, value = line[2:].split(":", 1)
        metadata[key.strip().lower()] = value.strip()
    return metadata


def has_real_evidence(value: str) -> bool:
    value = value.strip()
    return len(value) >= 12 and not PLACEHOLDER_RE.search(value)


def has_metadata_value(value: str) -> bool:
    value = value.strip()
    return len(value) >= 3 and not PLACEHOLDER_RE.search(value)


def validate(evidence_path: Path, require_all_pass: bool = False) -> list[str]:
    expected = acceptance_gates()
    rows = evidence_rows(evidence_path)
    failures: list[str] = []

    if require_all_pass:
        metadata = release_metadata(evidence_path)
        for key, label in REQUIRED_RELEASE_FIELDS.items():
            value = metadata.get(key, "")
            if not has_metadata_value(value):
                failures.append(f"release metadata {label!r} is required")
        date_value = metadata.get("date", "")
        if date_value and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_value):
            failures.append("release metadata 'Date' must use YYYY-MM-DD")
        sha_value = metadata.get("production commit sha", "")
        if sha_value and not re.fullmatch(r"[a-fA-F0-9]{7,40}", sha_value):
            failures.append("release metadata 'Production commit SHA' must be a 7-40 char git SHA")

    for gate in expected:
        row = rows.get(gate)
        if row is None:
            failures.append(f"missing gate row: {gate}")
            continue

        if row.status not in {"PASS", "FAIL", "SKIP", "OPEN"}:
            failures.append(f"{gate}: invalid status {row.status!r}")
            continue

        if require_all_pass and row.status != "PASS":
            failures.append(f"{gate}: status must be PASS for this release")

        if row.status == "PASS":
            if not has_real_evidence(row.evidence):
                failures.append(f"{gate}: PASS requires concrete evidence")
            if not has_real_evidence(row.link):
                failures.append(f"{gate}: PASS requires an evidence link or artifact path")

        if row.status in {"FAIL", "SKIP", "OPEN"} and not has_real_evidence(row.evidence):
            failures.append(f"{gate}: non-PASS rows still need a reason")

    extra = sorted(set(rows) - set(expected))
    for gate in extra:
        failures.append(f"unknown gate row: {gate}")

    return failures


def manual_checklist_gates(path: Path = DEFAULT_MANUAL_CHECKLIST) -> set[str]:
    expected = set(acceptance_gates())
    found: set[str] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line.startswith("- "):
            continue
        candidate = line[2:].strip()
        if candidate in expected:
            found.add(candidate)
    return found


def check_docs_consistency() -> list[str]:
    failures: list[str] = []
    expected = acceptance_gates()
    if len(expected) != 13:
        failures.append(f"expected exactly 13 UI/UX field gates, found {len(expected)}")

    template_rows = evidence_rows(DEFAULT_EVIDENCE_TEMPLATE)
    missing_template = [gate for gate in expected if gate not in template_rows]
    extra_template = sorted(set(template_rows) - set(expected))
    for gate in missing_template:
        failures.append(f"release template missing gate: {gate}")
    for gate in extra_template:
        failures.append(f"release template has unknown gate: {gate}")

    manual_gates = manual_checklist_gates()
    probe_only_gates = {"Cold 4G gallery transition stays under 1 second"}
    expected_manual = set(expected) - probe_only_gates
    missing_manual = sorted(expected_manual - manual_gates)
    extra_manual = sorted(manual_gates - set(expected))
    for gate in missing_manual:
        failures.append(f"manual checklist missing gate: {gate}")
    for gate in extra_manual:
        failures.append(f"manual checklist has unknown gate: {gate}")

    return failures


def summary_lines(evidence_path: Path) -> list[str]:
    expected = acceptance_gates()
    rows = evidence_rows(evidence_path)
    counts = {"PASS": 0, "OPEN": 0, "FAIL": 0, "SKIP": 0, "MISSING": 0, "UNKNOWN": 0}
    grouped: dict[str, list[str]] = {key: [] for key in counts}

    for gate in expected:
        row = rows.get(gate)
        if row is None:
            counts["MISSING"] += 1
            grouped["MISSING"].append(gate)
            continue
        status = row.status if row.status in counts else "UNKNOWN"
        counts[status] += 1
        grouped[status].append(gate)

    lines = [
        f"UI/UX field gates: total={len(expected)} "
        f"PASS={counts['PASS']} OPEN={counts['OPEN']} FAIL={counts['FAIL']} "
        f"SKIP={counts['SKIP']} MISSING={counts['MISSING']} UNKNOWN={counts['UNKNOWN']}"
    ]
    for status in ("OPEN", "FAIL", "SKIP", "MISSING", "UNKNOWN"):
        if not grouped[status]:
            continue
        lines.append(f"{status.lower()} gates:")
        lines.extend(f"- {gate}" for gate in grouped[status])
    return lines


def self_test() -> None:
    assert has_real_evidence("output/ui-ux-field-evidence.json")
    assert has_real_evidence("Sentry dashboard event id abc123")
    assert not has_real_evidence("TODO")
    assert not has_real_evidence("<link>")
    assert not has_real_evidence("N/A")
    assert has_metadata_value("production")
    assert not has_metadata_value("TBD")
    summary = summary_lines(DEFAULT_EVIDENCE_TEMPLATE)
    assert summary[0].startswith("UI/UX field gates: total=13")
    assert "OPEN=13" in summary[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate UI/UX field-gate evidence before closing release gates.")
    parser.add_argument("evidence_file", nargs="?", type=Path, help="Markdown evidence file to validate.")
    parser.add_argument("--check-docs", action="store_true", help="Validate acceptance/template/manual checklist consistency.")
    parser.add_argument("--require-all-pass", action="store_true", help="Fail unless every field gate is marked PASS.")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--summary", action="store_true", help="Print field-gate status counts for an evidence file.")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if args.check_docs:
        failures = check_docs_consistency()
        if failures:
            for failure in failures:
                print(f"- {failure}")
            raise SystemExit("UI/UX field-gate docs are inconsistent")
        print("UI/UX field-gate docs are consistent")
        return

    if args.summary:
        evidence_file = args.evidence_file or DEFAULT_EVIDENCE_TEMPLATE
        failures = validate(evidence_file)
        if failures:
            for failure in failures:
                print(f"- {failure}")
            raise SystemExit("UI/UX field evidence is incomplete")
        print("\n".join(summary_lines(evidence_file)))
        return

    if not args.evidence_file:
        parser.error("evidence_file is required unless --self-test or --check-docs is used")

    failures = validate(args.evidence_file, require_all_pass=args.require_all_pass)
    if failures:
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit("UI/UX field evidence is incomplete")

    print(f"UI/UX field evidence accepted: {args.evidence_file}")


if __name__ == "__main__":
    main()
