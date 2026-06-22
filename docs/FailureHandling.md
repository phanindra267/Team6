# Failure Handling & Saga Recovery

## Overview

This system implements the **Saga Pattern** for distributed transaction management. Each step in the onboarding workflow is independently tracked and persisted to PostgreSQL after every state transition. This means a failure in any step is **atomic** — it does not undo previous steps, but it halts the workflow at the exact point of failure with full diagnostic information saved.

---

## Saga State Machine

Each onboarding request has a top-level `status` and three per-step status fields:

| Field | Values |
|---|---|
| `status` | `PROCESSING` → `COMPLETED` / `FAILED` |
| `sf_write_status` | `PENDING` → `SUCCESS` / `FAILED` |
| `team_slack_status` | `PENDING` → `SUCCESS` / `FAILED` |
| `hr_slack_status` | `PENDING` → `SUCCESS` / `FAILED` |

---

## Step Execution & Halting

```
Worker receives job → loads DB record

STEP 1 – SAP SuccessFactors
  if sf_write_status !== 'SUCCESS':
    → Lookup employee by email (SF idempotency guard)
    → If not found: create employee → save sf_employee_id
    → Update sf_write_status = 'SUCCESS'
    → On error: sf_write_status = 'FAILED', status = 'FAILED', error_message = err.message
    → STOP WORKFLOW → return failed record

STEP 2 – Team Slack
  if team_slack_status !== 'SUCCESS':
    → Send welcome message to Team webhook
    → Update team_slack_status = 'SUCCESS'
    → On error: team_slack_status = 'FAILED', status = 'FAILED', error_message = err.message
    → STOP WORKFLOW → return failed record

STEP 3 – HR Slack
  if hr_slack_status !== 'SUCCESS':
    → Send HR notification with SF deep link
    → Update hr_slack_status = 'SUCCESS'
    → On error: hr_slack_status = 'FAILED', status = 'FAILED', error_message = err.message
    → STOP WORKFLOW → return failed record

All steps complete → status = 'COMPLETED'
```

---

## What is Preserved on Failure

When a step fails, the following is guaranteed:
- All previously **successful step results are preserved** (e.g., SF employee ID is not deleted)
- The **exact error message** from the external system is stored in `error_message`
- The record is **never deleted**
- The UI reflects the failure state immediately on the next polling interval

---

## Failure Injection for Demo/Testing

Use these email patterns when registering a new employee to trigger specific failure modes:

| Email Pattern | Injected Failure |
|---|---|
| `fail-sf@...` | SAP SuccessFactors 500 Server Error |
| `timeout-sf@...` | SAP SuccessFactors Network Timeout |
| `429-sf@...` | SAP SuccessFactors Rate Limit (429) |
| `401-sf@...` | SAP SuccessFactors Auth Failure (401) |
| `fail-slack-team@...` | Team Slack Webhook Timeout |
| `fail-slack-hr@...` | HR Slack Webhook 500 Error |

---

## Error Classification

### Retryable Errors
- Network timeouts
- 429 Rate Limit (external system)
- 500 Server Error (external system)
- Redis connection loss (BullMQ auto-reconnects)

### Non-Retryable Errors
- 401/403 Authentication/Authorisation failure (credentials must be fixed first)
- Missing SF employee ID when generating HR deep link (data integrity issue)
- Validation errors (caught before queue, never reach worker)

---

## BullMQ Automatic Retries

BullMQ is configured with:
```
attempts: 3
backoff: { type: 'exponential', delay: 5000 }
```

This means for **infrastructure failures** (e.g., Redis momentarily unreachable), BullMQ will automatically retry the whole job up to 3 times with exponential backoff (5s, 10s, 20s). This is separate from the **saga-level manual retry** in the Retry Center.
