# Project SPARTAN-G (Student Side MVP)

This initial build includes:
- `backend`: authentication, consent, DASS-21, C-SSRS Lite, ESM check-ins, risk classification, referral triggers
- `student-portal`: login/signup + student assessment flow UI

## Run

### 1) Backend

Copy the example env file and edit it if needed:

```bash
cd "Project-G/spartan-g/backend"
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:3001`.

### 2) Student Portal

**Windows (PowerShell):**

```powershell
cd "Project-G/spartan-g/student-portal"
npm install
$env:VITE_API_BASE_URL="http://localhost:3001"
npm run dev
```

**macOS / Linux (bash/zsh):**

```bash
cd "Project-G/spartan-g/student-portal"
npm install
VITE_API_BASE_URL="http://localhost:3001" npm run dev
```

Runs on `http://localhost:5175`.
# Project SPARTAN-G

Monorepo scaffold for the mental health support system for BatStateU-TNEU Lipa Campus.

## Layout

- `backend` - Node.js + Express + TypeScript API
- `mobile` - Flutter mobile client
- `dashboard` - React OGC facilitator dashboard
- `student-portal` - React student web portal (accessibility fallback)
