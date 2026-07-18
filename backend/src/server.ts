/**
 * CloudSight AI — HTTP Server Entry Point
 *
 * Starts the Express application on the configured port.
 * Run with: npm run dev (development) or npm start (production)
 */

import app from './app';
import { config } from './config';
import { createLogger } from './utils/logger';

const logger = createLogger('server');

const server = app.listen(config.port, () => {
  logger.info(`CloudSight AI Backend started`, {
    port: config.port,
    env: config.nodeEnv,
    swagger: `http://localhost:${config.port}/api-docs`,
    health: `http://localhost:${config.port}/health`,
  });

  logger.info('Available endpoints:');
  logger.info(`  POST   http://localhost:${config.port}/api/v1/upload`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/dashboard`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/recommendations`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/resources`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/forecast`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/score`);
  logger.info(`  GET    http://localhost:${config.port}/api/v1/report`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
