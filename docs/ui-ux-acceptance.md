# UI/UX Acceptance Gates

Automated checks cover layout, accessibility rules, critical workflows,
cross-browser behavior, and visual regressions. The checks below require a
deployed build, physical hardware, or real participants and must not be marked
complete from emulation alone.

Hallmark taste review is documented in `docs/ui-ux-hallmark-handoff.md`. Use it
to keep visual hierarchy, typography, motion, media states, and mobile polish
consistent. Do not use Hallmark alone to close field gates that require real
devices, provider evidence, usability sessions, or production telemetry.

## Release Evidence

Record the commit SHA, date, tester, device/browser version, result, and issue
link for every failed check.

## Repeatable Production Probe

Run this after deploying the release candidate. It captures repeatable evidence
for the measurable production gates, but it does not replace physical-device,
screen-reader, inbox, or usability evidence.

You can run it from GitHub Actions via **UI/UX Field Gates**. Use the deployed
base URL and a published room path that has at least two gallery media items.
Download the `ui-ux-field-evidence` artifact and attach the generated JSON,
Markdown, release-evidence draft, and hero screenshot to the release note. The
generated release-evidence draft is `output/ui-ux-release-evidence.md`; the hero
probe records `data-hero-source`, `room-id`, and `room-slug` so the release
reviewer can trace which published room supplied the image. Rows left as `OPEN`
still need human, device, provider, or production telemetry evidence. The
workflow validates the generated Markdown with
`scripts/check-ui-ux-field-evidence.py` before upload and writes a PASS/OPEN/FAIL
summary to the GitHub Actions run summary.

```bash
cd e2e
npm run field:ui-ux -- \
  --base-url https://forrent.io.vn \
  --room-path /rooms/<published-room-slug-with-gallery> \
  --transitions 20 \
  --output ../output/ui-ux-field-evidence.json \
  --strict
```

Attach both generated files to the release note:

- `output/ui-ux-field-evidence.json`
- `output/ui-ux-field-evidence.md`
- `output/ui-ux-release-evidence.md`
- `output/homepage-hero.png`

To prepare a release evidence draft from the field-probe Markdown, run:

```bash
python scripts/prepare-ui-ux-release-evidence.py \
  --field-evidence output/ui-ux-field-evidence.md \
  --output docs/releases/<release-sha>-ui-ux-field-evidence.md \
  --release-note docs/releases/<release-sha>.md \
  --sha <release-sha> \
  --tester "<tester name>" \
  --environment production
```

Before claiming field gates are closed, copy
`docs/releases/ui-ux-field-evidence-template.md` or use the prepared draft above,
fill every row, then run:

```bash
python scripts/check-ui-ux-field-evidence.py docs/releases/<filled-ui-ux-evidence>.md
```

To verify the acceptance list, release template, and manual checklist remain in
sync, run:

```bash
python scripts/check-ui-ux-field-evidence.py --check-docs
```

To see the current gate count and the exact rows that remain open, run:

```bash
python scripts/check-ui-ux-field-evidence.py docs/releases/<filled-ui-ux-evidence>.md --summary
```

For a launch that requires all field gates to be closed, use:

```bash
python scripts/check-ui-ux-field-evidence.py docs/releases/<filled-ui-ux-evidence>.md --require-all-pass
```

This strict mode also requires release metadata: date, production commit SHA,
tester, environment, and related release note.

For evidence that cannot be collected by automation, fill the structured
checklist in `docs/releases/ui-ux-manual-evidence-checklists.md` and attach the
completed sections to the release note.

## Current Release Snapshot

The latest prepared release draft at `output/ui-ux-release-evidence.md` reports:

```text
total=13 PASS=1 OPEN=11 FAIL=1
```

The only repeatable production failure currently recorded is:

- `Hero uses a representative real room photo`: production canonical `/` still
  serves the fallback brand hero instead of `data-hero-source="listing"`.

Use this diagnostic to identify whether that failure is caused by missing room
data or by a stale frontend build/cache:

```bash
python scripts/diagnose-production-hero.py --output output/production-hero-diagnostic.json
```

`STALE_FRONTEND_BUILD` means the API already has published rooms with
Cloudinary thumbnails, but the public homepage shell is still old and must be
rebuilt/restarted before the hero gate can pass.
The command writes `output/production-hero-diagnostic.json` and
`output/production-hero-diagnostic.md`; attach both files to the release note
when the hero gate is still not PASS.

Generate a real-room photo contact sheet before closing the photo quality gate:

```bash
python scripts/prepare-room-photo-review.py --output output/room-photo-review.json
```

The command writes `output/room-photo-review.json` and
`output/room-photo-review.md`. It checks the sampled published rooms for
Cloudinary thumbnail URLs, mojibake, internal room codes, and obvious
user-facing title problems. Rows that can be cleaned by the shared title
sanitizer include a `suggested public title` so the deployer knows exactly what
the renter-facing copy should become. The script still leaves the visual quality
decision open for a human reviewer. Attach the Markdown contact sheet plus
reviewer approval to the release note before marking
`Source photo quality is consistent` as PASS.

Before running the final public-room audit on production, sanitize published
room titles so renter-facing copy does not expose internal room codes, campaign
phrases, uppercase shouting, or emoji:

```bash
python manage.py sanitize_public_room_titles --status PUBLISHED
python manage.py sanitize_public_room_titles --status PUBLISHED --apply
python manage.py audit_public_room_quality --require-cloudinary
```

The first command is a dry-run and must be reviewed before `--apply`. The API
also exposes `public_title`, and the public frontend uses it before falling back
to the raw admin title.

The gallery transition gate is already repeatably measurable and has one
release draft marked `PASS`. Re-run the production probe after each deploy
because a new room, media set, or CDN state can change the result.

## Field Gate Checklist

These are the gates that require field evidence. Close a row only when the
evidence column is attached to the release note or a tracked issue. Some rows can
be measured by the production probe; rows involving physical devices, screen
readers, providers, usability, or RUM dashboards require external artifacts.

| Gate | Acceptance evidence |
| --- | --- |
| Hero uses a representative real room photo | Production page screenshot + room ID used as hero source + reviewer approval; the image must not be the brand fallback and must not route a Cloudinary URL through `/_next/image`. |
| Source photo quality is consistent | Sample of at least 10 published listings passing framing, lighting, aspect ratio, and no internal-code checks. |
| Cold 4G gallery transition stays under 1 second | Fresh production deploy measurement on mobile throttled 4G, p75 from at least 20 transitions. |
| Swipe works on physical iOS/Android | Video or checklist from iPhone Safari and Android Chrome, portrait and landscape. |
| Sendify received/scheduled emails deliver | Staging or production test message IDs, inbox screenshots, and retry/failure log check. |
| Form funnel has real abandonment data | Sentry/RUM dashboard showing search, detail view, submit start, submit fail, submit success. |
| Sendify outage path is recoverable | Staging chaos test with provider/API blocked, Celery retry observed, no duplicate user-facing success. |
| Screen reader flow works | VoiceOver Safari and NVDA Chrome task transcript for navigation, filters, gallery, auth, and request form. |
| Physical iOS/Android full mobile pass | Device/browser/version matrix with keyboard, scroll, filter, gallery, video, auth, and request form. |
| Usability test validates the experience | At least five target renters, task completion, errors, time on task, and observed abandonment points. |
| Search-to-scheduled funnel is measurable | Dashboard or export proving find room -> open detail -> send request -> admin schedules viewing. |
| Zero-result/form-failure/time metrics arrive | Sentry/RUM events visible in production with event names and sample payloads. |
| Real Core Web Vitals p75 is healthy | Production LCP, INP, CLS p75 for mobile and desktop after enough real traffic. |

### Physical Devices

- iPhone Safari: open navigation, filter rooms, swipe gallery, play video, log in,
  and submit a viewing request.
- Android Chrome: repeat the same flow and verify the mobile keyboard does not
  hide focused fields or the primary action.
- Verify portrait and landscape, back navigation, scroll restoration, slow 4G,
  offline recovery, and touch targets.

### Assistive Technology

- VoiceOver + Safari and NVDA + Chrome: complete navigation, room filtering,
  gallery, authentication, and viewing request flows using only the keyboard or
  screen-reader controls.
- Verify headings, landmarks, field errors, loading announcements, modal focus,
  and return focus after closing dialogs.

### Usability Study

Run the same tasks with at least five target renters. Record task completion,
time on task, errors, abandonment point, and one verbatim observation. Do not
add room comparison or other speculative features until this evidence shows a
repeated need.

### Production Telemetry

- Confirm Sentry receives funnel stages from search through viewing-request
  submission, zero-result searches, form failures, and completion time.
- Review LCP, INP, and CLS at the 75th percentile for mobile and desktop after
  enough real traffic exists.
- Alert on sustained API, Cloudinary, Sendify, or frontend error increases.

### Content Operations

- Use real room photos with consistent landscape framing, neutral exposure, and
  no embedded internal room codes or contact details.
- Verify the hero uses a representative published room photo and every listing
  has a useful primary image before publication.
- Run `python manage.py audit_public_room_quality --require-cloudinary` before
  a production release. The command blocks published rooms with missing
  thumbnails, missing still images, unapproved media hosts, internal title codes,
  emoji, or mostly-uppercase listing titles.
