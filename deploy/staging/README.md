# Staging Deploy

Staging must use separate env, DB, media, DNS, and Sentry environment.

## DNS

Create `A` records pointing to the staging VPS:

- `staging.forrent.io.vn`
- `staging-admin.forrent.io.vn`
- `staging-api.forrent.io.vn`

## Server

```bash
sudo mkdir -p /opt/forrent-staging
sudo chown -R $USER:$USER /opt/forrent-staging
cd /opt/forrent-staging
git clone <repo-url> .
cp deploy/staging/backend.env.example backend/.env
```

Edit `backend/.env` with staging-only secrets. Do not reuse production DB/passwords.
Because containers run as UID/GID `10001`, prepare writable mounted directories before starting:

```bash
mkdir -p backend/media backend/staticfiles
sudo chown -R 10001:10001 backend/media backend/staticfiles
```

## Run

```bash
cd /opt/forrent-staging/backend
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.staging.yml exec backend python manage.py migrate
docker compose -f docker-compose.yml -f docker-compose.staging.yml exec backend python manage.py check --settings=config.settings.production
```

## Nginx and SSL

```bash
sudo cp /opt/forrent-staging/deploy/nginx/forrent-staging.conf /etc/nginx/sites-available/forrent-staging.conf
sudo ln -s /etc/nginx/sites-available/forrent-staging.conf /etc/nginx/sites-enabled/forrent-staging.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d staging.forrent.io.vn -d staging-admin.forrent.io.vn -d staging-api.forrent.io.vn
```

## Verify

```bash
curl --fail --silent --show-error --location --connect-timeout 10 --max-time 20 https://staging-api.forrent.io.vn/api/health/
curl --fail --silent --show-error --location --connect-timeout 10 --max-time 20 -I https://staging.forrent.io.vn | grep -i x-robots-tag
curl --fail --silent --show-error --location --connect-timeout 10 --max-time 20 -I https://staging-admin.forrent.io.vn | grep -i x-robots-tag
```
