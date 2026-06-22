# 💬 Slack Integration Microservice (Team 06)

This is the Node.js Slack API microservice designed to handle onboarding notifications. It supports sending rich **Block Kit** messages to two channels: the team channel (for welcoming new members) and the HR channel (with SuccessFactors deep links).

It is designed to support the hackathon's robustness and retry requirements, exposing granular endpoints so individual notification steps (`team_slack`, `hr_slack`) can fail and be retried independently by the orchestrator.

## 🚀 Setup & Installation

1. **Install Dependencies:**
   ```bash
   cd slack
   npm install
   ```

2. **Configure Environment:**
   Copy the example environment configuration to `.env` (already created by default):
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in the credentials provided at kickoff. You can configure either a **Slack Bot Token** (recommended) or individual **Incoming Webhook URLs**.

3. **Run the Server:**
   - **Production Mode:** `npm start` (runs the service on port `5001` by default)
   - **Development Mode:** `npm run dev` (starts the server with live reload on file changes)

4. **Verify / Test the Webhooks:**
   Run the test script to verify Slack channel delivery:
   ```bash
   node test.js
   ```

---

## 🔌 API Documentation

### 1. Health & Configuration Check
* **Endpoint:** `GET /health`
* **Description:** Check if the service is running and inspect active configurations (without exposing secrets).
* **Sample Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-06-22T16:00:00.000Z",
    "config": {
      "teamPrefix": "[Team 06]",
      "hasBotToken": true,
      "welcomeChannel": "C0BD04P5YFJ",
      "hrChannel": "C0BBZFFBUEP",
      "hasWelcomeWebhook": false,
      "hasHrWebhook": false
    }
  }
  ```

---

### 2. Send Team Welcome Message
* **Endpoint:** `POST /api/slack/welcome`
* **Description:** Sends an introducing message to the team welcome channel (`C0BD04P5YFJ`).
* **Request Body:**
  ```json
  {
    "employeeName": "Aastha Muskan",
    "role": "Software Engineer Intern",
    "department": "Engineering",
    "startDate": "2026-07-01",
    "onboardingId": "ONB-06-1029",
    "initiatedBy": "Dhruv"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "step": "team_slack",
    "message": "Welcome message sent successfully",
    "details": {
      "success": true,
      "method": "bot_token",
      "channel": "C0BD04P5YFJ",
      "ts": "1719060000.123456"
    }
  }
  ```
* **Error Response (500 Internal Server Error):**
  ```json
  {
    "success": false,
    "step": "team_slack",
    "error": "[team_slack] Failed to send Slack message via Bot Token: Slack API error: channel_not_found"
  }
  ```

---

### 3. Send HR Onboarding Notification
* **Endpoint:** `POST /api/slack/hr-notification`
* **Description:** Sends onboarding confirmation to the HR channel (`C0BBZFFBUEP`) with a deep link to SuccessFactors.
* **Request Body:**
  ```json
  {
    "employeeName": "Aastha Muskan",
    "employeeId": "987654",
    "onboardingId": "ONB-06-1029",
    "sfRecordUrl": "https://salesdemo.successfactors.eu/sf/liveProfile?userId=987654"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "step": "hr_slack",
    "message": "HR notification sent successfully",
    "details": {
      "success": true,
      "method": "bot_token",
      "channel": "C0BBZFFBUEP",
      "ts": "1719060005.654321"
    }
  }
  ```

---

### 4. Send Onboarding Failure Alert
* **Endpoint:** `POST /api/slack/onboarding-failure`
* **Description:** Sends an onboarding error notification to the HR channel (`C0BBZFFBUEP`) to alert the team when a step in the onboarding flow fails (e.g. SuccessFactors write or DB write).
* **Request Body:**
  ```json
  {
    "employeeName": "Aastha Muskan",
    "onboardingId": "ONB-06-1029",
    "failedStep": "sf_write",
    "errorMessage": "OData Connection Error: Connection timed out when contacting SuccessFactors platform-salesdemo.successfactors.eu",
    "initiatedBy": "Dhruv"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "step": "hr_slack",
    "message": "Onboarding failure alert sent to HR channel successfully",
    "details": {
      "success": true,
      "method": "webhook",
      "status": 200
    }
  }
  ```

---

### 5. Dual Send Notification (Convenience Endpoint)
* **Endpoint:** `POST /api/slack/send-all`
* **Description:** Attempts to send both notifications. Returns status details for both, allowing partial success reporting (useful for database state synchronization).
* **Request Body:** Combined fields of welcome and HR endpoints.
* **Response (200 OK if both succeed, 207 Multi-Status if one or both fail):**
  ```json
  {
    "success": false,
    "results": {
      "onboardingId": "ONB-06-1029",
      "team_slack": {
        "success": true,
        "error": null,
        "details": { "method": "bot_token", "channel": "C0BD04P5YFJ", "ts": "1719060010.111111" }
      },
      "hr_slack": {
        "success": false,
        "error": "[hr_slack] Failed to send Slack message via Bot Token: Slack API error: invalid_auth",
        "details": null
      }
    }
  }
  ```

---

## 🛠️ Robustness & Failure Strategy

This service is designed specifically to meet the **Track 1 Failure Handling** requirements:
1. **Granular Endpoints:** The UI/backend orchestrator should call `/api/slack/welcome` and `/api/slack/hr-notification` as independent steps.
2. **Explicit Error Messages:** Every error returned from this API is categorized under either `team_slack` or `hr_slack` step values, detailing the exact API or channel issue.
3. **Idempotency/Re-runs:** If the database indicates `team_slack` succeeded but `hr_slack` failed, the orchestrator only needs to retry `/api/slack/hr-notification` without re-sending the team welcome message, preventing duplicate channel spam.
