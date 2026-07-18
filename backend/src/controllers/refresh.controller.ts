/**
 * CloudSight AI — Refresh Controller
 * POST /api/v1/refresh
 */

import { Request, Response, NextFunction } from 'express';
import { invalidateCache, getLiveAWSData } from '../services/analytics.service';

export function refreshHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    invalidateCache();
    // Run live AWS query immediately to fetch fresh data
    const data = getLiveAWSData();
    
    res.status(200).json({
      success: true,
      lastSynced: new Date(data.results.metadata.generated_at).toLocaleTimeString()
    });
  } catch (err) {
    next(err);
  }
}
