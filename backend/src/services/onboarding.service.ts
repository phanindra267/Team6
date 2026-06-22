import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { OnboardingRequest } from '@prisma/client';
import { successFactorsService } from './successfactors.service';
import { slackService } from './slack.service';

export interface CreateOnboardingInput {
  requestId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  manager: string;
  joiningDate: string;
  initiatedBy: string;
}

export class OnboardingService {
  /**
   * Find onboarding request by ID.
   */
  async getRequestById(id: string): Promise<OnboardingRequest | null> {
    return prisma.onboardingRequest.findUnique({
      where: { id },
    });
  }

  /**
   * Find onboarding request by email.
   */
  async getRequestByEmail(email: string): Promise<OnboardingRequest | null> {
    return prisma.onboardingRequest.findUnique({
      where: { employee_email: email },
    });
  }

  /**
   * Get all onboarding requests.
   */
  async getAllRequests(): Promise<OnboardingRequest[]> {
    return prisma.onboardingRequest.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Initialize or retrieve a request (Idempotent creation).
   */
  async createOnboardingRequest(input: CreateOnboardingInput): Promise<{ request: OnboardingRequest; isDuplicate: boolean }> {
    logger.info(`[OnboardingService] Received onboarding request. ID: ${input.requestId}, Email: ${input.email}`);

    // Idempotency: Lock/Check DB. Check by request_id OR employee_email to prevent duplicates.
    const existingRequest = await prisma.onboardingRequest.findFirst({
      where: {
        OR: [
          { request_id: input.requestId },
          { employee_email: input.email },
        ],
      },
    });

    if (existingRequest) {
      logger.warn(`[OnboardingService] Duplicate submission detected for RequestID: ${input.requestId} or Email: ${input.email}. Returning existing record.`);
      return { request: existingRequest, isDuplicate: true };
    }

    // Create new record with status PENDING for all external integrations
    const request = await prisma.onboardingRequest.create({
      data: {
        request_id: input.requestId,
        employee_email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        department: input.department,
        designation: input.designation,
        manager: input.manager,
        joining_date: new Date(input.joiningDate),
        initiated_by: input.initiatedBy,
        status: 'PROCESSING',
        sf_write_status: 'PENDING',
        team_slack_status: 'PENDING',
        hr_slack_status: 'PENDING',
      },
    });

    logger.info(`[OnboardingService] Created onboarding record in DB with ID: ${request.id}`);
    return { request, isDuplicate: false };
  }

  /**
   * Execute the onboarding saga steps sequentially.
   * Persists step-level state after every call (Saga pattern).
   */
  async processWorkflow(id: string): Promise<OnboardingRequest> {
    let request = await this.getRequestById(id);
    if (!request) {
      throw new Error(`Onboarding request with ID ${id} not found.`);
    }

    logger.info(`[OnboardingService] Processing onboarding workflow for ${request.employee_email} (Record ID: ${id})`);

    // --- STEP 1: SuccessFactors Registration ---
    if (request.sf_write_status !== 'SUCCESS') {
      try {
        logger.info(`[Saga Step 1] SAP SuccessFactors integration starting for ${request.employee_email}`);
        
        // Check if employee already exists in SuccessFactors by doing email lookup
        let sfUser = await successFactorsService.lookupEmployeeByEmail(request.employee_email);
        
        if (!sfUser) {
          sfUser = await successFactorsService.createEmployee({
            firstName: request.first_name,
            lastName: request.last_name,
            email: request.employee_email,
            phone: request.phone,
            department: request.department,
            designation: request.designation,
            manager: request.manager,
            joiningDate: request.joining_date,
          });
        } else {
          logger.info(`[Saga Step 1] Employee already exists in SF with ID: ${sfUser.sfEmployeeId}. Skipping creation.`);
        }

        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            sf_employee_id: sfUser.sfEmployeeId,
            sf_write_status: 'SUCCESS',
            error_message: null,
          },
        });
      } catch (err: any) {
        logger.error(`[Saga Step 1] SuccessFactors failed: ${err.message}`);
        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            sf_write_status: 'FAILED',
            status: 'FAILED',
            error_message: `Step 1 (SuccessFactors) Failed: ${err.message}`,
          },
        });
        return request;
      }
    }

    // --- STEP 2: Team Slack Message ---
    if (request.team_slack_status !== 'SUCCESS') {
      try {
        logger.info(`[Saga Step 2] Team Slack Notification starting for ${request.employee_email}`);
        await slackService.sendTeamNotification(
          request.first_name,
          request.last_name,
          request.department,
          request.joining_date,
          request.employee_email
        );

        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            team_slack_status: 'SUCCESS',
            error_message: null,
          },
        });
      } catch (err: any) {
        logger.error(`[Saga Step 2] Team Slack failed: ${err.message}`);
        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            team_slack_status: 'FAILED',
            status: 'FAILED',
            error_message: `Step 2 (Team Slack) Failed: ${err.message}`,
          },
        });
        return request;
      }
    }

    // --- STEP 3: HR Slack Message ---
    if (request.hr_slack_status !== 'SUCCESS') {
      try {
        logger.info(`[Saga Step 3] HR Slack Notification starting for ${request.employee_email}`);
        if (!request.sf_employee_id) {
          throw new Error('Missing SuccessFactors employee ID for deep link generation');
        }

        await slackService.sendHrNotification(
          request.first_name,
          request.last_name,
          request.sf_employee_id,
          request.department,
          request.joining_date,
          request.employee_email
        );

        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            hr_slack_status: 'SUCCESS',
            error_message: null,
          },
        });
      } catch (err: any) {
        logger.error(`[Saga Step 3] HR Slack failed: ${err.message}`);
        request = await prisma.onboardingRequest.update({
          where: { id },
          data: {
            hr_slack_status: 'FAILED',
            status: 'FAILED',
            error_message: `Step 3 (HR Slack) Failed: ${err.message}`,
          },
        });
        return request;
      }
    }

    // --- SAGA COMPLETE ---
    request = await prisma.onboardingRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        error_message: null,
      },
    });

    logger.info(`[OnboardingService] Onboarding workflow COMPLETED successfully for ${request.employee_email}`);
    return request;
  }

  /**
   * Reset failed steps to PENDING and trigger retry.
   */
  async prepareRetry(id: string): Promise<OnboardingRequest> {
    logger.info(`[OnboardingService] Triggering retry for request: ${id}`);
    
    let request = await this.getRequestById(id);
    if (!request) {
      throw new Error(`Onboarding request with ID ${id} not found.`);
    }

    if (request.status === 'COMPLETED') {
      logger.warn(`[OnboardingService] Onboarding request ${id} already completed. Skipping retry.`);
      return request;
    }

    // Keep SUCCESS steps as-is; reset FAILED steps to PENDING.
    const updates: any = {
      status: 'PROCESSING',
      error_message: null,
    };

    if (request.sf_write_status === 'FAILED') {
      updates.sf_write_status = 'PENDING';
    }
    if (request.team_slack_status === 'FAILED') {
      updates.team_slack_status = 'PENDING';
    }
    if (request.hr_slack_status === 'FAILED') {
      updates.hr_slack_status = 'PENDING';
    }

    const updatedRequest = await prisma.onboardingRequest.update({
      where: { id },
      data: updates,
    });

    return updatedRequest;
  }
}

export const onboardingService = new OnboardingService();
export default onboardingService;
