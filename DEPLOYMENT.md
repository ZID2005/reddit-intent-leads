# SignalRadar Production Deployment Guide

This document describes how to deploy, configure, and troubleshoot the SignalRadar application in a production environment.

---

## 1. System Architecture & Components

SignalRadar consists of two main deployment targets:
1. **Frontend (Vite + React + TypeScript)**: Compiled to static HTML/JS/CSS assets. Can be served by Nginx, Cloudflare Pages, Vercel, or Netlify.
2. **Backend (FastAPI + Python + APScheduler)**: Running as a long-running process or background service, exposed via a reverse proxy (e.g., Nginx) over SSL.

---

## 2. Environment Variables Configuration

Secrets and environment configurations are separated into backend and frontend scopes.

### Backend Environment Variables (`.env` in Project Root)
Copy `.env.example` in the backend folder to the project root as `.env` and fill in the values:

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `SUPABASE_URL` | The HTTPS URL endpoint for your Supabase project. | **Yes** | `https://your-proj.supabase.co` |
| `SUPABASE_KEY` | The **service_role** secret API key for database access. | **Yes** | `sb_secret_abc123...` |
| `GROQ_API_KEY` | Your Groq Cloud console API credential. | **Yes** | `gsk_xyz789...` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend domain URLs. | No | `https://signalradar.app,http://localhost:5173` |
| `SCHEDULER_INTERVAL_HOURS` | Default time spacing between monitoring sweeps. | No | `6` |
| `SCHEDULER_API_PORT` | Port on which the FastAPI server listens. | No | `8000` |
| `APP_ENV` | Environment identifier (used in health/version). | No | `production` |

### Frontend Environment Variables (`.env.production` in `/frontend`)
Create a file named `.env.production` inside the `/frontend` directory:

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Public Supabase endpoint URL. | **Yes** | `https://your-proj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public **anon** (client-side) key for Supabase. | **Yes** | `eyJhbGciOi...` |
| `VITE_SCHEDULER_API_URL` | Base URL of your deployed Backend FastAPI server. | **Yes** | `https://api.signalradar.app` |

---

## 3. Backend Deployment Steps

### Step 3.1: Python Environment Setup
1. Clone the repository to the production server.
2. Create a Python virtual environment (version 3.10+ recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3.2: Configure Systemd Service (Linux Production)
To ensure the backend runs continuously in the background and restarts automatically on failures, configure a systemd service (e.g. `/etc/systemd/system/signalradar.service`):

```ini
[Unit]
Description=SignalRadar Backend FastAPI & Scheduler Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/reddit-intent-leads
ExecStart=/home/ubuntu/reddit-intent-leads/venv/bin/python -m backend.app_entry
Restart=always
EnvironmentFile=/home/ubuntu/reddit-intent-leads/.env

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable signalradar
sudo systemctl start signalradar
```

---

## 4. Frontend Deployment Steps

### Step 4.1: Compile Production Assets
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the production build compilation:
   ```bash
   npm run build
   ```
This generates optimized static files inside the `frontend/dist/` directory.

### Step 4.2: Web Server Configuration (Nginx Example)
Configure a server block in your `/etc/nginx/sites-available/default` file:

```nginx
server {
    listen 80;
    server_name signalradar.app;

    # Root directory pointing to compiled Vite assets
    root /home/ubuntu/reddit-intent-leads/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy backend API calls to FastAPI running on port 8000
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Production Startup Commands

### Start Backend Directly
```bash
python -m backend.app_entry
```

### Verify Running Port
To check if the API port (default 8000) is open and listening:
```bash
netstat -tulpn | grep 8000
```

---

## 6. Troubleshooting Guide

### 1. Fail-Fast Startup Error
If you launch the backend and see a traceback concluding in:
`ValueError: CRITICAL STARTUP ERROR: Required environment variable(s) missing: ...`
- **Cause**: Required secrets (`SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_KEY`) are not loaded.
- **Fix**: Check that the `.env` file is present in the workspace root, formatted as `KEY=value`, and that your service accounts are active.

### 2. CORS Block Errors in Browser
If the frontend console logs network errors like:
`Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- **Cause**: The frontend domain origin is not in the backend's allowed list.
- **Fix**: Update the `ALLOWED_ORIGINS` variable in your backend `.env` file to include the frontend URL (e.g. `ALLOWED_ORIGINS=https://signalradar.app`), then restart the backend service.

### 3. Database connectivity fails
If `GET /health` returns a `"status": "degraded"` status indicating database disconnects:
- **Cause**: Invalid Supabase keys or service suspension.
- **Fix**: Check your credentials and run a simple manual connection test.

### 4. Scheduler Offline Status
If the live indicator in the dashboard reports "OFFLINE":
- **Cause**: The backend FastAPI scheduler process crashed or port 8000 is blocked.
- **Fix**: Run `sudo systemctl status signalradar` to inspect python runtime logs.
