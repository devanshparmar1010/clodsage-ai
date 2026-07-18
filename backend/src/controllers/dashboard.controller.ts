/**
 * CloudSight AI — Dashboard Controller
 * GET /api/v1/dashboard
 */

import { Request, Response, NextFunction } from 'express';
import { getDashboard } from '../services/dashboard.service';

export function dashboardHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const dashboard = getDashboard();
    res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
}
