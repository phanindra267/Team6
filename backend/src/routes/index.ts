import { Router } from 'express';
import { 
  createRequest, 
  getAllRequests, 
  getRequestById, 
  retryRequest,
  createOnboardingSchema
} from '../controllers/onboarding.controller';
import { 
  getDashboardMetrics, 
  getFailures, 
  getHealth 
} from '../controllers/dashboard.controller';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Onboarding Routes
router.post('/onboarding', validate(createOnboardingSchema), createRequest);
router.get('/onboarding', getAllRequests);
router.get('/onboarding/:id', getRequestById);
router.post('/onboarding/:id/retry', retryRequest);

// Analytics & Dashboard Routes
router.get('/dashboard', getDashboardMetrics);
router.get('/failures', getFailures);

// Health Check Route
router.get('/health', getHealth);

export default router;
