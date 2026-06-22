import { Queue, Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { onboardingService } from './onboarding.service';
import { logger } from '../config/logger';

const QUEUE_NAME = 'onboarding-queue';

// Use plain connection options (host/port) — not an ioredis instance —
// to avoid type conflicts between BullMQ's bundled ioredis and our top-level ioredis.
export const onboardingQueue = new Queue(QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

logger.info(`[Queue] BullMQ onboarding-queue initialized.`);

export const addOnboardingJob = async (id: string): Promise<Job> => {
  logger.info(`[Queue] Adding job for onboarding ID: ${id}`);
  return onboardingQueue.add('process-workflow', { id }, { jobId: id });
};

// Queue Worker
export const onboardingWorker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { id } = job.data;
    logger.info(`[Worker] Processing job ${job.id} for onboarding ID: ${id}`);
    try {
      await onboardingService.processWorkflow(id);
      logger.info(`[Worker] Successfully processed job ${job.id}`);
    } catch (err: any) {
      logger.error(`[Worker] Job ${job.id} failed: ${err.message}`);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

onboardingWorker.on('completed', (job) => {
  logger.info(`[Worker Event] Job completed: ${job.id}`);
});

onboardingWorker.on('failed', (job, err) => {
  logger.error(`[Worker Event] Job failed: ${job?.id}. Error: ${err.message}`);
});

/**
 * Helper to shut down connections cleanly (useful for unit/integration tests)
 */
export const closeQueueConnections = async (): Promise<void> => {
  logger.info('[Queue] Closing worker and queue Redis connections.');
  await onboardingWorker.close();
  await onboardingQueue.close();
};

export default {
  onboardingQueue,
  onboardingWorker,
  addOnboardingJob,
  closeQueueConnections,
};
