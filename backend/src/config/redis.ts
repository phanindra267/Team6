import { env } from './env';

// Parse the Redis URL into host/port for BullMQ's built-in ioredis
// BullMQ bundles its own ioredis version; passing a plain ConnectionOptions
// object avoids type conflicts between the two ioredis instances.
const redisUrl = new URL(env.REDIS_URL.startsWith('redis://') ? env.REDIS_URL : `redis://${env.REDIS_URL}`);

export const redisConnectionOptions = {
  host: redisUrl.hostname || 'localhost',
  port: parseInt(redisUrl.port || '6379', 10),
  maxRetriesPerRequest: null as null, // Required by BullMQ
  enableReadyCheck: false,
};

// Standalone ioredis client used for health checks and direct Redis operations
import Redis from 'ioredis';
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

export default redisConnection;
