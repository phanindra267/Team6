import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './config/logger';
import router from './routes';
import errorHandler from './middleware/error.middleware';
import apiLimiter from './middleware/rate-limit.middleware';
import prisma from './config/db';
import { redisConnection } from './config/redis';
import { closeQueueConnections } from './services/queue.service';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for the hackathon dashboard, customize in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsers
app.use(express.json());

// Apply rate limiter to API routes
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', router);

// Handle root path
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the SAP SuccessFactors Onboarding Workflow Automation Engine [Team 06]',
    version: '1.0.0',
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop receiving requests
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Close database connection
      await prisma.$disconnect();
      logger.info('Database connection closed.');

      // Close Queue connections
      await closeQueueConnections();

      // Close primary Redis connection
      await redisConnection.quit();
      logger.info('Redis connection closed.');

      logger.info('Graceful shutdown completed. Exiting.');
      process.exit(0);
    } catch (err: any) {
      logger.error(`Error during graceful shutdown: ${err.message}`);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
