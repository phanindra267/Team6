import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  handler: (req, res, next, options) => {
    logger.warn(`[RateLimit] Rate limit exceeded by IP: ${req.ip} for path ${req.path}`);
    res.status(options.statusCode).send(options.message);
  },
});

export default apiLimiter;
