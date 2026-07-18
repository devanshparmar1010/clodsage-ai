/**
 * CloudSight AI — Forecast Controller
 * GET /api/v1/forecast
 */

import { Request, Response, NextFunction } from 'express';
import { getForecast } from '../services/forecast.service';

export function forecastHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const forecast = getForecast();
    res.status(200).json(forecast);
  } catch (err) {
    next(err);
  }
}
