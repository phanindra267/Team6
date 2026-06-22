import { onboardingService } from '../../src/services/onboarding.service';
import { prisma } from '../../src/config/db';
import { successFactorsService } from '../../src/services/successfactors.service';
import { slackService } from '../../src/services/slack.service';

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  prisma: {
    onboardingRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/successfactors.service', () => ({
  __esModule: true,
  successFactorsService: {
    lookupEmployeeByEmail: jest.fn(),
    createEmployee: jest.fn(),
  },
}));

jest.mock('../../src/services/slack.service', () => ({
  __esModule: true,
  slackService: {
    sendTeamNotification: jest.fn(),
    sendHrNotification: jest.fn(),
  },
}));

describe('Onboarding Saga Workflow Unit Tests', () => {
  const mockId = 'uuid-saga-111';
  
  const initialRecord = {
    id: mockId,
    first_name: 'Alice',
    last_name: 'Smith',
    employee_email: 'alice.smith@example.com',
    phone: '555-0199',
    department: 'Marketing',
    designation: 'Manager',
    manager: 'Bob Vance',
    joining_date: new Date(),
    initiated_by: 'HR Coordinator',
    status: 'PROCESSING',
    sf_write_status: 'PENDING',
    team_slack_status: 'PENDING',
    hr_slack_status: 'PENDING',
    sf_employee_id: null,
    error_message: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fail and save error at Step 1 (SuccessFactors) when SuccessFactors creation fails', async () => {
    (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(initialRecord);
    (successFactorsService.lookupEmployeeByEmail as jest.Mock).mockResolvedValue(null);
    (successFactorsService.createEmployee as jest.Mock).mockRejectedValue(new Error('SF Connect Refused'));
    
    // Stub update to return the updated record representing FAILED step
    const failedRecord = {
      ...initialRecord,
      sf_write_status: 'FAILED',
      status: 'FAILED',
      error_message: 'Step 1 (SuccessFactors) Failed: SF Connect Refused',
    };
    (prisma.onboardingRequest.update as jest.Mock).mockResolvedValue(failedRecord);

    const result = await onboardingService.processWorkflow(mockId);

    expect(successFactorsService.createEmployee).toHaveBeenCalled();
    expect(result.sf_write_status).toBe('FAILED');
    expect(result.status).toBe('FAILED');
    expect(result.error_message).toContain('SF Connect Refused');
    expect(slackService.sendTeamNotification).not.toHaveBeenCalled();
  });

  it('should complete Step 1 successfully, fail at Step 2 (Team Slack), and halt the workflow', async () => {
    const afterSfSuccessRecord = {
      ...initialRecord,
      sf_write_status: 'SUCCESS',
      sf_employee_id: 'SF_8888',
    };

    // First DB fetch gets initial record, second fetch gets sf success updated record
    (prisma.onboardingRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce(initialRecord)
      .mockResolvedValueOnce(afterSfSuccessRecord);

    (successFactorsService.lookupEmployeeByEmail as jest.Mock).mockResolvedValue(null);
    (successFactorsService.createEmployee as jest.Mock).mockResolvedValue({
      sfEmployeeId: 'SF_8888',
      email: initialRecord.employee_email,
      status: 'Active',
    });

    (slackService.sendTeamNotification as jest.Mock).mockRejectedValue(new Error('Slack Rate Limit'));

    // DB update stubs
    const dbUpdateMock = prisma.onboardingRequest.update as jest.Mock;
    dbUpdateMock.mockImplementation((args) => {
      const data = args.data;
      if (data.sf_write_status === 'SUCCESS') {
        return afterSfSuccessRecord;
      }
      if (data.team_slack_status === 'FAILED') {
        return {
          ...afterSfSuccessRecord,
          team_slack_status: 'FAILED',
          status: 'FAILED',
          error_message: 'Step 2 (Team Slack) Failed: Slack Rate Limit',
        };
      }
      return initialRecord;
    });

    const result = await onboardingService.processWorkflow(mockId);

    expect(successFactorsService.createEmployee).toHaveBeenCalled();
    expect(slackService.sendTeamNotification).toHaveBeenCalled();
    expect(result.sf_write_status).toBe('SUCCESS');
    expect(result.team_slack_status).toBe('FAILED');
    expect(result.status).toBe('FAILED');
    expect(slackService.sendHrNotification).not.toHaveBeenCalled();
  });

  it('should process successfully through all steps and mark workflow as COMPLETED', async () => {
    const recordSfDone = { ...initialRecord, sf_write_status: 'SUCCESS', sf_employee_id: 'SF_123' };
    const recordSlackTeamDone = { ...recordSfDone, team_slack_status: 'SUCCESS' };
    const recordComplete = { ...recordSlackTeamDone, hr_slack_status: 'SUCCESS', status: 'COMPLETED' };

    (prisma.onboardingRequest.findUnique as jest.Mock).mockResolvedValue(initialRecord);
    
    (successFactorsService.lookupEmployeeByEmail as jest.Mock).mockResolvedValue(null);
    (successFactorsService.createEmployee as jest.Mock).mockResolvedValue({
      sfEmployeeId: 'SF_123',
      email: initialRecord.employee_email,
      status: 'Active',
    });
    (slackService.sendTeamNotification as jest.Mock).mockResolvedValue(true);
    (slackService.sendHrNotification as jest.Mock).mockResolvedValue(true);

    const dbUpdateMock = prisma.onboardingRequest.update as jest.Mock;
    dbUpdateMock.mockImplementation((args) => {
      const data = args.data;
      if (data.sf_write_status === 'SUCCESS') return recordSfDone;
      if (data.team_slack_status === 'SUCCESS') return recordSlackTeamDone;
      if (data.hr_slack_status === 'SUCCESS') return recordSlackTeamDone; // intermediate
      if (data.status === 'COMPLETED') return recordComplete;
      return initialRecord;
    });

    const result = await onboardingService.processWorkflow(mockId);

    expect(result.status).toBe('COMPLETED');
    expect(result.sf_write_status).toBe('SUCCESS');
    expect(result.team_slack_status).toBe('SUCCESS');
    expect(result.hr_slack_status).toBe('SUCCESS');
  });
});
