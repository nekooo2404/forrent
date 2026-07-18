# Hallmark UI/UX Handoff

Date: 2026-07-18

Hallmark is a taste and interaction-quality gate for ForRent. It is useful for
keeping the UI made, restrained, and coherent. It is not a replacement for
production evidence, real device testing, screen-reader testing, provider logs,
or real-user telemetry.

## What Hallmark Can Improve

| Area | Hallmark role |
| --- | --- |
| Visual hierarchy | Separate page, filter, card, modal, and footer surfaces with semantic tokens instead of similar warm-brown shades. |
| Color roles | Reserve orange for primary action and active state; keep headings, helper text, borders, and badges on separate roles. |
| Room cards | Keep title, price, metadata, cost summary, and CTA in a repeatable scan order for fast comparison. |
| Filters | Make search, location, budget, and room type primary; move lower-frequency filters into disclosure groups. |
| Typography | Remove internal codes, emoji, all-caps marketing titles, and inconsistent currency labels from renter-facing copy. |
| Media states | Keep image/video placeholder, decode-before-swap, loading, empty, and error states visually consistent. |
| Mobile UI | Preserve 44px touch targets, no two-line auth CTAs, no horizontal scroll, compact nav, and compact footer. |
| Motion | Use short transform/opacity transitions only; support reduced motion; avoid decorative motion that does not explain state. |
| Empty/error states | Every dead-end state must offer a useful next action: search again, send a request, retry, or return to rooms. |
| Admin parity | Admin screens should share the same warm, restrained system without public-site marketing flourish. |

## What Hallmark Cannot Close Alone

These gates must stay `OPEN` until the release note links concrete evidence.
The current formal release checklist has 13 gates. If a request mentions 14
unfinished items, reconcile it against this table before changing statuses.

| Gate | Required evidence |
| --- | --- |
| Hero uses a representative real room photo | Production screenshot, hero room id/slug, reviewer approval, and proof the Cloudinary URL is not routed through `/_next/image`. |
| Source photo quality is consistent | Review sample of at least 10 published listings. |
| Cold 4G gallery transition stays under 1 second | Production field probe with mobile throttling and at least 20 transitions. |
| Swipe works on physical iOS/Android | Video or checklist from real iPhone Safari and Android Chrome. |
| Sendify received/scheduled emails deliver | Provider message IDs, inbox screenshots, and retry/failure log check. |
| Form funnel has real abandonment data | Sentry/RUM dashboard with search, detail, submit start/fail/success. |
| Sendify outage path is recoverable | Staging chaos test showing Celery retry and no duplicate user-facing success. |
| Screen reader flow works | VoiceOver Safari and NVDA Chrome task transcript. |
| Physical iOS/Android full mobile pass | Device/browser/version matrix for nav, filters, gallery, auth, request form, keyboard, and video. |
| Usability test validates the experience | At least five target renters completing the agreed tasks. |
| Search-to-scheduled funnel is measurable | Dashboard/export linking room discovery to admin scheduled viewing. |
| Zero-result/form-failure/time metrics arrive | Production Sentry/RUM events with sample payloads. |
| Real Core Web Vitals p75 is healthy | Production LCP, INP, and CLS p75 for mobile and desktop after enough traffic. |

## Release Rule

Before a release can claim all UI/UX field gates are closed:

1. Deploy the release candidate.
2. Run the `UI/UX Field Gates` workflow against the deployed URL and a real
   room with at least two gallery media items.
3. Attach the `ui-ux-field-evidence` artifact to the release note.
4. Complete the manual checklist for physical devices, screen readers, Sendify,
   usability, and production telemetry.
5. Run:

```bash
python scripts/check-ui-ux-field-evidence.py docs/releases/<sha>-ui-ux-field-evidence.md --summary
python scripts/check-ui-ux-field-evidence.py docs/releases/<sha>-ui-ux-field-evidence.md --require-all-pass
```

Do not change any row to `PASS` without a concrete artifact path, dashboard
export, provider log, screenshot, video, transcript, or tracked issue.
