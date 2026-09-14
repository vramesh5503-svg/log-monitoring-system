# API Documentation — Log Security Monitoring System

Base URL: `http://localhost:8000/api/v1`  
Interactive UI: `http://localhost:8000/docs` (Swagger) | `http://localhost:8000/redoc` (ReDoc)

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### POST /auth/register
Create a new user account.

**Request body**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response 201**
```json
{
  "id": 2,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-07-29T10:00:00Z",
  "last_login": null
}
```

**Errors:** `400` username or email already taken, `422` validation failure

---

### POST /auth/login
Exchange credentials for a JWT.

**Request body**
```json
{ "username": "admin", "password": "Admin@12345" }
```

**Response 200**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": { "id": 1, "username": "admin", "role": "admin", ... }
}
```

**Errors:** `401` wrong credentials, `403` inactive account

---

### GET /auth/me *(protected)*
Return the currently authenticated user.

**Response 200** — same shape as `UserOut` above.

---

### POST /auth/logout *(protected)*
Client-side logout — instructs the client to discard the token.

**Response 200**
```json
{ "message": "Goodbye, admin." }
```

---

## Logs

### GET /logs *(protected)*
Paginated, filtered log list.

**Query parameters**

| Parameter   | Type    | Default | Description                              |
|-------------|---------|---------|------------------------------------------|
| `page`      | int     | 1       | Page number (1-based)                    |
| `page_size` | int     | 50      | Items per page (max 500)                 |
| `severity`  | string  | —       | INFO \| LOW \| MEDIUM \| HIGH \| CRITICAL|
| `event_type`| string  | —       | e.g. SQL_INJECTION                       |
| `source_ip` | string  | —       | Partial IP match                         |
| `search`    | string  | —       | Free-text search in message              |
| `start_time`| ISO dt  | —       | Lower bound timestamp                    |
| `end_time`  | ISO dt  | —       | Upper bound timestamp                    |
| `sort_desc` | bool    | true    | Newest first                             |

**Response 200**
```json
{
  "total": 1234,
  "page": 1,
  "page_size": 50,
  "total_pages": 25,
  "items": [
    {
      "id": 42,
      "timestamp": "2024-07-29T14:32:01Z",
      "message": "Failed password for root from 10.0.0.5",
      "severity": "HIGH",
      "source_ip": "10.0.0.5",
      "event_type": "SSH_AUTH_FAILURE",
      "source": "/var/log/auth.log",
      "raw_line": "Jul 29 14:32:01 host sshd[1234]: Failed password..."
    }
  ]
}
```

---

### GET /logs/stats *(protected)*
Dashboard aggregated statistics.

**Response 200**
```json
{
  "total_logs": 5000,
  "critical": 12,
  "high": 87,
  "medium": 203,
  "low": 456,
  "info": 4242,
  "today_events": 341,
  "total_alerts": 102,
  "severity_distribution": [
    { "severity": "CRITICAL", "count": 12 }
  ],
  "hourly_events": [
    { "hour": "2024-07-29T13:00", "count": 45 }
  ],
  "top_ips": [
    { "source_ip": "192.168.1.100", "count": 78 }
  ],
  "attack_categories": [
    { "event_type": "SQL_INJECTION", "count": 34 }
  ]
}
```

---

### GET /logs/{id} *(protected)*
Single log entry detail.

**Response 200** — `LogOut` object (same shape as items above).  
**Errors:** `404` not found

---

### DELETE /logs/{id} *(admin only)*
Delete a log entry and all its associated alerts.

**Response 200**
```json
{ "message": "Log 42 deleted successfully." }
```

**Errors:** `403` not admin, `404` not found

---

## Alerts

### GET /alerts *(protected)*
Paginated, filtered alert list.

**Query parameters**

| Parameter    | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `alert_type` | string | FAILED_LOGIN, SQL_INJECTION, XSS, etc.   |
| `severity`   | string | INFO \| LOW \| MEDIUM \| HIGH \| CRITICAL|
| `source_ip`  | string | Partial match                            |
| `start_time` | ISO dt | Lower bound                              |
| `end_time`   | ISO dt | Upper bound                              |
| `page`       | int    | 1-based page number                      |
| `page_size`  | int    | Max 500                                  |

**Response 200**
```json
{
  "total": 102,
  "page": 1,
  "page_size": 50,
  "total_pages": 3,
  "items": [
    {
      "id": 5,
      "log_id": 42,
      "alert_type": "SQL_INJECTION",
      "severity": "CRITICAL",
      "description": "SQL injection attempt detected.",
      "source_ip": "10.0.0.5",
      "created_at": "2024-07-29T14:32:01Z"
    }
  ]
}
```

---

### GET /alerts/summary *(protected)*
Count totals for the Alerts page cards.

**Response 200**
```json
{
  "total": 102,
  "critical": 12,
  "failed_logins": 34,
  "sql_injections": 18,
  "xss_attacks": 7,
  "brute_force": 5,
  "malware": 3
}
```

---

### GET /alerts/critical *(protected)*
Most recent CRITICAL alerts.

**Query:** `?limit=50`

**Response 200** — array of `AlertOut` objects.

---

## Reports

### GET /report *(protected)*
JSON summary for the given period.

**Query:** `?period=daily` | `weekly` | `monthly`

**Response 200**
```json
{
  "period": "daily",
  "start_date": "2024-07-29T00:00:00Z",
  "end_date": "2024-07-29T15:00:00Z",
  "generated_at": "2024-07-29T15:00:00Z",
  "total_logs": 341,
  "total_alerts": 28,
  "critical_alerts": 3,
  "high_alerts": 11,
  "medium_alerts": 9,
  "low_alerts": 5,
  "top_event_types": [
    { "event_type": "FAILED_LOGIN", "count": 18 }
  ],
  "top_source_ips": [
    { "source_ip": "10.0.0.5", "count": 24 }
  ]
}
```

---

### GET /export/csv *(protected)*
Download all log entries for the period as a CSV file.

**Query:** `?period=daily`  
**Response:** `text/csv` attachment

---

### GET /export/json *(protected)*
Download all log entries + summary as JSON.

**Query:** `?period=weekly`  
**Response:** `application/json` attachment

---

### GET /export/pdf *(protected)*
Download a formatted PDF report.

**Query:** `?period=monthly`  
**Response:** `application/pdf` attachment

---

## Monitoring

### POST /monitor/start *(admin only)*
Start real-time Watchdog monitoring on a log file.

**Request body**
```json
{
  "watch_path": "/var/log/auth.log",
  "alert_threshold": 5,
  "email_enabled": false,
  "email_recipient": null
}
```

**Response 200**
```json
{
  "is_running": true,
  "watch_path": "/var/log/auth.log",
  "message": "Monitoring active."
}
```

**Errors:** `404` file not found, `403` not admin

---

### POST /monitor/stop *(admin only)*
Stop the active file watcher.

**Response 200**
```json
{ "is_running": false, "watch_path": null, "message": "Monitoring stopped." }
```

---

### GET /monitor/status *(protected)*
Current monitoring state.

**Response 200** — same shape as start/stop response.

---

### POST /upload-log *(protected)*
Upload a log file and scan it immediately.

**Request:** `multipart/form-data`  
**Field:** `file` — `.log`, `.txt`, or `.csv` (max 50 MB)

**Response 200**
```json
{
  "message": "File 'auth.log' uploaded and scanned successfully.",
  "detail": { "lines_processed": 4821, "saved_as": "uploads/20240729_150000_auth.log" }
}
```

**Errors:** `413` file too large, `415` unsupported format

---

## WebSocket

### WS /ws
Real-time alert push endpoint.

Connect from the browser:
```js
const ws = new WebSocket('ws://localhost:8000/ws')
ws.onmessage = (event) => {
  const alert = JSON.parse(event.data)
  // alert.type === 'new_alert'
  console.log(alert.severity, alert.event_type, alert.source_ip)
}
```

**Incoming message shape**
```json
{
  "type": "new_alert",
  "log_id": 42,
  "severity": "CRITICAL",
  "event_type": "SQL_INJECTION",
  "source_ip": "10.0.0.5",
  "message": "UNION SELECT * FROM users -- (first 200 chars)"
}
```

Send `"ping"` to receive `{"type":"pong"}` for keep-alive.

---

## Error Responses

All errors return a consistent JSON body:

```json
{
  "detail": "Human-readable error message."
}
```

| Status | Meaning                          |
|--------|----------------------------------|
| 400    | Bad request / validation failed  |
| 401    | Missing or invalid JWT           |
| 403    | Insufficient role / inactive     |
| 404    | Resource not found               |
| 413    | Payload too large                |
| 415    | Unsupported media type           |
| 422    | Pydantic validation error        |
| 500    | Internal server error            |
