# SPARTAN-G Setup Guide

This guide is the shortest path to a working local build for collaborators.

## 1. Install Prerequisites

- Windows
- Node.js and npm
- XAMPP with MySQL
- Flutter only if you want the mobile app

## 2. Start MySQL

Open XAMPP Control Panel and start MySQL.

## 3. Import the Database

Open phpMyAdmin at `http://localhost/phpmyadmin` and import `backend/sql/setup-spartan-g.sql`.

That file creates the schema and seed data used by the prototype.

## 4. Create Local Env Files

Do not commit these files. Copy the examples instead:

```powershell
Copy-Item "backend\.env.example" -Destination "backend\.env"
Copy-Item "server\.env.example" -Destination "server\.env"
```

The backend `.env` is required for MySQL. The server `.env` is only needed if you want the optional Google Calendar bridge.

If you use calendar features, also place your own Google service account JSON in `server/service-account.json`.

## 5. Install Dependencies

```powershell
npm install
cd "backend"
npm install
cd "..\student-portal"
npm install
```

If you want the mobile app:

```powershell
cd "..\mobile-app"
flutter pub get
```

## 6. Run It

The easiest option is:

```powershell
cd "spartan-g"
.\start-all.bat
```

The script starts the backend and student portal, and only starts the calendar server or mobile app when the local prerequisites are available.

If you prefer manual start:

```powershell
cd "spartan-g\backend"
npm run dev
```

```powershell
cd "spartan-g\student-portal"
npm run dev
```

## 7. Open the Apps

- Student portal: `http://localhost:5175`
- Backend health: `http://localhost:3001/api/health`

Login with the seeded demo account from the database import.

## Local Files Checklist

- `backend/.env` for MySQL and backend settings
- `server/.env` only if you want calendar features
- `server/service-account.json` only if you want calendar features

## Troubleshooting

- If port `3001` is busy, stop the other Node process or let the launcher reuse your existing backend.
- If MySQL fails, confirm XAMPP MySQL is running.
- If calendar features fail, make sure `server/.env` and `server/service-account.json` exist locally.

## Security Note

Private keys, API tokens, and Google service account JSON files should stay local. Share the example files instead.
