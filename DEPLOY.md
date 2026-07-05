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

## 4. Build va chay app

```bash
cd /opt/forrent/backend
docker compose up -d --build
docker compose exec backend python manage.py check --settings=config.settings.production
```

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
- DB Postgres khong public internet. Chi backend container/app server duoc noi vao port 5432.
- Dung user DB rieng cho app, khong dung `postgres` superuser trong `DATABASE_URL`.
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

## 8. Backup

Tao thu muc backup ngoai repo va lap lich cron:

```bash
mkdir -p /opt/forrent-backups
cd /opt/forrent/backend
docker compose exec -T postgres pg_dump -U rental_user rental_db > /opt/forrent-backups/forrent-$(date +%F).sql
```

Khong commit file `.env`, database dump, media rieng tu, hoac backup len Git.

## 9. CI/CD

Repo co GitHub Actions tai `.github/workflows/ci.yml` va CircleCI tai `.circleci/config.yml`:

- Backend: `manage.py check`, pytest, `pip-audit`.
- Frontend client/admin: `npm audit --audit-level=high`, lint, build.

Khong deploy neu CI do. Secrets production chi dat trong secrets store cua CI/host, khong ghi vao workflow.
