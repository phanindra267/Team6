import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class SlackService {
  private microserviceUrl: string;

  constructor() {
    this.microserviceUrl = env.SLACK_MICROSERVICE_URL || 'http://slack_service:5001';
  }

  /**
   * Send notification to Team Slack channel.
   */
  async sendTeamNotification(firstName: string, lastName: string, department: string, joiningDate: Date, email: string): Promise<boolean> {
    const formattedDate = new Date(joiningDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    logger.info(`[SlackService] Delegating Team notification for ${firstName} ${lastName} to Microservice...`);

    try {
      const response = await axios.post(`${this.microserviceUrl}/api/slack/welcome`, {
        employeeName: `${firstName} ${lastName}`,
        role: 'New Hire',
        department: department,
        startDate: formattedDate,
        onboardingId: `REQ-${Date.now()}`,
        initiatedBy: 'System',
        email: email
      }, { timeout: 8000 });

      logger.info(`[SlackService] Team notification delegated successfully. Microservice step: ${response.data.step}`);
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      logger.error(`[SlackService] Microservice Team notification failed: ${msg}`);
      throw new Error(`Slack Team notification failed: ${msg}`);
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
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const sfDeepLink = `${env.SF_API_URL}/sf/liveprofile?username=${employeeId}`;

    logger.info(`[SlackService] Delegating HR notification for ID ${employeeId} to Microservice...`);

    try {
      const response = await axios.post(`${this.microserviceUrl}/api/slack/hr-notification`, {
        employeeName: `${firstName} ${lastName}`,
        employeeId: employeeId,
        onboardingId: `REQ-${Date.now()}`,
        sfRecordUrl: sfDeepLink,
        department: department,
        startDate: formattedDate,
        email: email
      }, { timeout: 8000 });

      logger.info(`[SlackService] HR notification delegated successfully. Microservice step: ${response.data.step}`);
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      logger.error(`[SlackService] Microservice HR notification failed: ${msg}`);
      throw new Error(`Slack HR notification failed: ${msg}`);
    }
  }
}

export const slackService = new SlackService();
export default slackService;
