# 🚀 Employee Onboarding Flow — Team 06

> **INTEGRTR × LPU Hackathon 2026 · Track 1: Employee Onboarding Flow**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## ✨ Elevator Pitch

**Employee Onboarding Flow** is a production-grade, event-driven automation platform that orchestrates every step of employee onboarding — from SAP SuccessFactors data sync to Slack notifications — through an idempotent saga engine backed by BullMQ. Built with resilience at its core, every workflow step is independently retryable, skipping already-successful steps so partial failures never restart the whole process. A glassmorphism dark-mode React dashboard gives HR teams complete real-time visibility into onboarding status, failure injection for testing, and a one-click Retry Center — all deployable with a single `docker compose up --build`.

---

## ✅ Features

- ☑️ **Idempotent Saga Orchestration** — each workflow step is independently tracked; re-runs skip steps that have already succeeded, preventing duplicate side-effects
- ☑️ **SAP SuccessFactors OData Integration** — fetches employee master data via OAuth 2.0 SAML assertion flow with a configurable mock mode for safe offline development
- ☑️ **Slack Webhook Notifications with Deep Links** — HR and team channels receive rich-formatted Slack messages with direct links back to the employee detail page
- ☑️ **BullMQ Async Queue Processing** — all onboarding jobs are queued through Redis-backed BullMQ workers, decoupling the API layer from long-running orchestration tasks
- ☑️ **Retry Center Skips Successful Steps** — the Retry Center UI surfaces only failed workflows; retrying a job re-executes only the failed saga step, not the full workflow
- ☑️ **Failure Monitoring with Mock Injection** — dedicated Failure Monitoring page lets testers inject synthetic failures using special email patterns to validate retry logic and alerting
- ☑️ **Glassmorphism Dark-Mode Dashboard** — a fully responsive React + Tailwind CSS dashboard with frosted-glass card components, live status badges, and animated workflow progress rings
- ☑️ **Docker Compose One-Command Deployment** — four services (Postgres 16, Redis 7, Express API, Nginx SPA) start and health-check automatically with `docker compose up --build`

---

## 🏛️ Architecture Overview

The system follows a **queue-driven saga pattern**. An HTTP request to the Express backend (TypeScript) enqueues an onboarding job in a BullMQ queue backed by Redis. A dedicated BullMQ worker picks up the job and executes a multi-step saga: (1) fetching the employee record from SAP SuccessFactors via OData, (2) persisting the canonical record to PostgreSQL through Prisma ORM, (3) notifying the team Slack channel, and (4) notifying the HR Slack channel. Every saga step writes its outcome — `COMPLETED` or `FAILED` — to the database before advancing, ensuring idempotency across retries. The React frontend (Vite + React 18 + Tailwind CSS) communicates with the backend via a versioned REST API and is served as a static SPA behind an Nginx reverse proxy in production.

```mermaid
flowchart TD
    User(["👤 HR User\n(Browser)"])
    FE["⚛️ React SPA\n(Nginx :80)"]
    BE["🟢 Express API\n(:5000)"]
    Q[("⚡ BullMQ Queue\n(Redis :6379)")]
    W["🔧 BullMQ Worker"]
    SF["☁️ SAP SuccessFactors\nOData API"]
    DB[("🐘 PostgreSQL\n(:5432)")]
    SL["📢 Slack\nWebhooks"]

    User -->|"HTTP / REST"| FE
    FE -->|"REST API"| BE
    BE -->|"Enqueue job"| Q
    Q -->|"Job dispatch"| W
    W -->|"Fetch employee data"| SF
    W -->|"Persist saga steps"| DB
    W -->|"Send notifications"| SL
    BE -->|"Query status"| DB

    style User fill:#6366f1,color:#fff,stroke:none
    style FE fill:#0ea5e9,color:#fff,stroke:none
    style BE fill:#22c55e,color:#fff,stroke:none
    style Q fill:#ef4444,color:#fff,stroke:none
    style W fill:#f97316,color:#fff,stroke:none
    style SF fill:#0f172a,color:#94a3b8,stroke:#475569
    style DB fill:#3b82f6,color:#fff,stroke:none
    style SL fill:#7c3aed,color:#fff,stroke:none
```

---

## ⚡ Quick Start

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20 LTS or later | Required for local dev path |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest stable | Required for Docker path |
| npm | 10+ | Bundled with Node 20 |

---

### 1 · Clone & Configure

```bash
# Clone the repository
git clone https://github.com/your-org/team06-onboarding.git
cd team06-onboarding

# Copy the environment template and edit values as needed
cp .env.example .env
```

> **Tip:** The defaults in `.env.example` use `SF_MOCK_MODE=true` and `SLACK_MOCK_MODE=true` so the full workflow runs without real SAP or Slack credentials. You can demo the entire system out of the box.

---

### 2 · Docker Path *(Recommended)*

Spin up all four services — Postgres, Redis, Express API, and the React SPA behind Nginx — in a single command:

```bash
docker compose up --build
```

Docker Compose will:
1. Pull `postgres:16-alpine` and `redis:7-alpine` base images
2. Build the Express backend image from `./backend/Dockerfile`
3. Build and statically export the React frontend, served by Nginx, from `./frontend/Dockerfile`
4. Wait for Postgres and Redis health checks before starting the backend
5. Wait for the backend health check before starting the frontend

| Service | URL |
|---|---|
| **Dashboard (React SPA)** | http://localhost:80 |
| **Backend REST API** | http://localhost:5000/api |
| **Health endpoint** | http://localhost:5000/api/health |
| **PostgreSQL** | `localhost:5432` (user: `postgres`, db: `onboarding_db`) |
| **Redis** | `localhost:6379` |

> **Important:** The application dashboard is available at **http://localhost:80** once all health checks pass (typically ~60 seconds on first build).

To stop and remove all containers:

```bash
docker compose down
```

To stop and also remove persistent volumes *(wipes all database data)*:

```bash
docker compose down -v
```

---

### 3 · Local Development Path

Run the backend and frontend independently with hot-reload for a faster development loop.

#### Backend

```bash
cd backend
npm install

# Ensure PostgreSQL and Redis are running (via Docker or locally)
# Then run Prisma migrations
npx prisma migrate dev --name init

# Start the dev server with ts-node-dev hot reload
npm run dev
# → API listening on http://localhost:5000
```

#### Frontend

```bash
cd frontend
npm install

# Start Vite dev server with HMR
npm run dev
# → SPA available on http://localhost:5173
```

> **Note:** During local dev, the Vite dev server proxies `/api` requests to `http://localhost:5000` automatically via the config in `vite.config.ts`. No CORS changes are required.

---

## 📁 Project Structure

```
team06-onboarding/
├── .env.example                  # Environment variable template
├── .github/                      # CI/CD workflows
├── docker-compose.yml            # Multi-service orchestration
│
├── backend/                      # Express + TypeScript API
│   ├── Dockerfile
│   ├── jest.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (OnboardingJob, SagaStep)
│   ├── tests/
│   │   ├── unit/
│   │   │   └── saga.test.ts      # Saga orchestration unit tests
│   │   └── integration/          # Integration test suites
│   └── src/
│       ├── index.ts              # Express app entry point
│       ├── config/
│       │   ├── db.ts             # Prisma client singleton
│       │   ├── env.ts            # Validated env config (zod)
│       │   ├── logger.ts         # Pino structured logger
│       │   └── redis.ts          # BullMQ Redis connection
│       ├── controllers/
│       │   ├── onboarding.controller.ts   # POST /api/onboarding, GET /api/onboarding/:id
│       │   └── dashboard.controller.ts    # GET /api/dashboard/stats
│       ├── middleware/
│       │   ├── error.middleware.ts        # Global error handler
│       │   ├── rate-limit.middleware.ts   # express-rate-limit config
│       │   └── validate.middleware.ts     # Zod request body validation
│       ├── routes/
│       │   └── index.ts                   # Route aggregator
│       └── services/
│           ├── onboarding.service.ts      # Saga orchestrator (core logic)
│           ├── queue.service.ts           # BullMQ producer & worker setup
│           ├── slack.service.ts           # Slack webhook client (real + mock)
│           └── successfactors.service.ts  # SuccessFactors OData client (real + mock)
│
└── frontend/                     # React 18 + Vite + Tailwind CSS SPA
    ├── Dockerfile
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── src/
        ├── main.tsx              # React entry point
        ├── App.tsx               # Router & layout wrapper
        ├── App.css               # Global glassmorphism styles
        ├── index.css             # Tailwind base + custom CSS vars
        ├── components/
        │   ├── GlassCard.tsx         # Reusable frosted-glass card
        │   ├── Layout.tsx            # Sidebar navigation shell
        │   ├── SkeletonLoader.tsx    # Loading skeleton component
        │   ├── StatusBadge.tsx       # Colour-coded status pill
        │   └── WorkflowProgress.tsx  # Animated saga step progress
        ├── pages/
        │   ├── Dashboard.tsx         # KPI summary + recent jobs table
        │   ├── NewEmployee.tsx        # Onboarding trigger form
        │   ├── EmployeeDetails.tsx    # Full saga step timeline
        │   ├── RetryCenter.tsx        # Failed jobs list + retry trigger
        │   ├── FailureMonitoring.tsx  # Failure injection + monitoring
        │   ├── WorkflowHistory.tsx    # Full paginated job history
        │   └── SystemHealth.tsx       # Queue depth + service health
        └── services/
            └── api.ts                # Axios API client + typed helpers
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and adjust the values for your environment. Variables marked **required for production** must be set when `SF_MOCK_MODE` or `SLACK_MOCK_MODE` is `false`.

| Name | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |
| `PORT` | Express server listening port | `5000` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name | `onboarding_db` |
| `DATABASE_URL` | Full Prisma connection string | `postgresql://postgres:postgres@localhost:5432/onboarding_db?schema=public` |
| `REDIS_URL` | Redis connection URL for BullMQ | `redis://localhost:6379` |
| `SF_MOCK_MODE` | Use mock SuccessFactors data instead of live API | `true` |
| `SF_API_URL` | SAP SuccessFactors base API URL | `https://api.successfactors.com` |
| `SF_CLIENT_ID` | OAuth 2.0 client ID *(required for production)* | *(empty)* |
| `SF_PRIVATE_KEY` | OAuth 2.0 private key for SAML assertion *(required for production)* | *(empty)* |
| `SLACK_MOCK_MODE` | Log Slack payloads to console instead of posting | `true` |
| `SLACK_WEBHOOK_TEAM` | Incoming webhook URL for team channel *(required for production)* | *(empty)* |
| `SLACK_WEBHOOK_HR` | Incoming webhook URL for HR channel *(required for production)* | *(empty)* |
| `RATE_LIMIT_MAX` | Max requests per window per IP | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` *(15 min)* |

> ⚠️ **Never commit a `.env` file containing real credentials to version control.** `.env` is already listed in `.gitignore`.

---

## 💣 Demo Failure Injection

When `SF_MOCK_MODE=true`, the SuccessFactors service inspects the employee's email address and simulates specific failure modes, allowing you to exercise every code path — including error handling, retry logic, and Slack failure alerts — without touching a live system.

Submit a **New Employee** form with one of the following email patterns to trigger the corresponding behaviour:

| Email Pattern | Step Triggered | Failure Mode |
|---|---|---|
| `fail.sf@*` | `FETCH_SF_DATA` | SuccessFactors OData fetch throws a 503 error |
| `fail.db@*` | `PERSIST_RECORD` | Prisma database write throws a constraint error |
| `fail.slack.team@*` | `NOTIFY_TEAM` | Slack team webhook returns a non-2xx response |
| `fail.slack.hr@*` | `NOTIFY_HR` | Slack HR webhook returns a non-2xx response |
| `fail.all@*` | `FETCH_SF_DATA` | All steps fail in sequence (tests full cascade) |
| *(any other email)* | — | All four saga steps complete successfully ✅ |

> **Note:** Failed jobs appear immediately in the **Retry Center** page. Clicking **Retry** re-enqueues only the failed saga step — successfully completed earlier steps are detected and skipped automatically by the idempotency guard.

---

## 🧪 Testing

The test suite uses **Jest** with **ts-jest** for TypeScript support. Unit tests mock all external dependencies (Prisma, BullMQ, Slack, SuccessFactors) so the suite runs fully offline with no live services required.

### Run All Tests

```bash
cd backend
npm test
```

### Run with Coverage Report

```bash
cd backend
npm test -- --coverage
```

### Run a Specific Test File

```bash
cd backend
npm test -- tests/unit/saga.test.ts
```

### Test Files

| File | Type | Coverage |
|---|---|---|
| `tests/unit/saga.test.ts` | Unit | Saga orchestration, idempotency guard, step isolation, failure injection |
| `tests/integration/` | Integration | Full request → queue → worker → DB round-trip *(requires live Postgres + Redis)* |

---

## 👥 Team

| | |
|---|---|
| **Team** | Team 06 |
| **Hackathon** | INTEGRTR × LPU Hackathon 2026 |
| **Track** | Track 1 — Employee Onboarding Flow |

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Team 06 — INTEGRTR × LPU Hackathon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">Built with ❤️ by Team 06 · INTEGRTR × LPU Hackathon 2026</p>
