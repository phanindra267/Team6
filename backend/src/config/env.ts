import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/onboarding_db?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SF_API_URL: z.string().optional().default('https://api.successfactors.com'),
  SF_CLIENT_ID: z.string().optional().default('mock-client-id'),
  SF_PRIVATE_KEY: z.string().optional().default('mock-private-key'),
  SF_MOCK_MODE: z.coerce.boolean().default(true),
  SLACK_WEBHOOK_TEAM: z.string().optional().default(''),
  SLACK_WEBHOOK_HR: z.string().optional().default(''),
  SLACK_MOCK_MODE: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
