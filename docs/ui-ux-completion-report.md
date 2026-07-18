# Báo cáo hoàn thiện UI/UX

Ngày kiểm tra: 2026-07-18

## Quy ước

- `DONE`: đã sửa trong code và có bằng chứng tự động phù hợp.
- `CODE DONE - FIELD GATE`: code đã hoàn thiện; cần production, thiết bị thật hoặc nhà cung cấp thật để nghiệm thu.
- `EXTERNAL`: không thể chứng minh chỉ từ repository hoặc trình giả lập.
- `DEFERRED`: chủ động chưa xây vì chưa có dữ liệu chứng minh nhu cầu.

## Bằng chứng tự động hiện tại

- Backend regression: 107/107 test pass.
- Chromium production-mode: 138/138 pass, gồm 65 axe, 2 audit layout/touch toàn route ở 320/390px, 44 critical flow, 10 security và 17 visual regression.
- Axe accessibility: 65/65 pass trên public, auth, modal, gallery và admin desktop/mobile.
- Security E2E: 10/10 pass.
- Firefox, WebKit, Mobile Chrome, Mobile Safari: 36/36 pass ở lần chạy xác minh gần nhất. Không còn gate Google Fonts sau khi chuyển sang system font; cross-browser rerun đã hoàn tất thành công.
- npm audit client/admin: 0 vulnerability; pip-audit: không có vulnerability đã biết.
- Lint, Django local/production check, migration drift, secret guard, auth-storage guard và UTF-8 guard: pass.
- Public room quality gate: `audit_public_room_quality` blocks missing thumbnails, missing still images, unapproved media hosts, internal room codes, emoji and uppercase listing titles before production release.
- Production field probe: `npm run field:ui-ux -- --base-url https://forrent.io.vn --room-path /rooms/<slug> --strict` records hero-source and mobile throttled gallery transition evidence into `output/ui-ux-field-evidence.{json,md}`.
- Manual GitHub workflow `UI/UX Field Gates` runs the same production field probe, validates the generated Markdown evidence, prepares `output/ui-ux-release-evidence.md`, writes a PASS/OPEN/FAIL summary to the GitHub Actions run summary, and uploads `ui-ux-field-evidence` artifacts after a release candidate is deployed, including `homepage-hero.png`, hero room id/slug, and a Markdown table compatible with the release evidence validator.
- Release field-gate validator: `python scripts/check-ui-ux-field-evidence.py docs/releases/<filled-ui-ux-evidence>.md --require-all-pass` prevents claiming all UI/UX field gates are closed without concrete evidence links or release metadata.
- Release evidence generator: `python scripts/prepare-ui-ux-release-evidence.py --field-evidence output/ui-ux-field-evidence.md --output docs/releases/<sha>-ui-ux-field-evidence.md --release-note docs/releases/<sha>.md --sha <sha> --tester "<name>" --environment production` prepares a release-ready evidence table from the field probe artifact.
- Field-gate summary: `python scripts/check-ui-ux-field-evidence.py docs/releases/<filled-ui-ux-evidence>.md --summary` prints the exact PASS/OPEN/FAIL/SKIP count and lists every unfinished gate.
- CI now runs the field-gate validator self-test, the release-evidence generator self-test, checks acceptance/template/manual-checklist consistency, and validates the release evidence template on every backend job. The stricter `--require-all-pass` mode remains a release-time command because it depends on production, devices, provider, and real-user evidence.
- Manual evidence checklists now exist at `docs/releases/ui-ux-manual-evidence-checklists.md` for the external gates that require real photos, devices, screen readers, Sendify, usability sessions, or RUM dashboards.

## Phân cấp thị giác

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Tách nền, sidebar, card và footer | DONE | Semantic surface tokens dùng chung; visual regression homepage, rooms và admin. |
| Giảm lạm dụng màu cam | DONE | Heading dùng `on-surface`; primary dành cho CTA/active; tertiary dành cho trạng thái. |
| Bổ sung surface trung tính | DONE | `surface-container-*` tách khu điều khiển, nội dung và card. |
| Đồng nhất shadow, border, radius | DONE | Card/form/modal dùng thang `rounded-md/lg`, `shadow-soft/high`, `outline-variant`. |
| Giảm khoảng trắng vô nghĩa | DONE | Contact, blog fallback, empty/error/loading state có bố cục theo nội dung. |

## Hero và hình ảnh

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Overlay hero quá tối | DONE | Overlay giảm và visual regression khóa độ hiển thị hiện tại. |
| Hero phản ánh phòng thật | CODE DONE - FIELD GATE | Hero chọn ảnh listing đầu tiên có thật trong 24 phòng published mới nhất; `thumbnail_url` public fallback sang ảnh gallery tĩnh đầu tiên nếu admin chưa đặt thumbnail. E2E `homepage uses the first available listing photo before the brand fallback` pass; backend room API test xác nhận fallback không lấy video làm thumbnail. Cần deploy lại và reviewer approval để xác nhận ảnh đại diện production phù hợp. |
| CTA hero chưa nổi bật | DONE | CTA chính/secondary có thứ bậc và touch target 44px. |
| Chất lượng/góc/tỷ lệ ảnh không đều | CODE DONE - FIELD GATE | Cloudinary chuẩn hóa kích thước/crop; `audit_public_room_quality` chặn phòng publish thiếu thumbnail, thiếu ảnh tĩnh, host media lạ, mã nội bộ, emoji và tiêu đề viết hoa. Chất lượng ánh sáng/góc chụp vẫn cần quy trình duyệt ảnh thật. |
| Lazy render để vùng trống | DONE | Bỏ `content-visibility`; thêm loading route, skeleton và placeholder giữ tỷ lệ. |
| Cloudinary + Next tối ưu kép | DONE | Ảnh phòng, hero và cẩm nang dùng URL Cloudinary trực tiếp với `unoptimized`; gallery dùng media native. |
| Chuyển trạng thái ảnh thiếu tinh tế | DONE | Blur placeholder, giữ ảnh cũ đến khi decode, trạng thái tải và lỗi phục hồi được. |

## Typography và nội dung

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Tiêu đề có mã/trạng thái/chữ hoa/emoji | DONE | `cleanRoomTitle` xử lý mã đầu dòng, trạng thái, tiền tố quảng cáo, emoji và mở rộng CCMN/CCDV; E2E production pass. |
| Tiêu đề dài làm card lệch nhịp | DONE | Tiêu đề tối đa hai dòng; card dùng flex và vùng chi phí `mt-auto`. |
| Metadata quá nhỏ | DONE | Giá, diện tích, cọc và metadata chính dùng 16-20px, tương phản semantic. |
| Đơn vị tiền không thống nhất | DONE | Nội dung hiển thị dùng `VNĐ` và `VNĐ/tháng`; `VND` chỉ còn trong structured data ISO. |
| Alt ảnh quá dài | DONE | Alt dùng loại phòng + khu vực; gallery đánh số ảnh/video ngắn gọn. |
| Mail/SĐT/Blog không thống nhất | DONE | Public dùng “Email”, “Số điện thoại”, “Cẩm nang”; admin dùng “Hộp thư liên hệ”. |
| Nội dung mang tính vận hành | DONE | Public copy tập trung giá, cọc, khu vực, lịch xem; mã tòa/note chỉ ở admin. |

## Card, tìm kiếm và bộ lọc

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Card không tự cân bằng | DONE | Grid/flex ổn định, chi phí và CTA neo cuối card. |
| Badge xanh lệch thương hiệu | DONE | Badge dùng tertiary teal dịu, không dùng xanh neon. |
| Sidebar cạnh tranh danh sách | DONE | Sidebar surface nhẹ, chiều rộng giới hạn; mobile dùng disclosure. |
| Bộ lọc chính/nâng cao chưa rõ | DONE | Tìm kiếm, phường, giá ở chính; loại phòng/tiện ích trong disclosure. |
| Sort cần nút Áp dụng | DONE | Select thay đổi URL ngay; E2E pass. |
| Reset/link phụ nhỏ | DONE | Link/nút đạt min-height 44px; chip có nút bỏ lọc riêng. |
| Native select/input không đồng nhất | DONE | Light color-scheme, semantic surface, min-height 44px và focus ring dùng chung. |
| Không giữ filter/sort/scroll khi quay lại | DONE | Query URL là nguồn trạng thái; E2E back-navigation + scroll restoration pass. |
| Chưa kiểm tra hàng trăm phòng | DONE | E2E dùng inventory lớn và kiểm tra phân trang không trùng control. |
| Loading kết quả mạng chậm chưa rõ | DONE | Route loading/skeleton giữ layout và thông báo tiến trình. |

## So sánh phòng

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Thứ tự thông tin khó so sánh | DONE | Card theo thứ tự: trạng thái/ảnh, tên/giá, loại/diện tích, tiện ích, cọc/chi phí, CTA. |
| Chi phí bị phân tán | DONE | Card có cọc và “Chi phí cố định/tháng”; detail gom toàn bộ phí. |
| Chưa có tổng chi phí tháng | DONE | Tổng giá thuê + phí dịch vụ; điện/nước ghi rõ chưa bao gồm do phụ thuộc sử dụng. |
| Card khác chiều cao | DONE | Grid stretch + flex-grow + `mt-auto`; visual regression 6 phòng. |
| So sánh nhiều phòng | DONE | Thêm panel so sánh tối đa 3 phòng ngay trên listing; E2E `rooms can be compared from the listing without changing pages` pass trong full Chromium 138/138. |

## Chi tiết và gallery

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Nhãn “x mục” mơ hồ | DONE | Hiển thị riêng số ảnh và số video. |
| Tối ưu ảnh kép | DONE | Cloudinary URL hiển thị/preload trùng nhau; không qua Next optimizer lần hai. |
| `content-visibility` gây trống | DONE | Không còn trong source. |
| Chuyển media warm-cache | DONE | E2E cached image/video dưới 60ms; decode-before-swap và preload lân cận. |
| Cold 4G luôn dưới 1 giây | CODE DONE - FIELD GATE | Current code dùng `srcset`, thumbnail 160px, preload ảnh kế tiếp trước và giữ ảnh cũ tới khi decode; regression test với CDN trễ 400ms chuyển ảnh dưới 1 giây. Field probe đo 20 transition mobile throttled 4G và xuất p75; bản production cũ đo ngày 2026-07-17 vẫn mất khoảng 3,18 giây, nên phải deploy rồi đo lại. |
| CTA mất khi cuộn dài | DONE | Desktop aside sticky; mobile CTA sticky. |
| Vuốt Safari/Android thật | EXTERNAL | WebKit/Mobile Safari/Mobile Chrome emulation pass; còn nghiệm thu thiết bị vật lý. |
| Video lỗi/mạng yếu | DONE | Có poster, controls native, loading và recoverable error; E2E CDN failure pass. |

## Đặt lịch, liên hệ và đăng nhập

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Không rõ trạng thái sau gửi | DONE | Confirmation state + toast nêu bước liên hệ/xác nhận tiếp theo. |
| Không có trang theo dõi yêu cầu | DONE | Profile hiển thị lifecycle yêu cầu và lịch đã xác nhận. |
| Email không khớp hành động | CODE DONE - FIELD GATE | Hai template theo đúng received/scheduled, Celery retry và backend test; cần Sendify staging để chứng minh deliverability. |
| Validation +84/khoảng trắng/sai dữ liệu | DONE | Normalize dùng chung và backend tests cho số định dạng. |
| Mất dữ liệu khi API lỗi/hết phiên | DONE | E2E API 503/401 xác nhận contact và lịch xem giữ dữ liệu. |
| Không có funnel/điểm bỏ form | CODE DONE - FIELD GATE | Sentry metrics ghi start, field reached, failure, submit và completion time kèm metadata không chứa PII (`room_id`, `field`, `reason`); cần traffic production để có tỷ lệ. |
| `Invalid credentials` tiếng Anh | DONE | Thông báo tiếng Việt, nêu retry/quên mật khẩu. |
| Login link nhỏ | DONE | Quên mật khẩu/đăng ký/nút submit đạt 44px. |
| Login chậm/lỗi mạng/submit lặp | DONE | Hydration gate, `aria-busy`, in-flight guard và E2E đa trình duyệt. |

## Mobile, accessibility và trạng thái lỗi

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Touch target dưới 44px | DONE | E2E quét toàn bộ control trên mọi route public/admin ở 320/390px; đồng thời chặn horizontal overflow. |
| Footer mobile quá dài | DONE | Link chia hai cột, copy rút gọn, spacing giảm. |
| Admin login card lồng card | DONE | Một surface chính; visual regression riêng ở 390×844 pass. |
| Zoom 200%, keyboard, reduced motion | DONE | Chromium E2E zoom-equivalent, focus/skip-link, focus trap và focus restoration cho gallery, xác nhận đặt lịch, modal tạo phòng admin; reduced-motion pass. Xác minh lại đa engine còn được ghi ở field gate môi trường. |
| Screen reader thật | EXTERNAL | Axe 65/65 không thay thế VoiceOver/NVDA; checklist nghiệm thu đã ghi riêng. |
| Thiết bị iOS/Android thật | EXTERNAL | Emulation đã pass; cần thiết bị vật lý, portrait/landscape và bàn phím mobile. |
| Skeleton/empty/error không đồng nhất | DONE | Shared visual language, route loading, not-found, global/network error và media fallback. |
| Lỗi mạng không phân loại | DONE | Validation, authentication, API, network và not-found có message/action riêng. |
| Submit lặp/thiếu loading | DONE | Contact, viewing, login và sign-up có synchronous in-flight guard + loading state. |
| Cloudinary/API gián đoạn | DONE | E2E media failure và form 503 pass. |
| Sendify gián đoạn | CODE DONE - FIELD GATE | Celery autoretry backoff/jitter, fail loudly; cần chaos test trên staging với provider thật. |
| Trang lỗi là dead end | DONE | Retry, quay lại hoặc tiếp tục xem phòng luôn hiện diện. |

## Kiểm chứng sản phẩm

| Mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Chưa audit admin sau đăng nhập | DONE | Visual dashboard/modal + axe toàn bộ routes admin desktop/mobile. |
| Chưa có usability test | EXTERNAL | Cần tối thiểu 5 người thuê mục tiêu; mẫu bằng chứng nằm trong `ui-ux-acceptance.md`. |
| Chưa có funnel tìm → xem → gửi → xác nhận | CODE DONE - FIELD GATE | `room_results_loaded`, `room_detail_loaded`, contact/viewing request metrics và backend `viewing_request.scheduled` audit event đã đủ để dựng funnel; cần dữ liệu production để xác nhận. |
| Chưa theo dõi zero-result/form failure/time | CODE DONE - FIELD GATE | Đã instrument `zero_result_search`, `*_request_failed` và `*_completion_time` kèm metadata không chứa PII; cần xác nhận Sentry nhận dữ liệu production. |
| Visual/E2E thiếu viewport/state | DONE | 17 visual baseline gồm public, auth desktop/mobile, card 320px, rooms, empty, detail, gallery, contact, admin và modal; desktop/tablet/mobile cùng đa engine. |
| Chưa có Core Web Vitals thực tế | CODE DONE - FIELD GATE | `useReportWebVitals` gửi LCP/INP/CLS; cần traffic production để tính p75. |
| Phòng đã thuê không archive được | DONE | State machine cho phép `RENTED -> ARCHIVED`; admin có action lưu trữ và E2E/backend tests. |

## Gate còn mở

Template nghiệm thu còn 13 field gates trong
`docs/releases/ui-ux-field-evidence-template.md`. Draft production mới nhất tại
`output/ui-ux-release-evidence.md` đang là `total=13 PASS=1 OPEN=11 FAIL=1`.
Repository không thể tự tạo bằng chứng cho năm nhóm sau:

1. Ảnh phòng thật và quy trình duyệt chất lượng nội dung.
2. iPhone/Android vật lý và VoiceOver/NVDA thật.
3. Usability test với ít nhất năm người thuê mục tiêu.
4. Sendify/Cloudinary staging và deliverability/chaos test với nhà cung cấp thật.
5. Production Sentry/RUM đủ traffic để tính funnel và Core Web Vitals p75.

Mẫu evidence nằm tại `docs/releases/ui-ux-field-evidence-template.md`; validator
`scripts/check-ui-ux-field-evidence.py` phải pass trước khi đổi các dòng này
sang `DONE`.

## Đối chiếu production ngày 2026-07-17

- `https://forrent.io.vn/` và `/rooms` trả `200`; API health báo database, cache và media storage hoạt động.
- Production vẫn là build cũ: hero dùng ảnh fallback, bộ sắp xếp còn nút “Áp dụng” và mobile rooms còn xuất hiện vùng card chưa render.
- Desktop cold-load đo được LCP khoảng `3,236 giây` (`3.236 ms`), vượt ngưỡng tốt Core Web Vitals `2,5 giây`; chưa được coi là đạt cho tới khi RUM production xác nhận p75.
- Chuyển ảnh kế tiếp trên slow-4G của build cũ mất khoảng `3,184 giây` (`3.184 ms`). Current code đã loại request thumbnail 1200px, dùng nguồn responsive và preload tuần tự; cần deploy SHA mới rồi đo lại bằng cùng kịch bản.

## Field probe smoke ngày 2026-07-18

- Lệnh smoke: `npm run field:ui-ux -- --base-url https://forrent.io.vn --room-path /rooms/p502-studio-kh%C3%A9p-k%C3%ADn --transitions 2 --no-throttle --output ../output/ui-ux-field-evidence-smoke.json`.
- Kết quả hero production hiện tại: `fail`, vì `data-hero-source` chưa có và ảnh đang là `/brand/forrent-hero-old-quarter.jpg`; cần deploy build mới để gate hero có thể pass.
- Kết quả gallery smoke: `pass` với p75 `385ms` trên 2 transition không throttle. Đây chỉ là kiểm tra runtime script, chưa đủ thay thế gate chính 20 transition mobile throttled 4G.
- Field probe now also emits `homepage-hero.png` and release-compatible rows; smoke output validates with `python scripts/check-ui-ux-field-evidence.py output/ui-ux-field-evidence-smoke.md`.

## Field probe production 20 transition ngày 2026-07-18

- Lệnh: `npm run field:ui-ux -- --base-url https://forrent.io.vn --room-path /rooms/p502-studio-kh%C3%A9p-k%C3%ADn --transitions 20 --output ../output/ui-ux-field-evidence.json --strict`.
- Kết quả gallery throttled 4G: `PASS`, p75 `34ms` trên 20 transition; artifact nằm ở `output/ui-ux-field-evidence.json`.
- Kết quả hero: `FAIL`, production vẫn trả fallback `/_next/image?url=%2Fbrand%2Fforrent-hero-old-quarter.jpg...` và chưa có `data-hero-source`, `room-id`, `room-slug`. Cần deploy build có listing hero hoặc đảm bảo dữ liệu production có phòng published kèm ảnh chính.
- Release evidence draft đã tạo tại `output/ui-ux-release-evidence.md` và validator báo: `total=13 PASS=1 OPEN=11 FAIL=1`.

## Production API cross-check ngày 2026-07-18

- Lệnh API: `https://api.forrent.io.vn/api/rooms/?page_size=24&status=PUBLISHED&ordering=-created_at`.
- Kết quả API: `count=22`, sample `22`, `with_thumbnail_url=22`.
- Phòng đầu tiên có ảnh: `id=25`, `slug=studio-6`, `thumbnail_url=https://res.cloudinary.com/puanhkjp/image/upload/v1/room-thumbnails/56fcf8499add42fab1d576b566012e1e`.
- Kết luận root cause hero: dữ liệu production đã có thumbnail Cloudinary; gate hero vẫn fail vì frontend production HTML vẫn preload `/brand/forrent-hero-old-quarter.jpg` và thiếu `data-hero-source`. Đây là bằng chứng server chưa chạy build hero mới hoặc cache/deploy frontend chưa được làm mới, không phải do API thiếu ảnh.
- Deploy script `deploy/ops/deploy-sha.sh` hiện chặn release nếu homepage không có `data-hero-source="listing"`; chỉ được override bằng `REQUIRE_LISTING_HERO=0` khi chấp nhận ghi nợ UI/UX evidence trong release note.

## Verification ngày 2026-07-18

- `npm --prefix frontend-client run lint`: pass.
- `npm --prefix frontend-client run build`: pass.
- `npm --prefix frontend-admin run lint`: pass.
- `npm --prefix frontend-admin run build`: pass.
- `python manage.py check --settings=config.settings.production`: pass.
- `pytest apps/accounts apps/rooms apps/viewing_requests` với `DATABASE_URL=sqlite:///...` tạm thời: `78 passed`.
- `npm --prefix e2e run test:ci`: `138 passed`, gồm axe, touch target, filters, gallery/video, auth, CSP/cache, structured data và visual regression Chromium.
- `python scripts/check-ui-ux-field-evidence.py --check-docs`: pass.
- `python scripts/check-ui-ux-field-evidence.py output/ui-ux-release-evidence.md --summary`: `total=13 PASS=1 OPEN=11 FAIL=1`.
- Pytest không override DB trên máy local bị chặn trước khi chạy test vì `.env` trỏ Postgres host không resolve; kết quả pass ở trên dùng DB SQLite tạm và không ghi vào repo.

## Goal continuation 2026-07-18

- Hallmark project memory was added at `.hallmark/preflight.json` and
  `.hallmark/log.json` so future UI/UX work preserves the warm Old Quarter
  brown system, restrained motion, 44px touch targets, real room media first,
  and the no-fake-evidence field-gate policy.
- The current source code exports `/` from `app/homepage/page.tsx` and
  `next.config.ts` redirects `/homepage` to `/` permanently. Production now
  redirects `/homepage` to `/`, but canonical `/` still serves
  `/brand/forrent-hero-old-quarter.jpg` without `data-hero-source`, which proves
  the public frontend is still running an old build or stale cache for the
  homepage shell.
- `e2e/field-gates.mjs` now records `fallback=yes/no` and `stale-build=yes/no`
  in hero evidence. The latest smoke artifact
  `output/ui-ux-field-evidence-stale-build.json` reports
  `fallback=yes; stale-build=yes`.
- `deploy/ops/deploy-sha.sh` now blocks release when the homepage hero is not
  `data-hero-source="listing"`, attempts one no-cache rebuild of
  `frontend_client`, restarts it, and checks again before failing.
- `frontend-client/app/page.tsx` and `frontend-client/app/homepage/page.tsx`
  now declare `revalidate = 30` so the homepage cannot keep stale listing
  fallback output indefinitely when room data changes.
- `npm --prefix frontend-client run build` on 2026-07-18 reports `/` and
  `/homepage` as dynamic server-rendered routes, with a successful production
  build.
- `scripts/diagnose-production-hero.py` was added to classify the remaining
  hero failure as missing production content versus stale frontend build/cache.
  It can now write release artifacts with
  `--output output/production-hero-diagnostic.json`, producing both JSON and a
  Markdown sidecar. CI runs its self-test so the diagnostic remains usable on
  release branches.
- Running the diagnostic against production on 2026-07-18 reports
  `STALE_FRONTEND_BUILD`: API has `published_count=22`,
  `rooms_with_thumbnail=22`, first thumbnail room `id=25`, `slug=studio-6`,
  but canonical `/` still has no `data-hero-source` and still serves the
  fallback brand hero.
- The 3-transition smoke artifact is not release-grade gallery evidence. Use
  the documented 20-transition throttled field probe for the final gallery gate.
- The release evidence set contains 13 formal gates, not 14:
  `total=13 PASS=1 OPEN=11 FAIL=1`. The only code/deploy-closeable failure is
  the stale homepage hero. The remaining 11 items require external device,
  provider, usability, or production RUM evidence and must stay `OPEN` until
  those artifacts are attached.
- `scripts/prepare-room-photo-review.py` now prepares
  `output/room-photo-review.json` and `output/room-photo-review.md` from the
  production room API. The artifact samples published room thumbnails, catches
  non-Cloudinary thumbnails, mojibake, internal room codes, and obvious title
  issues, and gives reviewers a contact sheet for the
  `Source photo quality is consistent` gate without pretending to judge
  lighting/framing automatically.
- The room API now exposes a renter-facing `public_title`, and the public
  frontend uses it before falling back to the raw admin title. Production data
  can be cleaned with `python manage.py sanitize_public_room_titles --status
  PUBLISHED` followed by the same command with `--apply`; the dry-run output must
  be reviewed before applying because this changes real listing titles.
