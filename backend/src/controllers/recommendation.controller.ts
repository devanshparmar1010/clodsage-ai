/**
 * CloudSight AI — Recommendation Controller
 * GET /api/v1/recommendations
 */

import { Request, Response, NextFunction } from 'express';
import { getRecommendations } from '../services/recommendation.service';

export function recommendationHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const { category, risk, impact } = req.query as {
      category?: string;
      risk?: string;
      impact?: string;
    };

    const recommendations = getRecommendations({ category, risk, impact });
    res.status(200).json(recommendations);
  } catch (err) {
    next(err);
  }
}
