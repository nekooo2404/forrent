# Rental Website Backend

Enterprise Django REST backend for a rental listing system serving tenant-facing and admin/saler frontends.

## Tech Stack

- Python 3.12
- Django, Django REST Framework
- PostgreSQL, Redis, Celery
- JWT authentication with refresh-token blacklist
- django-filter, django-cors-headers, django-environ
- drf-spectacular OpenAPI/Swagger
- pytest / Django tests
- Docker and Docker Compose

## Main Capabilities

- Tenant register, login by email or phone, logout, profile update, password change.
- Public room listing/detail/filter APIs without internal notes or commission data.
- Authenticated tenant viewing requests with user-info snapshot and duplicate-active-lead protection.
- Admin/Saler CRUD for cities, wards, amenities, area ranges, rooms, blogs, contacts and leads.
- Transactional moved-in confirmation that records actual commission exactly once.
- Dashboard and commission summary APIs.
- Standard response format and custom DRF exception handler.

## Local Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Default seeded admin:

- Email: `admin@example.com`
- Phone: `0900000000`
- Password: `Admin@123`
- Role: `ADMIN`

## Docker

```bash
copy .env.example .env
docker compose up --build
```

The backend listens on `http://localhost:8000`.

## Migrations And Seed

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
```

## Tests

```bash
pytest
```

## API Documentation

- Swagger UI: `http://localhost:8000/api/docs/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

## Core API List

Auth:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `PUT /api/auth/profile/`
- `POST /api/auth/change-password/`

Public:

- `GET /api/rooms/`
- `GET /api/rooms/{slug}/`
- `GET /api/rooms/filters/`
- `GET /api/blogs/`
- `GET /api/blogs/{slug}/`
- `POST /api/contact/`
- `POST /api/viewing-requests/`
- `GET /api/viewing-requests/my/`

Admin/Saler:

- `GET /api/admin/dashboard/summary/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/cities/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/wards/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/amenities/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/area-ranges/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/rooms/`
- `GET|PATCH /api/admin/viewing-requests/`
- `POST /api/admin/viewing-requests/{id}/confirm-moved-in/`
- `GET /api/admin/commissions/summary/`
- `GET|POST|PUT|PATCH|DELETE /api/admin/blogs/`
- `GET /api/admin/sendify/templates/`

## Response Format

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {}
}
```
