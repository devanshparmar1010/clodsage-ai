/**
 * CloudSight AI — Score Controller
 * GET /api/v1/score
 */

import { Request, Response, NextFunction } from 'express';
import { getScore } from '../services/score.service';

export function scoreHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const score = getScore();
    res.status(200).json(score);
  } catch (err) {
    next(err);
  }
}
