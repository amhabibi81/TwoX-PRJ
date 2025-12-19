import pino from 'pino';

/**
 * Structured logger using pino
 * - Production: JSON logs
 * - Development: Pretty-printed logs with colors
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV !== 'production' 
    ? { 
        target: 'pino-pretty', 
        options: { 
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        } 
      }
    : undefined
});

export default logger;
