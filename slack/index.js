require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Configuration
const config = {
  teamPrefix: process.env.SLACK_TEAM_PREFIX || '[Team 06]',
  botToken: process.env.SLACK_BOT_TOKEN,
  welcomeChannel: process.env.SLACK_WELCOME_CHANNEL || 'C0BD04P5YFJ',
  hrChannel: process.env.SLACK_HR_CHANNEL || 'C0BBZFFBUEP',
  welcomeWebhook: process.env.SLACK_WEBHOOK_TEAM,
  hrWebhook: process.env.SLACK_WEBHOOK_HR,
  mockMode: process.env.SLACK_MOCK_MODE === 'true' || 
            (!process.env.SLACK_BOT_TOKEN && !process.env.SLACK_WEBHOOK_TEAM && !process.env.SLACK_WEBHOOK_HR)
};

// Helper function to send message either via Webhook or chat.postMessage
async function sendMessage(channelId, webhookUrl, blocks, textFallback, stepName, emailForMock = '') {
  // Demo Mode Failure Injection
  if (config.mockMode || process.env.SLACK_MOCK_MODE === 'true') {
    const lowerEmail = emailForMock.toLowerCase();
    await new Promise(r => setTimeout(r, 400));
    
    if (stepName === 'team_slack' && lowerEmail.includes('fail-slack-team')) {
      throw new Error('Slack connection timeout: Injected Team Slack mock failure.');
    }
    if (stepName === 'hr_slack' && lowerEmail.includes('fail-slack-hr')) {
      throw new Error('Slack Server Error (500): Injected HR Slack mock failure.');
    }
    
    console.log(`[Mock Mode] ${stepName} message sent successfully`);
    return { success: true, method: 'mock', channel: channelId, ts: Date.now().toString() };
  }

  // 1. Try Bot Token (Rich Messaging)
  if (config.botToken) {
    try {
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        { channel: channelId, text: textFallback, blocks: blocks },
        { headers: { Authorization: `Bearer ${config.botToken}` }, timeout: 5000 }
      );
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }
      return { success: true, method: 'bot_token', channel: channelId, ts: response.data.ts };
    } catch (err) {
      throw new Error(err.message || 'Failed to send via Bot Token');
    }
  }

  // 2. Try Incoming Webhook (Fallback)
  if (webhookUrl) {
    try {
      await axios.post(webhookUrl, { text: textFallback, blocks: blocks }, { timeout: 5000 });
      return { success: true, method: 'webhook', status: 200 };
    } catch (err) {
      throw new Error(err.message || 'Failed to send via Webhook');
    }
  }

  throw new Error('No Slack credentials configured (Bot Token or Webhook)');
}

// 1. Health & Configuration Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      teamPrefix: config.teamPrefix,
      hasBotToken: !!config.botToken,
      welcomeChannel: config.welcomeChannel,
      hrChannel: config.hrChannel,
      hasWelcomeWebhook: !!config.welcomeWebhook,
      hasHrWebhook: !!config.hrWebhook,
      mockMode: config.mockMode
    }
  });
});

// 2. Send Team Welcome Message
app.post('/api/slack/welcome', async (req, res) => {
  const { employeeName, role, department, startDate, onboardingId, initiatedBy, email } = req.body;
  
  const textFallback = `${config.teamPrefix} Welcome ${employeeName}\nDepartment: ${department}\nJoining Date: ${startDate}`;
  
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `${config.teamPrefix} Welcome Aboard! 🎉`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `Please welcome *${employeeName}* to the team!\n*Role:* ${role}\n*Department:* ${department}\n*Start Date:* ${startDate}` } }
  ];

  try {
    const details = await sendMessage(config.welcomeChannel, config.welcomeWebhook, blocks, textFallback, 'team_slack', email);
    res.json({ success: true, step: 'team_slack', message: 'Welcome message sent successfully', details });
  } catch (error) {
    res.status(500).json({ success: false, step: 'team_slack', error: `[team_slack] ${error.message}` });
  }
});

// 3. Send HR Onboarding Notification
app.post('/api/slack/hr-notification', async (req, res) => {
  const { employeeName, employeeId, onboardingId, sfRecordUrl, department, startDate, email } = req.body;
  
  const textFallback = `${config.teamPrefix} Employee Onboarded\nID: ${employeeId}\nLink: ${sfRecordUrl}`;
  
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `✅ New Employee Provisioned`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `*${employeeName}* has been successfully provisioned in SuccessFactors.\n*Employee ID:* ${employeeId}\n*Department:* ${department}` } },
    { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View in SuccessFactors' }, url: sfRecordUrl, style: 'primary' }] }
  ];

  try {
    const details = await sendMessage(config.hrChannel, config.hrWebhook, blocks, textFallback, 'hr_slack', email);
    res.json({ success: true, step: 'hr_slack', message: 'HR notification sent successfully', details });
  } catch (error) {
    res.status(500).json({ success: false, step: 'hr_slack', error: `[hr_slack] ${error.message}` });
  }
});

// 4. Send Onboarding Failure Alert
app.post('/api/slack/onboarding-failure', async (req, res) => {
  const { employeeName, onboardingId, failedStep, errorMessage, initiatedBy } = req.body;
  
  const textFallback = `🚨 Onboarding Failed for ${employeeName}\nStep: ${failedStep}\nError: ${errorMessage}`;
  
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🚨 Onboarding Workflow Failed`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `The saga orchestrator encountered an error while onboarding *${employeeName}*.\n*Failed Step:* \`${failedStep}\`\n*Error Detail:* ${errorMessage}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Initiated by: ${initiatedBy} | Onboarding ID: ${onboardingId}` }] }
  ];

  try {
    const details = await sendMessage(config.hrChannel, config.hrWebhook, blocks, textFallback, 'hr_slack');
    res.json({ success: true, step: 'hr_slack', message: 'Onboarding failure alert sent to HR channel successfully', details });
  } catch (error) {
    res.status(500).json({ success: false, step: 'hr_slack', error: `[hr_slack] ${error.message}` });
  }
});

// 5. Dual Send Notification
app.post('/api/slack/send-all', async (req, res) => {
  const payload = req.body;
  const results = { onboardingId: payload.onboardingId, team_slack: {}, hr_slack: {} };
  let allSuccess = true;

  try {
    const textTeam = `${config.teamPrefix} Welcome ${payload.employeeName}`;
    const detailsTeam = await sendMessage(config.welcomeChannel, config.welcomeWebhook, null, textTeam, 'team_slack', payload.email);
    results.team_slack = { success: true, error: null, details: detailsTeam };
  } catch (e) {
    allSuccess = false;
    results.team_slack = { success: false, error: `[team_slack] ${e.message}`, details: null };
  }

  try {
    const textHr = `${config.teamPrefix} Employee Onboarded\nID: ${payload.employeeId}\nLink: ${payload.sfRecordUrl}`;
    const detailsHr = await sendMessage(config.hrChannel, config.hrWebhook, null, textHr, 'hr_slack', payload.email);
    results.hr_slack = { success: true, error: null, details: detailsHr };
  } catch (e) {
    allSuccess = false;
    results.hr_slack = { success: false, error: `[hr_slack] ${e.message}`, details: null };
  }

  res.status(allSuccess ? 200 : 207).json({ success: allSuccess, results });
});

app.listen(PORT, () => {
  console.log(`Slack Microservice running on port ${PORT}`);
});
