# Railway Deployment Guide

Deploy Prompt Duel to Railway with 3 services.

## Services Overview

| # | Service | Directory | Port | Volume | Description |
|---|---------|-----------|------|--------|-------------|
| 1 | Frontend | `frontend/` | 80 | No | React app served via nginx |
| 2 | Backend | `backend/` | 3000 | Yes | Elysia API with SQLite database |
| 3 | Claude Code Server | `claude-code-server/` | 3001 | Yes | WebSocket PTY server for Claude CLI |

---

## Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Empty Project"**
3. Name your project (e.g., `prompt-duel`)

---

### Step 2: Deploy Backend (Service 1/3)

1. In your project, click **"New"** → **"GitHub Repo"**
2. Select your repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Builder | Dockerfile |

4. Go to **Variables** tab and add:

```
DATABASE_URL=/app/data/sqlite.db
NODE_ENV=production
```

5. Go to **Volumes** tab:
   - Click **"New Volume"**
   - Mount Path: `/app/data`
   - This persists your SQLite database

6. Go to **Settings** tab:
   - Generate a domain or add custom domain
   - Note the URL (e.g., `https://backend-xxx.up.railway.app`)

---

### Step 3: Deploy Claude Code Server (Service 2/3)

1. Click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| Root Directory | `claude-code-server` |
| Builder | Dockerfile |

4. Go to **Variables** tab and add:

```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
WORKSPACES_DIR=/app/workspaces
NODE_ENV=production
```

> **Important**: Get your API key from [Anthropic Console](https://console.anthropic.com/)

5. Go to **Volumes** tab:
   - Click **"New Volume"**
   - Mount Path: `/app/workspaces`
   - This persists player workspace files

6. Go to **Settings** tab:
   - Generate a domain
   - Note the URL (e.g., `https://claude-code-xxx.up.railway.app`)

---

### Step 4: Deploy Frontend (Service 3/3)

1. Click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Builder | Dockerfile |

4. Go to **Variables** tab and add (replace with your URLs from steps 2 & 3):

```
VITE_API_URL=https://backend-xxx.up.railway.app
VITE_WS_URL=wss://claude-code-xxx.up.railway.app
```

> **Note**: Use `https://` for API and `wss://` for WebSocket (secure protocols)

5. Go to **Settings** tab:
   - Generate a domain (this is your public app URL)

---

## Environment Variables Summary

### Backend
| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `/app/data/sqlite.db` | Yes |
| `NODE_ENV` | `production` | No |

### Claude Code Server
| Variable | Value | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxx` | **Yes** |
| `WORKSPACES_DIR` | `/app/workspaces` | Yes |
| `NODE_ENV` | `production` | No |

### Frontend (Build-time variables)
| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | `https://your-backend.up.railway.app` | Yes |
| `VITE_WS_URL` | `wss://your-claude-code-server.up.railway.app` | Yes |

---

## Volumes Summary

| Service | Mount Path | Purpose |
|---------|------------|---------|
| Backend | `/app/data` | SQLite database persistence |
| Claude Code Server | `/app/workspaces` | Player workspace files |

> **Warning**: Without volumes, data is lost on every deploy!

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Railway                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐ │
│  │  Frontend   │    │   Backend   │    │ Claude Code      │ │
│  │  (nginx)    │───▶│  (Elysia)   │    │ Server (node-pty)│ │
│  │  Port 80    │    │  Port 3000  │    │ Port 3001        │ │
│  └─────────────┘    └──────┬──────┘    └────────┬─────────┘ │
│                            │                     │           │
│                     ┌──────▼──────┐       ┌──────▼─────────┐ │
│                     │   Volume    │       │    Volume      │ │
│                     │  /app/data  │       │ /app/workspaces│ │
│                     │  (SQLite)   │       │ (Player files) │ │
│                     └─────────────┘       └────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Post-Deployment Checklist

- [ ] Backend is running (check `/health` endpoint)
- [ ] Claude Code Server is running (check logs)
- [ ] Frontend loads without errors
- [ ] WebSocket connection works (check browser console)
- [ ] Database persists after redeploy
- [ ] Player workspaces persist after redeploy

---

## Troubleshooting

### "Connection failed" in frontend
- Verify `VITE_API_URL` points to your backend URL
- Verify `VITE_WS_URL` points to your claude-code-server URL
- Ensure you're using `https://` and `wss://` (not `http://` or `ws://`)

### Claude Code not responding
- Check that `ANTHROPIC_API_KEY` is set correctly
- View claude-code-server logs in Railway dashboard

### Database resets on deploy
- Ensure volume is mounted at `/app/data`
- Check `DATABASE_URL=/app/data/sqlite.db`

### WebSocket connection fails
- Railway supports WebSockets by default
- Ensure you're using `wss://` protocol
- Check claude-code-server logs for errors

---

## Local Docker Testing

Test the full stack locally before deploying:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env and add your ANTHROPIC_API_KEY
notepad .env  # or use your editor

# 3. Build and run all services
docker-compose up --build

# 4. Access at http://localhost
```

---

## Cost Considerations

Railway pricing is usage-based. For this app:
- **Backend**: Low resource usage (SQLite is lightweight)
- **Claude Code Server**: Moderate usage (spawns PTY processes)
- **Frontend**: Minimal (static files served by nginx)
- **Volumes**: Charged per GB stored

Estimated cost: ~$5-20/month depending on usage.
