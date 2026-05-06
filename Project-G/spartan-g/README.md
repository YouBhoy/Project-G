# Project SPARTAN-G (Student Side MVP)

This initial build includes:
- `backend`: authentication, consent, DASS-21, C-SSRS Lite, ESM check-ins, risk classification, referral triggers
- `student-portal`: login/signup + student assessment flow UI

## Run

### 1) Backend

```powershell
cd "spartan-g/backend"
npm install
npm run dev
```

Runs on `http://localhost:3001`.

If you want the XAMPP route, create a MySQL database in phpMyAdmin, import [backend/sql/schema.sql](backend/sql/schema.sql), then set `DB_CLIENT=mysql` in `backend/.env` with your MySQL settings.

Example `.env` values for a default XAMPP install:

```env
DB_CLIENT=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=spartan_g
```

The backend will then read and write against MySQL instead of the SQLite file.

### 2) Student Portal

```powershell
cd "spartan-g/student-portal"
npm install
$env:VITE_API_BASE_URL="http://localhost:3001"
npm run dev
```

Runs on `http://localhost:5175`.

## Testing the project with XAMPP

If you want to demo it the way you're used to, use XAMPP MySQL and a local database.

1. Open XAMPP Control Panel and start `MySQL`.
2. Open `http://localhost/phpmyadmin` in your browser.
3. Create a database named `spartan_g`.
4. Select the `spartan_g` database, then import [backend/sql/schema.sql](backend/sql/schema.sql).
5. Open [backend/.env](backend/.env) and make sure it contains:

```env
DB_CLIENT=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=spartan_g
```

6. In a terminal, run the backend:

```powershell
cd "spartan-g/backend"
npm install
npm run dev
```

7. In another terminal, run the student portal:

```powershell
cd "spartan-g/student-portal"
npm install
$env:VITE_API_BASE_URL="http://localhost:3001"
npm run dev
```

8. Open `http://localhost:5175` and test the flow:
- Sign up
- Log in
- Accept consent
- Take DASS-21
- Check the dashboard

Apache is optional for this prototype. You mainly need XAMPP MySQL, the backend server, and the Vite frontend.
# Project SPARTAN-G

Monorepo scaffold for the mental health support system for BatStateU-TNEU Lipa Campus.

## Layout

- `backend` - Node.js + Express + TypeScript API
- `mobile` - Flutter mobile client
- `dashboard` - React OGC facilitator dashboard
- `student-portal` - React student web portal (accessibility fallback)
