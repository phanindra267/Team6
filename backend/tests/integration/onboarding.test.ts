import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/config/db';
import { onboardingQueue } from '../../src/services/queue.service';
import { successFactorsService } from '../../src/services/successfactors.service';
import { slackService } from '../../src/services/slack.service';

// Mock DB and Queue connections/methods
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  prisma: {
    onboardingRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  },
  default: {
    onboardingRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  }
}));

jest.mock('../../src/services/queue.service', () => ({
  __esModule: true,
  onboardingQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job_id' }),
  },
  onboardingWorker: {
    close: jest.fn(),
  },
  addOnboardingJob: jest.fn().mockResolvedValue({ id: 'job_id' }),
  closeQueueConnections: jest.fn().mockResolvedValue(undefined),
}));

describe('Onboarding Flow API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPayload = {
    requestId: 'req-12345',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    department: 'Engineering',
    designation: 'Staff Engineer',
    manager: 'Jane Smith',
    joiningDate: '2026-07-01T00:00:00.000Z',
    initiatedBy: 'HR Admin',
  };

  const mockDbRecord = {
    id: 'db-uuid-1111',
    request_id: 'req-12345',
    employee_email: 'john.doe@example.com',
    sf_employee_id: null,
    first_name: 'John',
    last_name: 'Doe',
    phone: '1234567890',
    department: 'Engineering',
    designation: 'Staff Engineer',
    manager: 'Jane Smith',
    joining_date: new Date('2026-07-01T00:00:00.000Z'),
    initiated_by: 'HR Admin',
    status: 'PROCESSING',
    sf_write_status: 'PENDING',
    team_slack_status: 'PENDING',
    hr_slack_status: 'PENDING',
    error_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe('POST /api/onboarding', () => {
    it('should create a new onboarding request and push it to the queue', async () => {
      (prisma.onboardingRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.onboardingRequest.create as jest.Mock).mockResolvedValue(mockDbRecord);

      const response = await request(app)
        .post('/api/onboarding')
        .send(mockPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PROCESSING');
      expect(prisma.onboardingRequest.create).toHaveBeenCalled();
    });

    it('should implement idempotency and return existing record on duplicate submission', async () => {
      (prisma.onboardingRequest.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);

      const response = await request(app)
        .post('/api/onboarding')
        .send(mockPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already exists');
      expect(response.body.data.id).toBe(mockDbRecord.id);
      expect(prisma.onboardingRequest.create).not.toHaveBeenCalled();
    });

    it('should return 400 validation error if input fields are missing', async () => {
      const invalidPayload = { ...mockPayload, email: 'not-an-email' };

      const response = await request(app)
        .post('/api/onboarding')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/onboarding/:id', () => {
    it('should return the record if it exists', async () => {
      (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(mockDbRecord);

      const response = await request(app).get(`/api/onboarding/${mockDbRecord.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockDbRecord.id);
    });

    it('should return 404 if record is not found', async () => {
      (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/onboarding/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/onboarding/:id/retry', () => {
    it('should reset failed steps to PENDING and trigger queue job', async () => {
      const failedDbRecord = {
        ...mockDbRecord,
        status: 'FAILED',
        sf_write_status: 'FAILED',
        team_slack_status: 'SUCCESS',
        hr_slack_status: 'PENDING',
        error_message: 'Step 1 (SuccessFactors) Failed',
      };

      const retryingDbRecord = {
        ...mockDbRecord,
        status: 'PROCESSING',
        sf_write_status: 'PENDING', // Reset from FAILED
        team_slack_status: 'SUCCESS', // Retained SUCCESS
        hr_slack_status: 'PENDING',
        error_message: null,
      };

      (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(failedDbRecord);
      (prisma.onboardingRequest.update as jest.Mock).mockResolvedValue(retryingDbRecord);

      const response = await request(app)
        .post(`/api/onboarding/${failedDbRecord.id}/retry`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sf_write_status).toBe('PENDING');
      expect(response.body.data.status).toBe('PROCESSING');
      expect(prisma.onboardingRequest.update).toHaveBeenCalled();
    });

    it('should return success and do nothing if the request is already COMPLETED', async () => {
      const completedDbRecord = {
        ...mockDbRecord,
        status: 'COMPLETED',
        sf_write_status: 'SUCCESS',
        team_slack_status: 'SUCCESS',
        hr_slack_status: 'SUCCESS',
      };

      (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(completedDbRecord);

      const response = await request(app)
        .post(`/api/onboarding/${completedDbRecord.id}/retry`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already COMPLETED');
      expect(prisma.onboardingRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/dashboard', () => {
    it('should calculate correct metrics', async () => {
      const mockList = [
        { ...mockDbRecord, status: 'COMPLETED', created_at: new Date('2026-06-20'), updated_at: new Date('2026-06-20') },
        { ...mockDbRecord, status: 'FAILED', created_at: new Date('2026-06-21'), updated_at: new Date('2026-06-21') },
        { ...mockDbRecord, status: 'PROCESSING', created_at: new Date('2026-06-22'), updated_at: new Date('2026-06-22') },
      ];
      (prisma.onboardingRequest.findMany as jest.Mock).mockResolvedValue(mockList);

      const response = await request(app).get('/api/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.data.metrics.totalRequests).toBe(3);
      expect(response.body.data.metrics.completed).toBe(1);
      expect(response.body.data.metrics.failed).toBe(1);
      expect(response.body.data.metrics.pending).toBe(1);
      expect(response.body.data.metrics.successRate).toBe(33);
    });
  });
});
