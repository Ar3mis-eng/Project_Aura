# Project Aura — Laravel Backend Scaffold Pack

This folder contains Laravel-ready files (migrations, models, controllers, routes, seeders) matching the agreed MySQL schema. Use these after creating a Laravel app in `backend`.

## Quick Setup (Windows)

1) Create the Laravel app in `backend` (empty or keep only schema/docs):

```powershell
cd "d:\FINAL\Project_Aura\backend"
composer create-project laravel/laravel .
```

2) Add Sanctum (API tokens) and migrate its tables:

```powershell
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider"
php artisan migrate
```

3) Configure MySQL in `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aura
DB_USERNAME=root
DB_PASSWORD=your_password
SESSION_DRIVER=cookie
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

4) Copy files from this `laravel/` pack into your Laravel app:
- `routes/api.php` → replace the generated one
- All `database/migrations/*.php` → into `database/migrations/`
- All models → into `app/Models/`
- All controllers → into `app/Http/Controllers/`
- Requests → into `app/Http/Requests/`
- Seeders → into `database/seeders/`

5) Run migrations and seed demo data:

```powershell
php artisan migrate
php artisan db:seed --class=DemoSeeder
```

6) Serve API and test auth:

```powershell
php artisan serve
```

### Auth flow (token-based via Sanctum)
- POST `/api/auth/login` with `{ email, password }` → returns `{ token }`.
- Use header `Authorization: Bearer <token>` for subsequent requests.
- GET `/api/auth/me` to fetch current user.
- POST `/api/auth/logout` to revoke current token.

### Vertical slice endpoints
- POST `/api/reports` (student): create a report.
- GET `/api/reports` (teacher): list reports; students get only their own.

See controller code for more endpoints (threads/messages/question-sets).

Notes
- This pack is minimal and focuses on your agreed schema and endpoints.
- Later, promote inline `role` checks to Policies.
- CORS: in `config/cors.php`, allow the Vite origin (http://localhost:5173).
