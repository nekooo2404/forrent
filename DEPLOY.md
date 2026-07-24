# Deploy ForRent

Checklist toi thieu de chay production tren `forrent.io.vn`.

## 1. DNS

Tao cac ban ghi `A` tro ve IP VPS:

- `forrent.io.vn`
- `www.forrent.io.vn`
- `api.forrent.io.vn`
- `admin.forrent.io.vn`

## 2. Server

Yeu cau tren VPS:

- Docker va Docker Compose plugin
- Nginx
- Certbot

Khuyen nghi dat source tai `/opt/forrent` de khop voi file Nginx mau.

## 3. Environment

Sua `backend/.env` tren server:

- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY` phai la chuoi moi, dai, khong dung gia tri mau
- `DATABASE_URL`, `POSTGRES_PASSWORD` phai dung password manh
- `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend,forrent.io.vn,www.forrent.io.vn,api.forrent.io.vn,admin.forrent.io.vn`
- `CORS_ALLOWED_ORIGINS=https://forrent.io.vn,https://www.forrent.io.vn,https://admin.forrent.io.vn`
- `CSRF_TRUSTED_ORIGINS=https://forrent.io.vn,https://www.forrent.io.vn,https://admin.forrent.io.vn,https://api.forrent.io.vn`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` de upload anh len Cloudinary
- Tao mailbox tren Email Pro, vi du `noreply@forrent.io.vn`, roi dien `EMAIL_HOST_USER` va `EMAIL_HOST_PASSWORD`
- Email Pro Mat Bao: `EMAIL_HOST=s129d209.emailserver.vn`, `EMAIL_PORT=465`, `EMAIL_USE_SSL=True`, `EMAIL_USE_TLS=False`
- Email Sendify: dat `EMAIL_BACKEND=apps.common.email.SendifyEmailBackend`, `SENDIFY_API_KEY` va `DEFAULT_FROM_EMAIL=no-reply@forrent.io.vn`
- Telegram: tao bot bang BotFather, dat `TELEGRAM_BOT_TOKEN` trong `backend/.env`; khong commit token vao Git
- Moi landlord phai nhan `/start` cho bot. Admin sau do nhap Chat ID cua landlord tai `Quan ly nguoi dung`; khong dung chung mot Chat ID cho nhieu landlord

Lay Chat ID sau khi landlord da gui `/start` (lenh khong ghi token that vao shell history):

```bash
read -s TELEGRAM_BOT_TOKEN
curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" | jq
unset TELEGRAM_BOT_TOKEN
```

Sau khi cap nhat `.env`, restart backend va worker de nap cau hinh moi:

```bash
docker compose -f backend/docker-compose.yml up -d --build backend celery_worker
docker compose -f backend/docker-compose.yml exec backend python manage.py migrate
```

Kiem tra kenh Telegram bang so dien thoai tai khoan ForRent (so dien thoai chi dung de tim user; Telegram van gui bang Chat ID da lien ket):

```bash
docker compose -f backend/docker-compose.yml exec backend \
  python manage.py send_test_telegram --phone 0382912254
```

Neu lenh bao `has not linked Telegram`, landlord can gui `/start` cho bot va admin cap nhat dung Chat ID truoc khi thu lai.

## 4. Build va chay app

```bash
cd /opt/forrent/backend
docker compose up -d --build
docker compose exec backend python manage.py check --settings=config.settings.production
```

Neu deploy theo commit SHA da CI xanh, dung script nay tu root repo:

```bash
cd /opt/forrent
git fetch origin main
MAIN_SHA="$(git rev-parse origin/main)"
RELEASE_NOTE_PATH="/opt/forrent-release-notes/$MAIN_SHA.md" \
  sh deploy/ops/deploy-sha.sh "$MAIN_SHA"
```

Script deploy se tu kiem tra homepage co `data-hero-source="listing"` de tranh
production van serve hero fallback cu sau khi code da merge. Chi dat
`REQUIRE_LISTING_HERO=0` trong tinh huong deploy khan cap hoac inventory that su
rong, va phai ghi no UI/UX evidence vao release note.

Script cung kiem tra URL cu `/homepage` phai redirect ve canonical `/`. Neu
`https://forrent.io.vn/homepage` van tra `200`, production dang serve build
frontend cu hoac cache cu, vi source hien tai da redirect `/homepage` ve `/`.

Neu check hero fail, script se tu thu mot lan:

```bash
docker compose -f backend/docker-compose.yml build --no-cache frontend_client
docker compose -f backend/docker-compose.yml up -d frontend_client
```

Sau do script kiem tra lai `data-hero-source="listing"`. Neu van fail thi deploy
se dung, vi khi do frontend production van dang serve build/cache cu hoac reverse
proxy/CDN chua duoc lam moi. Co the tat co che thu lai bang
`AUTO_REBUILD_FRONTEND_ON_HERO_FAIL=0`, nhung khong nen dung cho release UI/UX.

Neu API production da co anh phong nhung homepage van dung
`/brand/forrent-hero-old-quarter.jpg`, frontend dang chay build cu hoac cache
image cu. Chay chan doan truoc de phan biet loi data va loi build/cache:

```bash
cd /opt/forrent
python3 scripts/diagnose-production-hero.py \
  --output output/production-hero-diagnostic.json
```

Neu ket qua la `STALE_FRONTEND_BUILD`, sau khi checkout dung SHA, rebuild rieng
frontend client va restart:

```bash
cd /opt/forrent
docker compose -f backend/docker-compose.yml build --no-cache frontend_client
docker compose -f backend/docker-compose.yml up -d frontend_client
python3 scripts/diagnose-production-hero.py \
  --output output/production-hero-diagnostic.json
curl -fsSL https://forrent.io.vn/ | grep -F 'data-hero-source="listing"'
```

Lenh `grep` phai thay `data-hero-source="listing"`. Neu van thay
`forrent-hero-old-quarter.jpg`, dung deploy va kiem tra lai
`git rev-parse --short HEAD`, log `frontend_client`, va reverse proxy/cache
truoc khi claim UI/UX hero gate pass.

Truoc khi nghiem thu title public, chay dry-run de tim phong con lo ma noi bo,
emoji hoac noi dung chien dich trong tieu de. Chi chay `--apply` sau khi da xem
diff va thay cac tieu de moi van dung voi nguoi thue:

```bash
cd /opt/forrent
docker compose -f backend/docker-compose.yml exec backend \
  python manage.py sanitize_public_room_titles --status PUBLISHED
docker compose -f backend/docker-compose.yml exec backend \
  python manage.py sanitize_public_room_titles --status PUBLISHED --apply
docker compose -f backend/docker-compose.yml exec backend \
  python manage.py audit_public_room_quality --require-cloudinary
```

Neu lenh audit con bao title co ma phong/noi dung van hanh, dung deploy UI/UX
va sua du lieu phong truoc. API public co `public_title` de FE khong lo title
raw, nhung DB production van nen sach de admin/search/SEO khong bi lech.

Script `deploy/ops/deploy-sha.sh` cung da co public-room quality gate:

- Mac dinh `RUN_PUBLIC_ROOM_QUALITY_AUDIT=1`: chay dry-run sanitize title, neu
  co title can sua thi dung deploy de tranh public title loi.
- Neu muon deploy don gian cho site nho va chap nhan auto clean title, them
  `AUTO_SANITIZE_PUBLIC_ROOM_TITLES=1`.
- Chi tat bang `RUN_PUBLIC_ROOM_QUALITY_AUDIT=0` khi emergency deploy va da ghi
  ro UI/UX evidence debt trong release note.

Vi du deploy voi auto sanitize:

```bash
AUTO_SANITIZE_PUBLIC_ROOM_TITLES=1 \
RELEASE_NOTE_PATH=/opt/forrent-release-notes/$MAIN_SHA.md \
  sh deploy/ops/deploy-sha.sh "$MAIN_SHA"
```                                                                      N
                    
Kiem tra nhanh canonical homepage:

```bash
curl -fsSI https://forrent.io.vn/homepage | grep -Ei 'HTTP/|location:'
```

Ket qua dung phai la `301` hoac `308` va `Location: /` hoac
`Location: https://forrent.io.vn/`.

## 5. Nginx va HTTPS

Copy file mau:

```bash
sudo cp /opt/forrent/deploy/nginx/forrent.conf /etc/nginx/sites-available/forrent.conf
sudo ln -s /etc/nginx/sites-available/forrent.conf /etc/nginx/sites-enabled/forrent.conf
sudo nginx -t




























                                                                                                                                                    
sudo systemctl reload nginx
```

Cap SSL:

```bash
sudo certbot --nginx -d forrent.io.vn -d www.forrent.io.vn -d api.forrent.io.vn -d admin.forrent.io.vn
```

## 6. Bao mat production

Bat buoc truoc khi mo public:

- Bat Cloudflare proxy cho `forrent.io.vn`, `admin.forrent.io.vn`, `api.forrent.io.vn`.
- Cloudflare SSL mode: Full strict. Bat Always Use HTTPS, WAF managed rules, rate limit cho `/api/auth/*`.
- Dung user DB rieng cho app, khong dung `postgres` superuser trong `DATABASE_URL`.
- DB Postgres khong public internet. Chi backend container/app server duoc noi vao port 5432.
- `DJANGO_SECRET_KEY` phai random dai hon 32 ky tu. Doi ngay neu tung day len Git/chat/log.
- Khong luu token JWT trong localStorage. App hien dung access token trong memory va refresh token httpOnly cookie.
- Backup DB hang ngay, ma hoa backup, va test restore moi thang toi thieu 1 lan.
- Cai Sentry hoac cong cu tuong duong cho loi 500. Alert khi 5xx > 5% trong 5 phut.
- Ghi nhat ky dang nhap, doi role, doi mat khau, payout/hoa hong. Khong log password, OTP, token.
- Khi incident: khoa deploy, rotate secret, revoke refresh token, restore backup neu can, ghi timeline su co.

## 7. Smoke test

```bash
curl https://api.forrent.io.vn/api/health/
curl https://forrent.io.vn
curl https://admin.forrent.io.vn
```

API health phai tra ve `{"status":"ok"}`.

## 7.1. UI/UX field gates sau deploy

Doc `docs/ui-ux-hallmark-handoff.md` truoc khi nghiem thu giao dien. Hallmark
la quality gate cho taste/UI polish; cac gate can thiet bi that, provider that
hoac production telemetry van phai co artifact rieng.

Sau khi deploy SHA moi, chay workflow GitHub Actions **UI/UX Field Gates**:

- `base_url`: `https://forrent.io.vn`
- `room_path`: mot URL phong production co it nhat 2 anh/video, vi du `/rooms/p502-studio-kh%C3%A9p-k%C3%ADn`
- `transitions`: `20`
- `throttle`: `true`
- `strict`: `true`

Tai artifact `ui-ux-field-evidence`, dinh kem JSON, Markdown,
`ui-ux-release-evidence.md`, `production-hero-diagnostic.md`,
`room-photo-review.md` va `homepage-hero.png` vao release note.
Workflow nay chi chung minh duoc cac gate do lap lai duoc tren production
nhu hero image va gallery transition. Cac gate thiet bi that, screen reader,
Sendify inbox, usability test va RUM/Core Web Vitals van phai co bang chung
rieng trong `docs/releases/ui-ux-field-evidence-template.md`.

Neu chay field probe local hoac da tai artifact ve server/may dev, tao file
evidence release bang:

```bash
python scripts/prepare-ui-ux-release-evidence.py \
  --field-evidence output/ui-ux-field-evidence.md \
  --output docs/releases/$MAIN_SHA-ui-ux-field-evidence.md \
  --release-note docs/releases/$MAIN_SHA.md \
  --sha $MAIN_SHA \
  --tester "Ten nguoi kiem tra" \
  --environment production
python scripts/check-ui-ux-field-evidence.py docs/releases/$MAIN_SHA-ui-ux-field-evidence.md
python scripts/check-ui-ux-field-evidence.py docs/releases/$MAIN_SHA-ui-ux-field-evidence.md --summary
```

Chi khi moi dong da co bang chung that moi duoc chay strict mode:

```bash
python scripts/check-ui-ux-field-evidence.py docs/releases/$MAIN_SHA-ui-ux-field-evidence.md --require-all-pass
```

## 8. Backup

Tao thu muc backup ngoai repo va lap lich cron:

```bash
mkdir -p /opt/forrent-backups
cd /opt/forrent/backend
docker compose exec -T postgres pg_dump -U rental_user rental_db > /opt/forrent-backups/forrent-$(date +%F).sql
```

Khong commit file `.env`, database dump, media rieng tu, hoac backup len Git.

## 9. CI/CD

Repo dùng GitHub Actions tại `.github/workflows/ci.yml` làm pipeline CI duy nhất:

- Backend: `manage.py check`, pytest, `pip-audit`.
- Frontend client/admin: `npm audit --audit-level=high`, lint, build.

Khong deploy neu CI do. Secrets production chi dat trong secrets store cua CI/host, khong ghi vao workflow.

## 10. Checklist production-ready đầy đủ

Không mở public production nếu còn mục bắt buộc chưa xong.

### 10.1. Bảo mật

- [ ] HTTPS hoạt động cho `forrent.io.vn`, `www.forrent.io.vn`, `api.forrent.io.vn`, `admin.forrent.io.vn`.
- [ ] HTTP tự redirect sang HTTPS sau khi Certbot cấu hình xong.
- [ ] `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY` là secret mạnh và không dùng lại ở môi trường khác.
- [ ] `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` chỉ chứa domain thật ở production.
- [ ] Cookie production dùng `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] Security headers bật ở Django, Next và Nginx: HSTS, CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Admin có `noindex, nofollow` trong metadata, header Next và Nginx.
- [ ] API auth/contact/viewing request có rate limit ở DRF và Nginx.
- [ ] Không có secret trong Git, log, CI output, chat hoặc file backup.
- [ ] Dependency audit pass: `pip-audit -r backend/requirements.txt --strict` và `npm audit --audit-level=high`.
- [ ] Log các hành động nhạy cảm: đăng nhập fail, đổi mật khẩu, đổi role, xử lý lead/hoa hồng.

### 10.2. Backend

- [ ] API health trả `{"status":"ok"}` tại `https://api.forrent.io.vn/api/health/`.
- [ ] Response API theo format chuẩn của `StandardJSONRenderer`.
- [ ] Endpoint bảo vệ bằng authentication/permission; public endpoint chỉ mở khi có chủ đích.
- [ ] Validate input ở backend, không chỉ dựa vào frontend.
- [ ] Error handler không trả stack trace hoặc thông tin server ra client.
- [ ] Migration chạy thành công trước khi mở traffic.
- [ ] Celery worker và beat chạy cho email, notification hoặc tác vụ nền.
- [ ] Redis hoạt động cho cache, throttle và Celery.
- [ ] Email SMTP gửi được từ `noreply@forrent.io.vn`.
- [ ] Upload ảnh dùng Cloudinary trong production; không phụ thuộc media local của container.

### 10.3. Frontend client và admin

- [ ] `frontend-client` build pass với `NEXT_PUBLIC_API_BASE_URL=https://api.forrent.io.vn`.
- [ ] `frontend-admin` build pass với `NEXT_PUBLIC_API_BASE_URL=https://api.forrent.io.vn`.
- [ ] Client có title, description, Open Graph, Twitter card, canonical, sitemap và robots.
- [ ] Search Console xác minh domain và submit `https://forrent.io.vn/sitemap.xml`.
- [ ] Auth/profile/admin/private pages không index.
- [ ] UI responsive trên mobile, tablet, desktop.
- [ ] Form có loading, error, empty state và validate dữ liệu bắt buộc.
- [ ] Ảnh có alt text hợp lý; ảnh lớn dùng WebP/AVIF qua Next/Image hoặc Cloudinary.
- [ ] Kiểm tra thủ công Chrome, Edge, Safari/iOS hoặc mobile browser thật trước launch.

### 10.4. Database và dữ liệu

- [ ] App dùng DB user riêng, không dùng superuser `postgres`.
- [ ] Postgres không mở public internet; chỉ backend/server nội bộ truy cập được.
- [ ] Migration được quản lý bằng Git, không sửa schema thủ công trên production.
- [ ] Có index cho query tìm phòng theo khu vực, giá, diện tích, trạng thái, slug nếu traffic tăng.
- [ ] Backup tự động hằng ngày vào thư mục ngoài repo hoặc object storage riêng.
- [ ] Backup được mã hóa hoặc lưu trong nơi có quyền truy cập giới hạn.
- [ ] Test restore tối thiểu mỗi tháng một lần, không chỉ tạo backup.
- [ ] Có quy trình xóa/ẩn dữ liệu nhạy cảm khi user yêu cầu hoặc khi xử lý incident.

### 10.5. DevOps, CI/CD và rollback

- [ ] CI xanh trước khi deploy: backend check/test/audit, frontend lint/build/audit.
- [ ] Server production deploy bằng Docker Compose, không chạy tay từng process.
- [ ] Có staging hoặc ít nhất smoke test trên server trước khi trỏ traffic chính.
- [ ] Có rollback plan: giữ commit/hash bản đang chạy tốt và biết cách revert/redeploy.
- [ ] Nginx config đã `nginx -t` và reload thành công.
- [ ] Cloudflare bật Full strict SSL, Always Use HTTPS, WAF managed rules và rate limit auth/API.
- [ ] Static assets và ảnh đi qua CDN/Cloudinary.
- [ ] Không deploy vào lúc không có người theo dõi log/alert trong 30-60 phút đầu.

Rollback nhanh:

```bash
cd /opt/forrent
git log --oneline -5
git checkout <last-good-commit>
cd backend
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py check --settings=config.settings.production
```

### 10.6. Testing tối thiểu

- [ ] Backend: `python manage.py check --settings=config.settings.production`.
- [ ] Backend: `pytest apps/accounts apps/blogs apps/contacts apps/commissions apps/rooms apps/viewing_requests`.
- [ ] Backend content gate: `python manage.py audit_public_room_quality --require-cloudinary`.
- [ ] Client: `npm run lint && npm run build`.
- [ ] Admin: `npm run lint && npm run build`.
- [ ] Smoke test các luồng chính: xem phòng, lọc phòng, gửi liên hệ, đăng ký/đăng nhập, đặt lịch xem phòng, admin xử lý lead.
- [ ] Security smoke test: endpoint private trả 401/403 khi không có token; login/contact bị throttle khi spam.
- [ ] Performance smoke test: homepage và trang chi tiết phòng tải ổn trên mobile network chậm.

### 10.7. Monitoring, logging và alerting

- [ ] Uptime monitor kiểm tra `https://forrent.io.vn`, `https://admin.forrent.io.vn`, `https://api.forrent.io.vn/api/health/`.
- [ ] Sentry hoặc công cụ tương đương nhận lỗi backend 500 và lỗi frontend runtime.
- [ ] Alert khi API 5xx > 5% trong 5 phút, health check fail, CPU/RAM/disk cao, DB connection gần đầy.
- [ ] Log Docker/Nginx/Postgres được rotate, không để đầy ổ cứng.
- [ ] Theo dõi four golden signals: latency, traffic, errors, saturation.
- [ ] Có người nhận alert qua email/Slack/Telegram/Zalo và có trách nhiệm phản hồi.

### 10.8. Analytics và SEO vận hành

- [ ] Google Search Console đã verify domain property.
- [ ] Google Analytics hoặc Plausible đã gắn cho client site.
- [ ] Theo dõi conversion: click CTA, gửi form liên hệ, đặt lịch xem phòng, đăng ký, gọi hotline.
- [ ] Theo dõi query SEO: impression, click, CTR, average position.
- [ ] Cập nhật sitemap khi thêm trang SEO quan trọng.
- [ ] Không index admin, API, auth/private pages.
- [ ] Theo dõi Core Web Vitals: LCP, INP, CLS cho mobile và desktop.

## 11. Quy trình kiểm tra sau deploy

Trong 60 phút đầu sau deploy:

- [ ] Mở homepage, danh sách phòng, chi tiết phòng, blog, contact.
- [ ] Đăng ký/đăng nhập/logout bằng tài khoản test.
- [ ] Gửi contact hoặc đặt lịch xem phòng bằng dữ liệu test.
- [ ] Mở admin và xác nhận dữ liệu mới hiển thị.
- [ ] Kiểm tra upload ảnh lên Cloudinary nếu release có thay đổi media.
- [ ] Kiểm tra log backend, worker, beat, Nginx không có lỗi mới.
- [ ] Kiểm tra uptime/error dashboard không có spike.
- [ ] Chạy `curl -I https://admin.forrent.io.vn` và xác nhận có `X-Robots-Tag: noindex`.

Runbook hardening chi tiết: `docs/production-hardening.md`.
