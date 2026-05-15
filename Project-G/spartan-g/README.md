# Project SPARTAN-G (Student Side MVP)

This initial build includes:
- `backend`: authentication, consent, DASS-21, C-SSRS Lite, ESM check-ins, risk classification, referral triggers
- `student-portal`: login/signup + student assessment flow UI

## Run

If you want everything in one shot, run [start-all.bat](start-all.bat) from the `spartan-g` folder. It opens the backend, calendar server, student portal, and Flutter app in separate windows.

**Local Setup Checklist (quick):**
- **Install tooling:** Node.js + npm, Flutter (if using mobile), XAMPP MySQL.
- **Database:** Import `backend/sql/setup-spartan-g.sql` into phpMyAdmin and create `backend/.env` from `.env.example` with your local MySQL values and `PORT=3001`.
- **Secrets (do NOT commit):** create `server/.env` with `CALENDAR_ID` and put `server/service-account.json` (Google service account) into `server/` if using calendar features.
- **Install deps:** run `npm install` in `backend/`, `server/`, and `student-portal/`; run `flutter pub get` in `mobile-app/`.
- **Run:** use `start-all.bat` or run services individually; for a physical phone, set `MOBILE_API_BASE_URL` to your PC LAN IP before running.

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
## 🚀 Quick Setup

**See [SETUP.md](./SETUP.md) for complete step-by-step guide** (30 seconds with XAMPP MySQL)

### TL;DR
1. Start XAMPP MySQL
2. Import `backend/sql/setup-spartan-g.sql` via phpMyAdmin
3. `npm install` in both `backend/` and `student-portal/`
4. `npm run dev` in `backend/` (port 3001)
5. `npm run dev` in `student-portal/` (port 5175)
6. Open `http://localhost:5175` → `alice@campus.edu` / `password123`
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

For phone/device setup, backend startup, and collaborator instructions, see [PHONE_SETUP.md](PHONE_SETUP.md).

## Layout

- `backend` - Node.js + Express + TypeScript API
- `mobile` - Flutter mobile client
- `dashboard` - React OGC facilitator dashboard
- `student-portal` - React student web portal (accessibility fallback)
