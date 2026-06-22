import winston from 'winston';
import { env } from './env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const isDevelopment = env.NODE_ENV === 'development';
  return isDevelopment ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  }),
];

// Add file logging in non-test and production environments
if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', format }),
    new winston.transports.File({ filename: 'logs/combined.log', format })
  );
}

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default logger;
