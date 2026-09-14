# Log Security Monitoring System

A full-stack real-time security log monitoring platform. The backend detects threats in log files using regex-based rules and stores alerts in a database. The frontend displays everything in a dark-themed dashboard with live WebSocket updates.

---

## Tech Stack

| Layer     | Technology                                         |
|-----------|----------------------------------------------------|
| Frontend  | React 18, Vite 5, Tailwind CSS 3, Recharts, Axios |
| Backend   | Python 3.11+, FastAPI, SQLAlchemy, SQLite          |
| Auth      | JWT (python-jose), bcrypt (passlib)                |
| Realtime  | WebSockets (FastAPI native)                        |
| Monitoring| Watchdog (file system events)                      |
| Reports   | ReportLab (PDF), csv module, json                  |

---

## Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (auth, logs, alerts, reports, monitoring)
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── database/       # Engine, session, init_db
│   │   ├── services/       # Business logic (auth, log, alert, report, monitor, websocket)
│   │   ├── detector/       # Detection engine, rules, log parser
│   │   ├── utils/          # Config, logger, helpers, email
│   │   └── main.py         # FastAPI application entry point
│   ├── uploads/            # Uploaded log files
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/     # Layout, Sidebar, Topbar, StatCard, SeverityBadge, LoadingSpinner
    │   ├── pages/          # Dashboard, Logs, Alerts, Reports, Settings, Login, Register
    │   ├── charts/         # SeverityPie, HourlyEvents, TopIPs, AttackCategories
    │   ├── context/        # AuthContext (JWT state management)
    │   ├── hooks/          # useDashboard, useLogs, useAlerts, useWebSocket, useMonitor
    │   ├── services/       # api.js (axios), authService, logService, alertService, etc.
    │   └── index.css       # Tailwind + custom component classes
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Quick Start

### 1 — Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Start the development server
python run.py
# or:  uvicorn app.main:app --reload --port 8000
```

The API is now available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Start the Vite dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Default Admin Credentials

| Field    | Value         |
|----------|---------------|
| Username | `admin`       |
| Password | `Admin@12345` |

> Change these in `backend/.env` before deploying to production.

---

## Detection Rules

The engine (`detector/engine.py`) evaluates every log line against 9 rule sets:

| Rule                 | Severity | Example Pattern                          |
|----------------------|----------|------------------------------------------|
| Failed Login         | MEDIUM   | `failed login`, `invalid user`           |
| SSH Auth Failure     | HIGH     | `sshd.*failed`, `too many auth failures` |
| SQL Injection        | CRITICAL | `UNION SELECT`, `OR 1=1`, `DROP TABLE`   |
| XSS                  | HIGH     | `<script>`, `onerror=`, `javascript:`    |
| Brute Force          | CRITICAL | `brute force`, `account locked`          |
| Port Scan            | MEDIUM   | `nmap`, `port scan`, `masscan`           |
| Malware              | CRITICAL | `ransomware`, `reverse shell`, `mimikatz`|
| Suspicious IP        | HIGH     | `blacklisted ip`, `threat intelligence`  |
| Unauthorized Access  | HIGH     | `access denied`, `sudo.*FAILED`          |

A **brute-force heuristic** also fires automatically when a single IP exceeds `ALERT_THRESHOLD` failed attempts within `BRUTE_FORCE_WINDOW` seconds (configurable in `.env`).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                    | Default                  | Description                          |
|-----------------------------|--------------------------|--------------------------------------|
| `DATABASE_URL`              | `sqlite:///./logs_security.db` | Database connection string     |
| `SECRET_KEY`                | *(change this!)*         | JWT signing key (min 32 chars)       |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `1440`                  | Token lifetime (24 h)               |
| `FRONTEND_URL`              | `http://localhost:5173`  | CORS allowed origin                  |
| `ADMIN_USERNAME`            | `admin`                  | Seeded admin username                |
| `ADMIN_PASSWORD`            | `Admin@12345`            | Seeded admin password                |
| `ALERT_THRESHOLD`           | `5`                      | Failed attempts before brute-force   |
| `BRUTE_FORCE_WINDOW`        | `300`                    | Detection window in seconds          |
| `EMAIL_HOST`                | *(optional)*             | SMTP server for alert emails         |
| `MAX_UPLOAD_SIZE_MB`        | `50`                     | Max uploaded log file size           |

### Frontend (`frontend/.env`)

| Variable             | Default                          |
|----------------------|----------------------------------|
| `VITE_API_BASE_URL`  | `http://localhost:8000/api/v1`   |
| `VITE_WS_URL`        | `ws://localhost:8000/ws`         |

---

## Features

### Authentication
- Register / Login with JWT
- Role-based access (Admin / User)
- Tokens stored in `localStorage`, injected on every API request
- Auto-logout on 401 responses

### Dashboard
- 7 stat cards: Total Logs, Critical, High, Medium, Low, Info, Today
- Severity donut chart
- Events-per-hour area chart (last 24 h)
- Top attacker IPs horizontal bar chart
- Attack categories vertical bar chart
- Live WebSocket alert feed with CRITICAL toast notifications
- 30-second auto-refresh

### Log Viewer
- Paginated table (50 per page)
- Search (debounced 400 ms)
- Filter by Severity and Event Type
- Toggle newest/oldest sort
- Expandable row detail (full message, raw line, source)
- Admin delete

### Alerts Page
- 7 summary count cards
- Filter by Alert Type and Severity
- Expandable alert detail rows

### Reports
- Daily / Weekly / Monthly summaries
- Export as **PDF** (ReportLab), **CSV**, or **JSON**
- Top event types and top source IPs

### Settings
- Start/stop real-time Watchdog file monitoring
- Upload log files (drag & drop, up to 50 MB)
- Alert threshold and email configuration info

---

## API Summary

See **http://localhost:8000/docs** for the full interactive Swagger UI.

Base path: `/api/v1`

```
POST   /auth/register
POST   /auth/login
GET    /auth/me
POST   /auth/logout

GET    /logs               ?page, page_size, severity, event_type, search, sort_desc
GET    /logs/stats
GET    /logs/{id}
DELETE /logs/{id}          (admin only)

GET    /alerts             ?page, page_size, alert_type, severity
GET    /alerts/summary
GET    /alerts/critical    ?limit

GET    /report             ?period=daily|weekly|monthly
GET    /export/csv         ?period=
GET    /export/json        ?period=
GET    /export/pdf         ?period=

POST   /monitor/start      { watch_path, alert_threshold }  (admin)
POST   /monitor/stop       (admin)
GET    /monitor/status
POST   /upload-log         multipart/form-data

WS     /ws                 real-time alert push
```

---

## Production Checklist

- [ ] Change `SECRET_KEY` to a cryptographically random string (`python -c "import secrets; print(secrets.token_hex(32))"`)
- [ ] Change `ADMIN_PASSWORD` to a strong password
- [ ] Switch `DATABASE_URL` to PostgreSQL
- [ ] Set `DEBUG=False`
- [ ] Serve frontend build (`npm run build`) via nginx or a CDN
- [ ] Restrict `CORS` `allow_origins` to your actual domain
- [ ] Configure SMTP for email alerts
- [ ] Run behind HTTPS (TLS termination at reverse proxy)
