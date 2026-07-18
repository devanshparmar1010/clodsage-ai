/**
 * CloudSight AI — API Routes
 *
 * Central router mounting all controller handlers under /api/v1.
 * Route paths match API-Specification.yaml exactly.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { config } from '../config';
import { uploadHandler } from '../controllers/upload.controller';
import { dashboardHandler } from '../controllers/dashboard.controller';
import { recommendationHandler } from '../controllers/recommendation.controller';
import { resourceHandler } from '../controllers/resource.controller';
import { forecastHandler } from '../controllers/forecast.controller';
import { scoreHandler } from '../controllers/score.controller';
import { reportHandler } from '../controllers/report.controller';
import { chatHandler } from '../controllers/chat.controller';
import { validateQuery } from '../middleware/validation.middleware';
import {
  recommendationsQuerySchema,
  resourcesQuerySchema,
} from '../validators/upload.validator';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: config.uploadDir,
  limits: { fileSize: config.maxFileSize },
});

const uploadFields = upload.fields([
  { name: 'ec2', maxCount: 1 },
  { name: 's3', maxCount: 1 },
  { name: 'ebs', maxCount: 1 },
  { name: 'rds', maxCount: 1 },
  { name: 'monthlyCost', maxCount: 1 },
]);

const router = Router();

// POST /api/v1/upload — Upload infrastructure datasets
router.post('/upload', uploadFields, uploadHandler);

// GET /api/v1/dashboard — Executive dashboard metrics
router.get('/dashboard', dashboardHandler);

// GET /api/v1/recommendations — Optimization recommendations
router.get(
  '/recommendations',
  validateQuery(recommendationsQuerySchema),
  recommendationHandler,
);

// GET /api/v1/resources — Resource inventory explorer
router.get(
  '/resources',
  validateQuery(resourcesQuerySchema),
  resourceHandler,
);

// GET /api/v1/forecast — Prophet cost forecast
router.get('/forecast', forecastHandler);

// GET /api/v1/score — FinOps Cloud Efficiency Score
router.get('/score', scoreHandler);

import { refreshHandler } from '../controllers/refresh.controller';

// POST /api/v1/refresh — Force refresh AWS metrics
router.post('/refresh', refreshHandler);

// POST /api/v1/chat — Ask about cloud analysis and recommendations
router.post('/chat', chatHandler);

// GET /api/v1/report — Download executive PDF report
router.get('/report', reportHandler);

export default router;
