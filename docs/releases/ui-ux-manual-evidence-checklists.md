# UI/UX Manual Evidence Checklists

Use this file when closing UI/UX field gates that cannot be proven by CI,
browser emulation, or the production field probe alone. Attach the completed
sections, screenshots, videos, dashboard exports, or provider logs to the
release note, then link them from `ui-ux-field-evidence-template.md`.

## Release Metadata

- Release date:
- Production commit SHA:
- Tester:
- Environment:
- Related release note:

## 1. Real Room Photo Review

Close gates:

- Hero uses a representative real room photo
- Source photo quality is consistent

Minimum sample: 10 published listings.

| Room slug | Hero candidate | Framing pass | Lighting pass | Aspect ratio pass | No internal code/contact marks | Reviewer | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  | YES/NO | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |  |  |

Required attachments:

- Homepage screenshot showing the hero image.
- Room ID/slug used as the hero source.
- Screenshot or export of the 10-listing review sample.

## 2. Physical Mobile Device Matrix

Close gates:

- Swipe works on physical iOS/Android
- Physical iOS/Android full mobile pass

| Device | OS/browser version | Orientation | Navigation | Filters | Gallery swipe | Video | Auth | Request form | Keyboard behavior | Result | Evidence link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| iPhone / Safari |  | Portrait |  |  |  |  |  |  |  | PASS/FAIL |  |
| iPhone / Safari |  | Landscape |  |  |  |  |  |  |  | PASS/FAIL |  |
| Android / Chrome |  | Portrait |  |  |  |  |  |  |  | PASS/FAIL |  |
| Android / Chrome |  | Landscape |  |  |  |  |  |  |  | PASS/FAIL |  |

Required attachments:

- Short video or screenshots for gallery swipe and video playback.
- Notes for any keyboard overlap or scroll restoration issue.

## 3. Assistive Technology Transcript

Close gate:

- Screen reader flow works

| Tool | Browser | Flow | Headings/landmarks | Field errors | Loading announcements | Modal focus | Return focus | Result | Evidence link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VoiceOver | Safari | Navigation -> filters -> gallery -> auth -> request form |  |  |  |  |  | PASS/FAIL |  |
| NVDA | Chrome | Navigation -> filters -> gallery -> auth -> request form |  |  |  |  |  | PASS/FAIL |  |

Required attachments:

- Task transcript or recording notes.
- Issue links for every failed step.

## 4. Sendify Provider Evidence

Close gates:

- Sendify received/scheduled emails deliver
- Sendify outage path is recoverable

| Scenario | Message ID / task ID | Recipient | Expected template | Inbox received | Retry observed | Duplicate success prevented | Result | Evidence link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Viewing request received |  |  | received | YES/NO | N/A | N/A | PASS/FAIL |  |
| Viewing request scheduled |  |  | scheduled | YES/NO | N/A | N/A | PASS/FAIL |  |
| Provider/API blocked on staging |  |  | retry path | N/A | YES/NO | YES/NO | PASS/FAIL |  |

Required attachments:

- Sendify message IDs or API logs.
- Inbox screenshots.
- Celery retry logs for outage test.

## 5. Usability Study

Close gate:

- Usability test validates the experience

Minimum participants: 5 target renters.

Tasks:

1. Find a suitable room from homepage or `/rooms`.
2. Open room detail and inspect media.
3. Submit a viewing request.
4. Explain what they expect to happen next.

| Participant | Device | Task completion | Time on task | Errors | Abandonment point | Verbatim observation | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 |  |  |  |  |  |  | PASS/FAIL |
| P2 |  |  |  |  |  |  | PASS/FAIL |
| P3 |  |  |  |  |  |  | PASS/FAIL |
| P4 |  |  |  |  |  |  | PASS/FAIL |
| P5 |  |  |  |  |  |  | PASS/FAIL |

## 6. Production Telemetry And Core Web Vitals

Close gates:

- Form funnel has real abandonment data
- Search-to-scheduled funnel is measurable
- Zero-result/form-failure/time metrics arrive
- Real Core Web Vitals p75 is healthy

| Dashboard | Metric/event | Required proof | Current value/sample | Result | Evidence link |
| --- | --- | --- | --- | --- | --- |
| Sentry/RUM | `forrent.product.funnel` stage=`room_results_loaded` | event visible with `result_count`, `filter_count`, `page`, `ordering`, `has_search` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`zero_result_search` | event visible with `result_count=0` and filter/search metadata |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`room_detail_loaded` | event visible with `room_id`, `slug`, `image_count`, `video_count`, `available` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`room_detail_unavailable` | event visible with unavailable room slug |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`contact_form_started` | event visible with `has_room_context` and optional `room_id` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`contact_form_field_reached` | event visible with non-PII `field` name only |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`contact_request_failed` | event visible with `reason=validation/api/network` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`contact_request_submitted` | event visible with room context metadata only |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.contact_request_completion_time` | duration sample visible |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`viewing_request_started` | event visible with optional `room_id` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`viewing_request_failed` | event visible with `reason=authentication/api/network` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.funnel` stage=`viewing_request_submitted` | event visible with optional `room_id` |  | PASS/FAIL |  |
| Sentry/RUM | `forrent.product.viewing_request_completion_time` | duration sample visible |  | PASS/FAIL |  |
| Admin/backend | `viewing_request.scheduled` | audit/event visible after admin confirms viewing calendar time |  | PASS/FAIL |  |
| Web Vitals | LCP mobile p75 | healthy threshold |  | PASS/FAIL |  |
| Web Vitals | INP mobile p75 | healthy threshold |  | PASS/FAIL |  |
| Web Vitals | CLS mobile p75 | healthy threshold |  | PASS/FAIL |  |
| Web Vitals | LCP desktop p75 | healthy threshold |  | PASS/FAIL |  |
| Web Vitals | INP desktop p75 | healthy threshold |  | PASS/FAIL |  |
| Web Vitals | CLS desktop p75 | healthy threshold |  | PASS/FAIL |  |

## Release Close Rule

Do not mark a gate `PASS` in `ui-ux-field-evidence-template.md` unless the
corresponding evidence link points to an attached artifact, dashboard export,
video, screenshot, provider log, or tracked issue.
