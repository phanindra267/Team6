# Deployment Guide

## Prerequisites

- **Docker Desktop** (v24+) with Docker Compose v2
- **Node.js** v20+ (for local development without Docker)
- Ports **80**, **5000**, **5432**, **6379** must be free

---

## Option A — Docker Compose (Recommended)

This is the fastest path. One command starts all four services.

```bash
# 1. Clone the repository
git clone <repository-url>
cd Team6

# 2. Copy environment file
cp .env.example .env
# Edit .env if you have real SF or Slack credentials

# 3. Build and start all services
docker compose up --build

# 4. Access the application
#    Frontend:  http://localhost
#    Backend:   http://localhost:5000/api/health
```

### Service Startup Order
1. **PostgreSQL** starts first → health check passes
2. **Redis** starts → health check passes
3. **Backend** starts → runs `prisma migrate deploy` → health check passes
4. **Frontend** starts → Nginx serves the built React app

### Stopping Services
```bash
docker compose down
# To also remove database volumes:
docker compose down -v
```

---

## Option B — Local Development

### Backend
```bash
cd backend
npm install
npx prisma generate

# Start PostgreSQL and Redis (via Docker or local install)
docker compose up postgres redis -d

# Copy and configure environment
cp .env.example .env

# Run database migrations
npx prisma migrate dev --name init

# Start development server with hot-reload
npm run dev
# Backend available at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install

# Start Vite dev server (proxies /api to localhost:5000)
npm run dev
# Frontend available at http://localhost:3000
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/onboarding_db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SF_MOCK_MODE` | Use mock SuccessFactors | `true` |
| `SF_API_URL` | SuccessFactors API base URL | `https://api.successfactors.com` |
| `SF_CLIENT_ID` | SuccessFactors OAuth client ID | — |
| `SF_PRIVATE_KEY` | SuccessFactors private key | — |
| `SLACK_MOCK_MODE` | Use mock Slack webhooks | `true` |
| `SLACK_WEBHOOK_TEAM` | Team channel webhook URL | — |
| `SLACK_WEBHOOK_HR` | HR channel webhook URL | — |
| `PORT` | Backend server port | `5000` |

---

## Production Checklist

Before deploying to production:
- [ ] Set `NODE_ENV=production`
- [ ] Set `SF_MOCK_MODE=false` and provide real SF credentials
- [ ] Set `SLACK_MOCK_MODE=false` and provide real webhook URLs
- [ ] Use strong PostgreSQL password
- [ ] Configure Redis with password (`requirepass` in redis.conf)
- [ ] Set up TLS termination in front of Nginx
- [ ] Review and tighten `CORS` origin in backend `src/index.ts`
- [ ] Set `RATE_LIMIT_MAX` appropriately for your traffic
