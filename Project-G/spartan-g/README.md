# SPARTAN-G

Monorepo for the BatStateU-TNEU Lipa campus mental health support prototype.

## What Runs

- `backend`: student auth, consent, assessments, ESM, risk scoring, referrals
- `student-portal`: student web app and facilitator dashboard
- `server`: optional Google Calendar bridge for calendar-backed features
- `mobile-app`: optional Flutter client

## Fast Setup

1. Install Node.js, npm, and XAMPP MySQL.
2. Start XAMPP MySQL.
3. Import [backend/sql/setup-spartan-g.sql](backend/sql/setup-spartan-g.sql) into phpMyAdmin.
4. Install dependencies in the root, backend, and student portal folders.
5. Run [start-all.bat](start-all.bat) from the `spartan-g` folder.

The launcher will copy `backend/.env` from `backend/.env.example` if it is missing. It will also copy `server/.env` from `server/.env.example` when you want calendar features.

## Local Files You Create

- `backend/.env` for MySQL and backend settings.
- `server/.env` and `server/service-account.json` only if you want the optional Google Calendar server.

These files are gitignored on purpose. Other collaborators should generate their own local copies from the example files.

## Manual Run

### Backend + student portal only

```powershell
cd "spartan-g"
npm install
cd "spartan-g/backend"
npm install
npm run dev
```

Then in a second terminal:

```powershell
cd "spartan-g/student-portal"
npm install
npm run dev
```

This starts the backend on `http://localhost:3001` and the student portal on `http://localhost:5175`.

### Optional calendar server

Use this only if you have your own Google service account JSON and calendar ID.

```powershell
cd "spartan-g/server"
npm install
npm start
```

Set `PORT=3002` if you want to match the launcher script.

## Phone Setup

If you are testing on a physical Android phone, read [PHONE_SETUP.md](PHONE_SETUP.md). It explains the LAN IP, Flutter build, and the optional calendar configuration.

## Notes

- Apache is optional; XAMPP MySQL is the important part for local development.
- Facilitator data is now filtered server-side by authenticated JWT identity.
- Keep private keys and tokens local. Share the `.env.example` files instead.
