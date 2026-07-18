# UI/UX Field Evidence

## Release

- Date:
- Production commit SHA:
- Tester:
- Environment:
- Related release note:

## Evidence Table

Use `PASS` only when the artifact path or dashboard link is attached. Keep
`OPEN` when evidence is not collected yet; do not delete rows.

| Gate | Status | Evidence | Link |
| --- | --- | --- | --- |
| Hero uses a representative real room photo | OPEN | Not collected for this release. | Release note has no attached screenshot yet. |
| Source photo quality is consistent | OPEN | Not collected for this release. | Photo review sample is not attached yet. |
| Cold 4G gallery transition stays under 1 second | OPEN | Not collected for this release. | Run output/ui-ux-field-evidence.json after deploy. |
| Swipe works on physical iOS/Android | OPEN | Not collected for this release. | Device checklist or video is not attached yet. |
| Sendify received/scheduled emails deliver | OPEN | Not collected for this release. | Sendify message IDs and inbox screenshots are not attached yet. |
| Form funnel has real abandonment data | OPEN | Not collected for this release. | Sentry or RUM dashboard export is not attached yet. |
| Sendify outage path is recoverable | OPEN | Not collected for this release. | Staging chaos-test log is not attached yet. |
| Screen reader flow works | OPEN | Not collected for this release. | VoiceOver and NVDA transcript is not attached yet. |
| Physical iOS/Android full mobile pass | OPEN | Not collected for this release. | Device matrix is not attached yet. |
| Usability test validates the experience | OPEN | Not collected for this release. | Five-renter study notes are not attached yet. |
| Search-to-scheduled funnel is measurable | OPEN | Not collected for this release. | Funnel dashboard or export is not attached yet. |
| Zero-result/form-failure/time metrics arrive | OPEN | Not collected for this release. | Production Sentry sample payloads are not attached yet. |
| Real Core Web Vitals p75 is healthy | OPEN | Not collected for this release. | Production p75 dashboard is not attached yet. |

## Notes

- Attach `output/ui-ux-field-evidence.json` and
  `output/ui-ux-field-evidence.md` when using the production probe.
- Attach real device videos/screenshots separately; browser emulation is not
  enough to close physical-device gates.
- Attach screen-reader transcripts separately; axe passing is not enough to
  close assistive-technology gates.
- Use `docs/releases/ui-ux-manual-evidence-checklists.md` for photo review,
  physical device, screen-reader, Sendify, usability, and RUM evidence.
- `--require-all-pass` also requires Date, Production commit SHA, Tester,
  Environment, and Related release note to be filled.
