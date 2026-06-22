# Architecture — Employee Onboarding Automation Platform

> **INTEGRTR × LPU Hackathon 2026 — Team 06**
> *Full-Stack SAP SuccessFactors Onboarding Workflow Engine*

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Full-Stack Architecture Diagram](#2-full-stack-architecture-diagram)
3. [Onboarding Workflow — Sequence Diagram](#3-onboarding-workflow--sequence-diagram)
4. [Saga Pattern — State Diagram](#4-saga-pattern--state-diagram)
5. [Retry Flow Diagram](#5-retry-flow-diagram)
6. [Database — ER Diagram](#6-database--er-diagram)
7. [Component Descriptions](#7-component-descriptions)
8. [API Reference](#8-api-reference)
9. [Technology Stack](#9-technology-stack)

---

## 1. System Overview

The **Employee Onboarding Automation Platform** is a full-stack web application built for the INTEGRTR × LPU Hackathon 2026 by **Team 06**. It automates the multi-step process of onboarding a new employee by orchestrating integrations with **SAP SuccessFactors** (HRIS) and **Slack** (team communications) through a durable, fault-tolerant workflow engine.

### Core Goals

| Goal | Implementation |
|------|---------------|
| **Zero data loss** | Every onboarding request is persisted to PostgreSQL before any external call is made |
| **Idempotency** | Duplicate submissions (by `request_id` or `employee_email`) are detected and safely deduplicated at the DB layer before job queuing |
| **Fault tolerance** | Each integration step persists its own success/failure status; failed jobs can be retried without re-executing already-successful steps |
| **Observability** | Structured `winston` logging with per-step saga state visible on the dashboard |
| **Scalability** | Asynchronous BullMQ worker queue decouples HTTP request handling from long-running integration calls |

### High-Level Data Flow

```
HR Admin fills onboarding form in React SPA
    ↓
POST /api/onboarding (Express + Zod validation + Rate Limiter)
    ↓
Idempotency check against PostgreSQL
    ↓
DB record created (status: PROCESSING, all steps: PENDING)
    ↓
Job enqueued on BullMQ (Redis-backed)  ← HTTP response 201 returned immediately
    ↓
BullMQ Worker picks up job (concurrency: 5)
    ↓
Saga Step 1 → SAP SuccessFactors OData API  (sf_write_status)
Saga Step 2 → Team Slack Webhook             (team_slack_status)
Saga Step 3 → HR Slack Webhook               (hr_slack_status)
    ↓
status → COMPLETED  (all steps SUCCESS)
```

The platform supports **mock mode** for both SAP SuccessFactors and Slack, allowing full end-to-end demonstration without live credentials. Failure injection is supported by convention on the employee email address (e.g., `fail-sf@test.com`, `fail-slack-team@test.com`).

---

## 2. Full-Stack Architecture Diagram

```mermaid
graph TB
    subgraph Browser["🌐 Browser — Client Layer"]
        UI["React 19 SPA\n(Vite + TypeScript)\nTailwind CSS\nReact Query + React Hook Form"]
    end

    subgraph Docker["🐳 Docker Compose Network — team06_network"]
        subgraph FE["Frontend Container  :80"]
            NGINX["Nginx\nStatic SPA Host"]
        end

        subgraph BE["Backend Container  :5000"]
            EXPRESS["Express 4 API Server\n(TypeScript + Helmet + CORS)\nRate Limiter 200 req/15 min"]
            MIDDLEWARE["Middleware Stack\nZod Validation\nError Handler\nRate Limiter"]
            CTRL["Controllers\nonboarding.controller\ndashboard.controller"]
            SVC["Services\nonboarding.service Saga\nsuccessfactors.service\nslack.service\nqueue.service"]
            WORKER["BullMQ Worker\nconcurrency 5\nExponential Backoff\n3 attempts"]
        end

        subgraph DATA["Data Layer"]
            PG[("PostgreSQL 16\nonboarding_db\n:5432")]
            REDIS[("Redis 7\nBullMQ Queue Backend\nAOF Persistence\n:6379")]
        end
    end

    subgraph EXTERNAL["☁️ External Services"]
        SF["SAP SuccessFactors\nOData v2 API\n/odata/v2/User\nOAuth Client Credentials"]
        SLACK_TEAM["Slack Webhook\nTeam Channel\nWelcome Message"]
        SLACK_HR["Slack Webhook\nHR Channel\nSF Deep Link"]
    end

    Browser -->|"HTTPS"| NGINX
    NGINX -->|"Proxy /api/*"| EXPRESS
    EXPRESS --> MIDDLEWARE --> CTRL --> SVC
    SVC -->|"Prisma ORM"| PG
    SVC -->|"addOnboardingJob"| REDIS
    WORKER -->|"BullMQ dequeue"| REDIS
    WORKER -->|"processWorkflow"| SVC
    SVC -->|"Step 1 createEmployee"| SF
    SVC -->|"Step 2 sendTeamNotification"| SLACK_TEAM
    SVC -->|"Step 3 sendHrNotification with SF deep link"| SLACK_HR

    style Browser fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Docker fill:#f0fdf4,stroke:#22c55e,color:#14532d
    style EXTERNAL fill:#fef9c3,stroke:#eab308,color:#713f12
    style PG fill:#e0e7ff,stroke:#6366f1
    style REDIS fill:#ffe4e6,stroke:#f43f5e
    style SF fill:#fef3c7,stroke:#d97706
    style SLACK_TEAM fill:#ecfdf5,stroke:#10b981
    style SLACK_HR fill:#ecfdf5,stroke:#10b981
```

---

## 3. Onboarding Workflow — Sequence Diagram

This diagram traces the complete lifecycle of a single onboarding submission from form submit through saga completion.

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Admin
    participant FE as React SPA
    participant API as Express API
    participant DB as PostgreSQL
    participant Q as BullMQ Queue
    participant W as BullMQ Worker
    participant SF as SAP SuccessFactors
    participant ST as Slack Team Webhook
    participant SH as Slack HR Webhook

    HR->>FE: Fill onboarding form and submit
    FE->>API: POST /api/onboarding requestId firstName lastName email phone department designation manager joiningDate initiatedBy

    API->>API: Zod schema validation

    API->>DB: findFirst WHERE request_id OR employee_email matches
    alt Duplicate found
        DB-->>API: Existing record
        API-->>FE: 200 OK Cached record Idempotent
        FE-->>HR: Already submitted warning
    else New request
        DB-->>API: null

        API->>DB: INSERT onboarding_requests status=PROCESSING sf_write_status=PENDING team_slack_status=PENDING hr_slack_status=PENDING
        DB-->>API: Created record with id

        API->>Q: addOnboardingJob record.id jobId equals record.id for dedup
        Q-->>API: Job enqueued

        API-->>FE: 201 Created success true data record
        FE-->>HR: Onboarding initiated successfully

        Note over Q,W: Asynchronous processing begins

        W->>Q: Dequeue job
        Q-->>W: Job payload with record id

        rect rgb(219, 234, 254)
            Note over W,SF: Saga Step 1 — SAP SuccessFactors
            W->>SF: lookupEmployeeByEmail
            SF-->>W: null new employee
            W->>SF: POST /odata/v2/User with employee payload
            SF-->>W: userId SF_xxxxxx status Active
            W->>DB: UPDATE sf_write_status=SUCCESS sf_employee_id=SF_xxxxxx
        end

        rect rgb(236, 253, 245)
            Note over W,ST: Saga Step 2 — Team Slack
            W->>ST: POST webhook Welcome firstName lastName Dept X Joining date
            ST-->>W: HTTP 200 OK
            W->>DB: UPDATE team_slack_status=SUCCESS
        end

        rect rgb(254, 249, 195)
            Note over W,SH: Saga Step 3 — HR Slack
            W->>SH: POST webhook Employee Onboarded ID SF_xxxxxx SF deep link
            SH-->>W: HTTP 200 OK
            W->>DB: UPDATE hr_slack_status=SUCCESS
        end

        W->>DB: UPDATE status=COMPLETED
        Note over HR,SH: Onboarding COMPLETED successfully
    end
```

---

## 4. Saga Pattern — State Diagram

Each onboarding request is orchestrated as a **Choreography-less Saga** — a sequential series of steps where each step's outcome is persisted to the database immediately. This makes the saga resumable without re-running succeeded steps.

### Overall Request Status

```mermaid
stateDiagram-v2
    [*] --> PROCESSING : DB record created and job enqueued

    PROCESSING --> COMPLETED : All 3 steps returned SUCCESS
    PROCESSING --> FAILED : Any step threw an unrecoverable error

    COMPLETED --> [*]
    FAILED --> PROCESSING : POST retry endpoint resets FAILED steps to PENDING
```

### Per-Step Status Lifecycle

Applies individually to `sf_write_status`, `team_slack_status`, and `hr_slack_status`.

```mermaid
stateDiagram-v2
    direction LR

    [*] --> PENDING : Record created

    PENDING --> SUCCESS : External call succeeded
    PENDING --> FAILED : External call threw exception

    SUCCESS --> SUCCESS : Retry skips this step entirely
    FAILED --> PENDING : prepareRetry resets step

    SUCCESS --> [*]
```

### Step Execution Guard Logic

The saga processor checks each step's persisted status before executing it. This is the core idempotency guarantee within the workflow:

```typescript
// Step is skipped entirely if it already succeeded
if (request.sf_write_status !== 'SUCCESS') {
    // ... execute Step 1 — SAP SuccessFactors
}
if (request.team_slack_status !== 'SUCCESS') {
    // ... execute Step 2 — Team Slack
}
if (request.hr_slack_status !== 'SUCCESS') {
    // ... execute Step 3 — HR Slack
}
// All steps passed → mark COMPLETED
```

---

## 5. Retry Flow Diagram

When a workflow fails partway through, the **Retry Center** UI page calls `POST /api/onboarding/:id/retry`. The `prepareRetry()` service method resets only the `FAILED` steps back to `PENDING` while preserving `SUCCESS` steps. The job is then re-enqueued and the saga resumes from the first non-`SUCCESS` step.

```mermaid
flowchart TD
    START(["POST /api/onboarding/:id/retry"])

    START --> CHECK_COMPLETED{status == COMPLETED?}
    CHECK_COMPLETED -->|Yes| SKIP["Return 200\nAlready COMPLETED\nNo retry needed"]
    CHECK_COMPLETED -->|No| RESET["prepareRetry\nstatus to PROCESSING\nerror_message cleared"]

    RESET --> SF_CHECK{sf_write_status\n== FAILED?}
    SF_CHECK -->|Yes| SF_RESET["sf_write_status to PENDING"]
    SF_CHECK -->|No — keep SUCCESS| SF_KEEP["sf_write_status unchanged"]

    SF_RESET --> TEAM_CHECK
    SF_KEEP --> TEAM_CHECK

    TEAM_CHECK{team_slack_status\n== FAILED?}
    TEAM_CHECK -->|Yes| TEAM_RESET["team_slack_status to PENDING"]
    TEAM_CHECK -->|No — keep SUCCESS| TEAM_KEEP["team_slack_status unchanged"]

    TEAM_RESET --> HR_CHECK
    TEAM_KEEP --> HR_CHECK

    HR_CHECK{hr_slack_status\n== FAILED?}
    HR_CHECK -->|Yes| HR_RESET["hr_slack_status to PENDING"]
    HR_CHECK -->|No — keep SUCCESS| HR_KEEP["hr_slack_status unchanged"]

    HR_RESET --> ENQUEUE
    HR_KEEP --> ENQUEUE

    ENQUEUE["addOnboardingJob id\nRe-enqueue to BullMQ"]

    ENQUEUE --> WORKER["Worker dequeues job"]

    WORKER --> S1{sf_write_status\n== SUCCESS?}
    S1 -->|"Yes — skip"| S2
    S1 -->|No — execute| SF_CALL["SAP SF API Call\nupdate sf_write_status"]
    SF_CALL --> S2

    S2{team_slack_status\n== SUCCESS?}
    S2 -->|"Yes — skip"| S3
    S2 -->|No — execute| TEAM_CALL["Team Slack Webhook\nupdate team_slack_status"]
    TEAM_CALL --> S3

    S3{hr_slack_status\n== SUCCESS?}
    S3 -->|"Yes — skip"| DONE
    S3 -->|No — execute| HR_CALL["HR Slack Webhook\nupdate hr_slack_status"]
    HR_CALL --> DONE

    DONE(["status to COMPLETED"])

    style SKIP fill:#d1fae5,stroke:#10b981
    style DONE fill:#d1fae5,stroke:#10b981
    style SF_CALL fill:#dbeafe,stroke:#3b82f6
    style TEAM_CALL fill:#ede9fe,stroke:#7c3aed
    style HR_CALL fill:#fef3c7,stroke:#d97706
    style SF_KEEP fill:#f1f5f9,stroke:#94a3b8
    style TEAM_KEEP fill:#f1f5f9,stroke:#94a3b8
    style HR_KEEP fill:#f1f5f9,stroke:#94a3b8
```

### BullMQ Built-in Retry vs. Saga Retry

| Mechanism | Trigger | Behaviour |
|-----------|---------|-----------|
| **BullMQ job retry** (automatic) | Worker throws an exception | Re-runs the entire worker handler up to 3 times with exponential backoff (initial delay: 5 s). Saga guards prevent re-executing `SUCCESS` steps. |
| **Manual saga retry** (UI-triggered) | `POST /api/onboarding/:id/retry` | Explicitly resets only `FAILED` step statuses to `PENDING`, then re-enqueues the job. |

---

## 6. Database — ER Diagram

The application uses a single primary table `onboarding_requests`, managed via **Prisma ORM** with PostgreSQL 16.

```mermaid
erDiagram
    ONBOARDING_REQUESTS {
        uuid        id                  PK  "auto uuid"
        varchar255  request_id          UK  "client idempotency key"
        varchar255  employee_email      UK  "unique per employee"
        varchar255  sf_employee_id          "nullable set after SF creation"
        varchar255  first_name
        varchar255  last_name
        varchar50   phone
        varchar255  department
        varchar255  designation
        varchar255  manager
        timestamp   joining_date
        varchar255  initiated_by            "HR admin who submitted"
        varchar50   status                  "PROCESSING or COMPLETED or FAILED"
        varchar50   sf_write_status         "PENDING or SUCCESS or FAILED"
        varchar50   team_slack_status       "PENDING or SUCCESS or FAILED"
        varchar50   hr_slack_status         "PENDING or SUCCESS or FAILED"
        text        error_message           "nullable last error detail"
        timestamp   created_at              "auto now"
        timestamp   updated_at              "auto updatedAt"
    }
```

### Field Semantics

| Field | Purpose |
|-------|---------|
| `id` | Internal UUID primary key used by the BullMQ job and all internal lookups |
| `request_id` | Client-supplied idempotency key (UUID generated on the frontend before submit). Prevents duplicate processing on network retries. |
| `employee_email` | Unique constraint ensures no employee can be onboarded twice, even with a different `request_id` |
| `sf_employee_id` | Populated after successful SAP SuccessFactors employee creation; used to generate the HR Slack deep link (`/sf/liveprofile?username=<sf_employee_id>`) |
| `status` | Top-level workflow status. `PROCESSING` while saga runs, `COMPLETED` when all steps succeed, `FAILED` when any step fails terminally |
| `sf_write_status` | Granular step status for Saga Step 1 — SAP SuccessFactors |
| `team_slack_status` | Granular step status for Saga Step 2 — Team Slack channel |
| `hr_slack_status` | Granular step status for Saga Step 3 — HR Slack channel |
| `error_message` | Last encountered error detail string. Cleared on step success or retry initiation |

---

## 7. Component Descriptions

### 7.1 React Frontend (SPA)

**Path:** `frontend/`  
**Runtime:** Vite Dev Server (dev) / Nginx static host (production, port 80)

The frontend is a single-page application providing the HR administrator interface. It communicates with the backend exclusively via REST API calls using **Axios** wrapped in **TanStack React Query** for automatic caching, loading states, and background refetching.

#### Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | KPI cards: Total requests, Completed, Failed, Processing counts. Real-time polling. |
| **New Employee** | `/new-employee` | Multi-field onboarding form with full Zod client-side validation. Generates `requestId` UUID on mount. |
| **Workflow History** | `/history` | Paginated table of all onboarding requests with status badges and drill-down links |
| **Employee Details** | `/employee/:id` | Per-request view showing all Saga step statuses, SF Employee ID, and timestamps |
| **Retry Center** | `/retry` | Lists all `FAILED` requests with a one-click Retry button per record |
| **Failure Monitoring** | `/failures` | Focused failure analytics: error messages, failed step breakdown |
| **System Health** | `/health` | Polls `/api/health` — shows DB, Redis, and queue worker connectivity |

#### Key Libraries

- **React 19** — UI framework
- **Vite 8** — Build tool with HMR
- **Tailwind CSS 4** — Utility-first styling
- **React Router DOM 7** — Client-side routing
- **TanStack React Query 5** — Server state management and caching
- **React Hook Form 7 + Zod 4** — Form management and validation
- **Axios 1** — HTTP client
- **Lucide React** — Icon library
- **Sonner** — Toast notifications

---

### 7.2 Express Backend API

**Path:** `backend/src/index.ts`  
**Runtime:** Node.js 20 / TypeScript 5 (compiled to `dist/`) — Port **5000**

The API server is built with **Express 4** and TypeScript. It is the single entry point for all client requests and orchestrates the onboarding workflow via service classes and the BullMQ queue.

#### Middleware Chain (per request)

```
Helmet (security headers)
  → CORS (all origins, configurable)
    → express.json() (body parsing)
      → apiLimiter (200 req / 15 min, per-IP rate limiting)
        → Router (route matching)
          → validate(schema) (Zod middleware)
            → Controller handler
              → errorHandler (global catch-all)
```

#### Route Map

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/api/onboarding` | `createRequest` | Submit new onboarding request |
| `GET` | `/api/onboarding` | `getAllRequests` | List all requests (dashboard) |
| `GET` | `/api/onboarding/:id` | `getRequestById` | Get single request detail |
| `POST` | `/api/onboarding/:id/retry` | `retryRequest` | Retry a failed workflow |
| `GET` | `/api/dashboard` | `getDashboardMetrics` | Aggregated KPI counts |
| `GET` | `/api/failures` | `getFailures` | List all FAILED requests |
| `GET` | `/api/health` | `getHealth` | System health check (DB + Redis) |

---

### 7.3 Onboarding Service — Saga Orchestrator

**Path:** `backend/src/services/onboarding.service.ts`

The core domain logic. Implements the **Saga pattern** as a sequential, step-by-step execution function (`processWorkflow`). Each step:

1. Checks if the step's status is already `SUCCESS` — if so, skips it entirely.
2. Calls the relevant external service.
3. On success: updates the step status to `SUCCESS` in the DB.
4. On failure: updates the step status to `FAILED`, sets the overall `status` to `FAILED`, writes the error message, and returns early.

This design means the saga is **idempotent by default** — it can be called multiple times and will always resume from the first non-`SUCCESS` step.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `createOnboardingRequest(input)` | Idempotency check + DB record creation |
| `processWorkflow(id)` | Full saga execution covering Steps 1 through 3 |
| `prepareRetry(id)` | Resets `FAILED` steps to `PENDING`, sets status to `PROCESSING` |
| `getRequestById(id)` | Fetch by UUID |
| `getRequestByEmail(email)` | Fetch by employee email |
| `getAllRequests()` | Ordered list descending by created_at |

---

### 7.4 BullMQ Queue Service — Async Worker

**Path:** `backend/src/services/queue.service.ts`

Manages the **`onboarding-queue`** — a Redis-backed BullMQ queue that decouples HTTP request handling from the long-running saga execution. The API responds with **201** immediately after enqueuing; the saga runs asynchronously in the worker.

**Configuration:**

| Parameter | Value |
|-----------|-------|
| Queue name | `onboarding-queue` |
| Job ID | Set to `record.id` (prevents duplicate jobs via BullMQ native job ID dedup) |
| Max attempts | 3 |
| Backoff strategy | Exponential, initial delay: 5,000 ms |
| Worker concurrency | 5 simultaneous jobs |
| `removeOnComplete` | `true` (successful jobs cleaned from Redis) |
| `removeOnFail` | `false` (failed jobs retained for inspection) |

---

### 7.5 SAP SuccessFactors Service

**Path:** `backend/src/services/successfactors.service.ts`

Abstracts all communication with the **SAP SuccessFactors OData v2 API**. Supports both **live mode** (real OAuth credentials) and **mock mode** (`SF_MOCK_MODE=true`).

**Live Mode Flow:**
1. `getAccessToken()` — POST to `/oauth/token` with `client_credentials` grant type.
2. `lookupEmployeeByEmail(email)` — GET `/odata/v2/User` with `$filter=email eq '...'` to prevent double-creation.
3. `createEmployee(input)` — POST `/odata/v2/User` with OData payload.

**Mock Failure Injection** (via employee email convention):

| Email Contains | Injected Error |
|----------------|---------------|
| `fail-sf` | 500 Internal Server Error |
| `timeout-sf` | Network / Timeout Error |
| `429-sf` | Rate Limit Exceeded |
| `401-sf` | Authentication / Authorization Failed |
| `existing` | Employee already exists — lookup returns SF_999999 |

**Error Handling:** All Axios errors are translated to typed domain errors by `handleAxiosError()`, mapping HTTP status codes (401, 403, 404, 429, 5xx) to specific descriptive error messages.

---

### 7.6 Slack Service

**Path:** `backend/src/services/slack.service.ts`

Posts formatted messages to two separate Slack Incoming Webhook URLs. Supports both **live mode** and **mock mode** (`SLACK_MOCK_MODE=true`).

#### Message Templates

**Team Channel (Step 2):**
```
[Team 06]
Welcome {firstName} {lastName}
Department: {department}
Joining Date: {joiningDate — long format}
```

**HR Channel (Step 3):**
```
[Team 06]
Employee Onboarded
Employee ID: {sf_employee_id}
Department: {department}
Joining Date: {joiningDate — long format}
SuccessFactors Link: {SF_API_URL}/sf/liveprofile?username={sf_employee_id}
```

**Mock Failure Injection** (via employee email convention):

| Email Contains | Channel | Injected Error |
|----------------|---------|---------------|
| `fail-slack-team` | Team | Slack connection timeout |
| `fail-slack-hr` | HR | Slack Server Error 500 |

---

### 7.7 PostgreSQL — Data Persistence

**Image:** `postgres:16-alpine`  
**Port:** 5432 internal to Docker network, mapped to host  
**ORM:** Prisma 5 with auto-generated TypeScript client  
**Persistence:** Docker named volume `postgres_data` (survives container restarts)

The database serves three roles:
- **Record of truth** for all onboarding requests and their step statuses
- **Idempotency lock** — the `UNIQUE` constraints on `request_id` and `employee_email` prevent concurrent duplicate processing
- **Audit trail** — `created_at` and `updated_at` timestamps on every record

---

### 7.8 Redis — Queue Backend

**Image:** `redis:7-alpine`  
**Port:** 6379 internal, mapped to host  
**Persistence:** AOF (`--appendonly yes`) + Docker named volume `redis_data`  
**Client:** `ioredis` 5 (used by BullMQ internally)

Redis stores:
- **Queued jobs** pending pickup by the BullMQ worker
- **Failed jobs** (retained for inspection, `removeOnFail: false`)
- **Job metadata** including attempt counts, timestamps, and error reasons

The health check endpoint (`GET /api/health`) pings Redis to confirm connectivity.

---

## 8. API Reference

### POST `/api/onboarding`

Submit a new employee onboarding request.

**Request Body:**

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "phone": "+91-9876543210",
  "department": "Engineering",
  "designation": "Software Engineer",
  "manager": "John Doe",
  "joiningDate": "2026-07-01T00:00:00.000Z",
  "initiatedBy": "hr.admin@company.com"
}
```

**Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `201 Created` | New request, job queued | `{ success: true, message: "...", data: OnboardingRequest }` |
| `200 OK` | Duplicate request (idempotent) | `{ success: true, message: "Request already exists...", data: OnboardingRequest }` |
| `400 Bad Request` | Zod validation failure | `{ success: false, error: [...] }` |
| `429 Too Many Requests` | Rate limit exceeded | Express rate limit response |

---

### GET `/api/onboarding`

Retrieve all onboarding records, ordered by creation date descending.

**Response:** `{ success: true, data: OnboardingRequest[] }`

---

### GET `/api/onboarding/:id`

Retrieve a single onboarding record by UUID.

**Response:** `{ success: true, data: OnboardingRequest }` or `404` if not found.

---

### POST `/api/onboarding/:id/retry`

Retry a failed onboarding workflow. Resets only `FAILED` steps to `PENDING`, preserves `SUCCESS` steps, and re-enqueues the job.

**Responses:**

| Status | Condition |
|--------|-----------|
| `200 OK` | Retry initiated or already COMPLETED (no-op) |
| `404 Not Found` | Record with given ID does not exist |

---

### GET `/api/dashboard`

Returns aggregated KPI counts: total, completed, failed, and processing request counts.

---

### GET `/api/failures`

Returns all onboarding records where `status = 'FAILED'`, including error messages and per-step statuses.

---

### GET `/api/health`

Returns system health status including PostgreSQL and Redis connectivity checks.

---

## 9. Technology Stack

### Backend

| Category | Technology | Version | Role |
|----------|-----------|---------|------|
| Runtime | Node.js | 20 LTS | JavaScript runtime |
| Language | TypeScript | 5.4 | Static typing |
| Framework | Express | 4.19 | HTTP server and routing |
| ORM | Prisma | 5.12 | Database access and migrations |
| Queue | BullMQ | 5.7 | Async job queue |
| Redis Client | ioredis | 5.4 | BullMQ transport layer |
| Validation | Zod | 3.22 | Schema validation (server) |
| HTTP Client | Axios | 1.6 | External API calls (SF, Slack) |
| Security | Helmet | 7.1 | HTTP security headers |
| Security | CORS | 2.8 | Cross-origin resource sharing |
| Rate Limiting | express-rate-limit | 7.2 | API abuse prevention |
| Logging | Winston | 3.13 | Structured logging |
| Testing | Jest + Supertest | 29.7 | Unit and integration tests |

### Frontend

| Category | Technology | Version | Role |
|----------|-----------|---------|------|
| Framework | React | 19 | UI framework |
| Language | TypeScript | 6.0 | Static typing |
| Build Tool | Vite | 8 | Dev server and bundler |
| Styling | Tailwind CSS | 4 | Utility-first CSS |
| Routing | React Router DOM | 7 | Client-side routing |
| Server State | TanStack React Query | 5 | API caching and synchronisation |
| Forms | React Hook Form | 7 | Form state management |
| Validation | Zod | 4 | Client-side schema validation |
| HTTP Client | Axios | 1.18 | API calls |
| Icons | Lucide React | 1.21 | Icon set |
| Toasts | Sonner | 2 | Notification toasts |

### Infrastructure

| Category | Technology | Version | Role |
|----------|-----------|---------|------|
| Database | PostgreSQL | 16-alpine | Primary data store |
| Cache / Queue | Redis | 7-alpine | BullMQ job persistence |
| Web Server | Nginx | alpine | Frontend static host |
| Containerisation | Docker Compose | v3.9 | Service orchestration |

### External Integrations

| Service | Protocol | Endpoint Pattern | Auth |
|---------|----------|-----------------|------|
| SAP SuccessFactors | OData v2 over HTTPS | `/odata/v2/User` | OAuth 2.0 Client Credentials |
| Slack Team Channel | HTTPS Webhook | Incoming Webhook URL | URL-embedded token |
| Slack HR Channel | HTTPS Webhook | Incoming Webhook URL | URL-embedded token |

---

## Appendix — Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `PORT` | No | `5000` | Express server port |
| `NODE_ENV` | No | `development` | Runtime environment |
| `SF_API_URL` | Yes | — | SAP SuccessFactors base URL |
| `SF_CLIENT_ID` | Yes (live) | — | OAuth client ID |
| `SF_PRIVATE_KEY` | Yes (live) | — | OAuth private key |
| `SF_MOCK_MODE` | No | `true` | Enable mock SF integrations |
| `SLACK_WEBHOOK_TEAM` | Yes (live) | — | Team channel webhook URL |
| `SLACK_WEBHOOK_HR` | Yes (live) | — | HR channel webhook URL |
| `SLACK_MOCK_MODE` | No | `true` | Enable mock Slack integrations |
| `RATE_LIMIT_MAX` | No | `200` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in milliseconds |

---

*Document maintained by Team 06 — INTEGRTR × LPU Hackathon 2026*  
*Last updated: 2026-06-22*
