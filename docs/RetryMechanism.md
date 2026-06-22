# Retry Mechanism

## Philosophy

The retry system is designed around a fundamental rule:

> **Never repeat work that already succeeded.**

A naive retry would re-run every step from the beginning — creating a duplicate employee in SAP SuccessFactors. Our retry is **idempotent at the step level**.

---

## How Retry Works

### API Endpoint
```
POST /api/onboarding/:id/retry
```

### Step 1 — Identify Failed Steps

`prepareRetry()` examines each step status:
```typescript
if (request.sf_write_status === 'FAILED')   → reset to 'PENDING'
if (request.team_slack_status === 'FAILED') → reset to 'PENDING'
if (request.hr_slack_status === 'FAILED')   → reset to 'PENDING'
// SUCCESS steps are untouched
```

### Step 2 — Re-queue

The updated record is pushed back into the BullMQ queue with the same record ID. The Worker picks it up and runs `processWorkflow(id)` again.

### Step 3 — Saga Skips Completed Steps

In `processWorkflow()`, each step is gated:
```typescript
if (request.sf_write_status !== 'SUCCESS') {
  // run Step 1
}
if (request.team_slack_status !== 'SUCCESS') {
  // run Step 2
}
```

So if Step 1 (SF) is SUCCESS, it is completely skipped.

---

## Example Scenario

```
Initial failure state:
  sf_write_status:   SUCCESS   (employee created, ID: SF_847291)
  team_slack_status: FAILED    (Slack was down)
  hr_slack_status:   PENDING   (never ran)
  status:            FAILED

After clicking Retry:
  sf_write_status:   SUCCESS   ← untouched
  team_slack_status: PENDING   ← reset, will retry
  hr_slack_status:   PENDING   ← will run after team
  status:            PROCESSING

Saga re-runs:
  Step 1 SKIPPED  (sf_write_status === 'SUCCESS')
  Step 2 EXECUTED → team_slack_status → SUCCESS
  Step 3 EXECUTED → hr_slack_status  → SUCCESS
  status → COMPLETED
```

---

## Retry Center UI

The **Retry Center** page (`/retry-center`) provides:
- A table of all FAILED workflows with the exact failed step name
- Per-request retry button
- Bulk **"Retry All Failed"** button that enqueues all failed workflows simultaneously
- Live status refresh after retry is triggered

---

## BullMQ vs Manual Retry

| Type | When | Trigger |
|---|---|---|
| **BullMQ Auto-Retry** | Infrastructure failures (Redis down, job crash) | Automatic, up to 3 attempts with exponential backoff |
| **Saga Manual Retry** | Integration failures (SF error, Slack error) | User clicks Retry in the UI or calls POST /retry |

These are two separate, complementary retry layers. BullMQ handles the queue infrastructure; the saga handles the business logic.
