# Testing Guide

## Overview

The backend has a full Jest test suite covering:
- **Integration tests** — full HTTP request/response cycle via Supertest
- **Unit tests** — saga orchestration logic with mocked dependencies

**All 11 tests pass. Zero failures.**

---

## Running Tests

```bash
cd backend
npm test
```

Test output summary:
```
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

---

## Test Files

### `tests/integration/onboarding.test.ts`

Tests the Express HTTP layer end-to-end with mocked Prisma and BullMQ:

| Test | Scenario |
|---|---|
| `POST /api/onboarding` — success | Creates new record, returns 201 |
| `POST /api/onboarding` — idempotency | Duplicate detected, returns 200 + existing record |
| `POST /api/onboarding` — validation | Invalid email returns 400 with field errors |
| `GET /api/onboarding/:id` — found | Returns 200 with record data |
| `GET /api/onboarding/:id` — not found | Returns 404 |
| `POST /api/onboarding/:id/retry` — failed record | Resets failed steps, queues retry, returns 200 |
| `POST /api/onboarding/:id/retry` — completed | No-op, returns 200 with COMPLETED status |
| `GET /api/dashboard` | Returns correct metric calculations |

### `tests/unit/saga.test.ts`

Tests the saga state machine with fully mocked SF and Slack services:

| Test | Scenario |
|---|---|
| SF failure at Step 1 | Saga halts, error saved, Slack never called |
| Team Slack failure at Step 2 | SF success preserved, error saved, HR Slack never called |
| All steps succeed | Status = COMPLETED, all step statuses = SUCCESS |

---

## Mocking Strategy

### Database (Prisma)
All Prisma methods (`findFirst`, `findUnique`, `create`, `update`, `findMany`) are mocked with `jest.fn()`. This allows tests to run without a real database connection.

### BullMQ Queue
The `addOnboardingJob` function is mocked to return a resolved Promise. No Redis connection is needed in tests.

### SuccessFactors & Slack Services
Entire service modules are mocked. Tests set return values per scenario using `mockResolvedValue` and `mockRejectedValue`.

---

## Writing Additional Tests

To add a new test scenario:
1. Add a `it('...')` block in the appropriate test file
2. Set up mocks using `(prisma.onboardingRequest.findFirst as jest.Mock).mockResolvedValue(yourData)`
3. Make the HTTP request using `request(app).post('/api/...')`
4. Assert on `response.status` and `response.body`

---

## Coverage

To generate a coverage report:
```bash
cd backend
npx jest --coverage
```

Coverage is configured with an 80% minimum threshold across branches, functions, lines, and statements.
