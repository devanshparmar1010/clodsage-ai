/**
 * CloudSight AI — AWS Routes
 *
 * Defines the router mounting all AWS controller handlers.
 */

import { Router } from 'express';
import {
  getEC2Handler,
  getS3Handler,
  getEBSHandler,
  getRDSHandler,
  getCostHandler,
  getDashboardHandler,
  getRecommendationsHandler,
  getForecastHandler,
} from '../controllers/aws.controller';

const router = Router();

// GET /api/aws/ec2 (and /api/v1/aws/ec2)
router.get('/ec2', getEC2Handler);

// GET /api/aws/s3
router.get('/s3', getS3Handler);

// GET /api/aws/ebs
router.get('/ebs', getEBSHandler);

// GET /api/aws/rds
router.get('/rds', getRDSHandler);

// GET /api/aws/cost
router.get('/cost', getCostHandler);

// GET /api/aws/dashboard
router.get('/dashboard', getDashboardHandler);

// GET /api/aws/recommendations
router.get('/recommendations', getRecommendationsHandler);

// GET /api/aws/forecast
router.get('/forecast', getForecastHandler);

export default router;
