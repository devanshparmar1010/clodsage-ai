/**
 * CloudSight AI — Resource Explorer Controller
 * GET /api/v1/resources
 */

import { Request, Response, NextFunction } from 'express';
import { getResources } from '../services/resource.service';

export function resourceHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const type = req.query.type as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const collection = getResources(type, page, pageSize);
    res.status(200).json(collection);
  } catch (err) {
    next(err);
  }
}
