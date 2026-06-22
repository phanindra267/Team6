import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allRequests = await prisma.onboardingRequest.findMany({
      orderBy: { created_at: 'desc' },
    });

    const total = allRequests.length;
    const completed = allRequests.filter(r => r.status === 'COMPLETED').length;
    const failed = allRequests.filter(r => r.status === 'FAILED').length;
    const pending = allRequests.filter(r => r.status === 'PROCESSING').length;

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    // Computed count of steps that are failed across all requests
    let failureCount = failed;
    
    // Count retries: requests that have been updated after creation and are either COMPLETED or currently PROCESSING
    // but have experienced previous failures (i.e. updated_at is distinct from created_at).
    const retryCount = allRequests.filter(r => r.updated_at.getTime() !== r.created_at.getTime()).length;

    const recentActivities = allRequests.slice(0, 10).map(r => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      email: r.employee_email,
      status: r.status,
      timestamp: r.updated_at,
    }));

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalRequests: total,
          completed,
          failed,
          pending,
          successRate,
          failureCount,
          retryCount,
        },
        recentActivities,
      },
    });
  } catch (error) {
    logger.error(`[DashboardController] Error fetching dashboard stats: ${(error as Error).message}`);
    next(error);
  }
};

export const getFailures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const failures = await prisma.onboardingRequest.findMany({
      where: {
        OR: [
          { status: 'FAILED' },
          { sf_write_status: 'FAILED' },
          { team_slack_status: 'FAILED' },
          { hr_slack_status: 'FAILED' },
        ],
      },
      orderBy: { updated_at: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: failures,
    });
  } catch (error) {
    logger.error(`[DashboardController] Error fetching failure list: ${(error as Error).message}`);
    next(error);
  }
};

export const getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Test Database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'UP';

    // Test Redis connection
    let redisStatus = 'DOWN';
    try {
      const pingRes = await redisConnection.ping();
      if (pingRes === 'PONG') {
        redisStatus = 'UP';
      }
    } catch {
      redisStatus = 'DOWN';
    }

    const overallStatus = dbStatus === 'UP' && redisStatus === 'UP' ? 'UP' : 'DEGRADED';

    res.status(overallStatus === 'UP' ? 200 : 503).json({
      success: overallStatus === 'UP',
      status: overallStatus,
      timestamp: new Date(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        successFactors: 'UP', // Mock service connection state
      },
    });
  } catch (error) {
    logger.error(`[DashboardController] Health check failed: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      status: 'DOWN',
      error: (error as Error).message,
    });
  }
};

export default {
  getDashboardMetrics,
  getFailures,
  getHealth,
};
