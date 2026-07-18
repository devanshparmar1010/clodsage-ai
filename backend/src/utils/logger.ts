/**
 * CloudSight AI — Structured Logger
 *
 * Winston logger configured per Technical-Architecture.md §17:
 *   { timestamp, service, level, message, context }
 */

import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
  winston.format.errors({ stack: true }),
  config.nodeEnv === 'production'
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
        return `${timestamp} | ${service || 'cloudsight'} | ${level.toUpperCase()} | ${message}${metaStr}`;
      })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'cloudsight-api' },
  format: logFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Create a child logger with a specific service name.
 */
export function createLogger(service: string): winston.Logger {
  return logger.child({ service });
}
