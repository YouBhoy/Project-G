# SPARTAN-G Setup Guide for Collaborators

## Quick Start (30 seconds)

### 1. Open XAMPP and Start MySQL
- Launch XAMPP Control Panel
- Click **Start** next to MySQL module
- MySQL should be running on `localhost:3306`

### 2. Import Database Schema
Open phpMyAdmin (`http://localhost/phpmyadmin`) and:
1. Click **Import** tab
2. Select `backend/sql/setup-spartan-g.sql`
3. Click **Go**

✅ Database `spartan_g` is created with schema + test data

### 3. Install Dependencies & Configure

**Backend:**
```powershell
cd spartan-g/backend
npm install
Copy-Item ".env.example" -Destination ".env"
```

**Frontend:**
```powershell
cd spartan-g/student-portal
npm install
```

### 4. Run the Application

**Terminal 1 - Backend:**
```powershell
cd spartan-g/backend
npm run dev
# Should output: SPARTAN-G backend running on port 3001
```

**Terminal 2 - Frontend:**
```powershell
cd spartan-g/student-portal
npm run dev
# Should output: VITE dev server running at http://localhost:5175
```

### 5. Open in Browser
- Go to `http://localhost:5175`
- Login with test credentials:
  - **Email:** `alice@campus.edu`
  - **Password:** `password123`

---

## Database Details

**Database Name:** `spartan_g`  
**Host:** `localhost`  
**Port:** `3306`  
**User:** `root`  
**Password:** (empty)

### Test Data Included
- **5 Test Students** (STU001-STU005)
- **4 Emergency Contacts** (Hotline, Campus Services, etc.)
- **1 Default OGC Facilitator** (ogc@campus.edu)

All test accounts use password: `password123`

---

## Troubleshooting

### Backend won't start (EADDRINUSE)
- Port 3001 is in use. Kill the process:
  ```powershell
  Get-Process node | Stop-Process -Force
  ```

### MySQL Connection Error
- Verify XAMPP MySQL is running (green indicator)
- Check `.env` file has correct MYSQL_HOST, MYSQL_PORT, MYSQL_USER

### Frontend can't reach backend
- Ensure backend is running on port 3001
- Check browser console for CORS errors
- `.env` should have `VITE_API_BASE_URL=http://localhost:3001`

---

## Environment Files

- `.env` — Local configuration (gitignored, DO NOT COMMIT)
- `.env.example` — Template showing required variables

To set up local environment:
```powershell
cp .env.example .env
```

---

## Project Structure

```
spartan-g/
├── backend/
│   ├── src/
│   │   ├── server.js         # Express server entrypoint
│   │   ├── db.mysql.js       # MySQL driver
│   │   ├── routes/           # API route modules
│   │   ├── middleware/       # Auth & middleware
│   │   ├── utils/            # Helpers & scoring functions
│   │   └── storage/          # DB abstraction
│   ├── sql/
│   │   ├── schema.sql                # Table definitions only
│   │   └── setup-spartan-g.sql       # Complete setup (schema + seed data)
│   ├── .env.example          # Environment template
│   └── package.json
│
├── student-portal/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── api.js            # API client (fetch wrapper)
│   │   └── styles.css        # Styling
│   └── package.json
│
└── README.md
```

---

## Key APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | Student/OGC login |
| `/api/auth/signup` | POST | Register new student |
| `/api/student/profile/me` | GET | Get logged-in student |
| `/api/student/gawa/dass21/questions` | GET | DASS21 assessment questions |
| `/api/student/appointments/available` | GET | View available appointment slots |
| `/api/student/appointments/book` | POST | Book appointment |
| `/api/ogc/appointments` | GET | View all appointments (OGC) |
| `/api/ogc/availability/create` | POST | Create availability slot (OGC) |

---

## Notes

- **SQLite is NOT used** — Project strictly uses XAMPP MySQL
- Backend runs on **port 3001**
- Frontend runs on **port 5175**
- JWT authentication required for protected routes
- All timestamps stored as ISO-8601 strings (UTC)

---

## Need Help?

Check the main [README.md](./README.md) or contact the development team.
