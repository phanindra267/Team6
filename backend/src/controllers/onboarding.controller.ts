import { Request, Response, NextFunction } from 'express';
import { onboardingService } from '../services/onboarding.service';
import { addOnboardingJob } from '../services/queue.service';
import { logger } from '../config/logger';
import { z } from 'zod';

// Input validation schema
export const createOnboardingSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
  firstName: z.string().min(1, 'firstName is required'),
  lastName: z.string().min(1, 'lastName is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(5, 'phone is required'),
  department: z.string().min(1, 'department is required'),
  designation: z.string().min(1, 'designation is required'),
  manager: z.string().min(1, 'manager is required'),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format (must be ISO format)',
  }),
  initiatedBy: z.string().min(1, 'initiatedBy is required'),
});

export const createRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { request, isDuplicate } = await onboardingService.createOnboardingRequest(req.body);

    if (isDuplicate) {
      // Idempotency: Return 200 with existing record, do not re-run workflow.
      res.status(200).json({
        success: true,
        message: 'Request already exists. Returned cached record.',
        data: request,
      });
      return;
    }

    // Push saga execution to the BullMQ processing queue
    await addOnboardingJob(request.id);

    res.status(201).json({
      success: true,
      message: 'Onboarding process initiated successfully.',
      data: request,
    });
  } catch (error) {
    logger.error(`[OnboardingController] Error in createRequest: ${(error as Error).message}`);
    next(error);
  }
};

export const getAllRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requests = await onboardingService.getAllRequests();
    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    logger.error(`[OnboardingController] Error in getAllRequests: ${(error as Error).message}`);
    next(error);
  }
};

export const getRequestById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await onboardingService.getRequestById(id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Onboarding request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    logger.error(`[OnboardingController] Error in getRequestById: ${(error as Error).message}`);
    next(error);
  }
};

export const retryRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Transition failed steps and set status back to PROCESSING
    const request = await onboardingService.prepareRetry(id);

    if (request.status === 'COMPLETED') {
      res.status(200).json({
        success: true,
        message: 'Workflow already COMPLETED. No retry needed.',
        data: request,
      });
      return;
    }

    // Queue saga retry
    await addOnboardingJob(request.id);

    res.status(200).json({
      success: true,
      message: 'Retry initiated successfully.',
      data: request,
    });
  } catch (error) {
    logger.error(`[OnboardingController] Error in retryRequest: ${(error as Error).message}`);
    next(error);
  }
};

export default {
  createRequest,
  getAllRequests,
  getRequestById,
  retryRequest,
};
