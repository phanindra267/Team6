import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class SlackService {
  private teamWebhookUrl: string;
  private hrWebhookUrl: string;
  private mockMode: boolean;

  constructor() {
    this.teamWebhookUrl = env.SLACK_WEBHOOK_TEAM || '';
    this.hrWebhookUrl = env.SLACK_WEBHOOK_HR || '';
    this.mockMode = env.SLACK_MOCK_MODE || (!env.SLACK_WEBHOOK_TEAM && !env.SLACK_WEBHOOK_HR);
  }

  /**
   * Send notification to Team Slack channel.
   */
  async sendTeamNotification(firstName: string, lastName: string, department: string, joiningDate: Date, email: string): Promise<boolean> {
    const formattedDate = new Date(joiningDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const text = `[Team 06]\nWelcome ${firstName} ${lastName}\nDepartment: ${department}\nJoining Date: ${formattedDate}`;

    logger.info(`[SlackService] Sending Team Onboarding alert for ${firstName} ${lastName}`);

    if (this.mockMode || !this.teamWebhookUrl) {
      return this.mockSend('Team', text, email);
    }

    try {
      await axios.post(this.teamWebhookUrl, { text }, { timeout: 5000 });
      logger.info('[SlackService] Team notification sent successfully.');
      return true;
    } catch (error: any) {
      logger.error(`[SlackService] Team notification failed: ${error.message}`);
      throw new Error(`Slack Team notification failed: ${error.message}`);
    }
  }

  /**
   * Send notification to HR Slack channel with SuccessFactors deep link.
   */
  async sendHrNotification(
    firstName: string,
    lastName: string,
    employeeId: string,
    department: string,
    joiningDate: Date,
    email: string
  ): Promise<boolean> {
    const formattedDate = new Date(joiningDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Deep link formula into SuccessFactors Employee Profile
    const sfDeepLink = `${env.SF_API_URL}/sf/liveprofile?username=${employeeId}`;

    const text = `[Team 06]\nEmployee Onboarded\nEmployee ID: ${employeeId}\nDepartment: ${department}\nJoining Date: ${formattedDate}\nSuccessFactors Link: ${sfDeepLink}`;

    logger.info(`[SlackService] Sending HR Onboarding notification for employee ID: ${employeeId}`);

    if (this.mockMode || !this.hrWebhookUrl) {
      return this.mockSend('HR', text, email);
    }

    try {
      await axios.post(this.hrWebhookUrl, { text }, { timeout: 5000 });
      logger.info('[SlackService] HR notification sent successfully.');
      return true;
    } catch (error: any) {
      logger.error(`[SlackService] HR notification failed: ${error.message}`);
      throw new Error(`Slack HR notification failed: ${error.message}`);
    }
  }

  private async mockSend(channel: 'Team' | 'HR', text: string, email: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    const lowerEmail = email.toLowerCase();
    
    // Inject mock failures
    if (channel === 'Team' && lowerEmail.includes('fail-slack-team')) {
      logger.warn(`[SlackService Mock] Injected Team channel post failure for ${email}`);
      throw new Error('Slack connection timeout: Injected Team Slack mock failure.');
    }
    
    if (channel === 'HR' && lowerEmail.includes('fail-slack-hr')) {
      logger.warn(`[SlackService Mock] Injected HR channel post failure for ${email}`);
      throw new Error('Slack Server Error (500): Injected HR Slack mock failure.');
    }

    logger.info(`[SlackService Mock] [Channel: ${channel}] Content:\n${text}`);
    return true;
  }
}

export const slackService = new SlackService();
export default slackService;
