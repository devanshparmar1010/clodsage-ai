/**
 * CloudSight AI — Express Application
 *
 * Assembles the middleware chain and mounts routes.
 * Middleware order:
 *   CORS -> Logging -> Body Parser -> Routes -> Swagger UI -> Error Handler
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { loggingMiddleware } from './middleware/logging.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import apiRoutes from './routes';
import awsRouter from './routes/aws.routes';
import { createLogger } from './utils/logger';

const logger = createLogger('app');
const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow frontend to call backend
app.use(cors());

// Request logging
app.use(loggingMiddleware);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// API Routes — /api/v1 & /api/aws
// ---------------------------------------------------------------------------

app.use('/api/v1', apiRoutes);
app.use('/api/aws', awsRouter);
app.use('/api/v1/aws', awsRouter);

// ---------------------------------------------------------------------------
// Swagger UI — /api-docs
// ---------------------------------------------------------------------------

try {
  // Dynamic import to handle potential missing modules gracefully
  const swaggerUi = require('swagger-ui-express');
  const YAML = require('yamljs');

  const specPath = path.resolve(__dirname, '../openapi.yaml');
  if (fs.existsSync(specPath)) {
    const swaggerDocument = YAML.load(specPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CloudSight AI — API Documentation',
    }));
    logger.info('Swagger UI available at /api-docs');
  } else {
    logger.warn(`OpenAPI spec not found at ${specPath}, Swagger UI disabled`);
  }
} catch (err) {
  logger.warn('Swagger UI setup failed, continuing without docs', {
    error: (err as Error).message,
  });
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cloudsight-ai-api', version: '1.0.0' });
});

// ---------------------------------------------------------------------------
// Error Handler (must be last)
// ---------------------------------------------------------------------------

app.use(errorMiddleware);

export default app;
