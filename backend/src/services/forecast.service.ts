/**
 * CloudSight AI — Forecast Service
 *
 * Returns Prophet forecast data from cached analytics results.
 * NEVER performs calculations — all values come from Prophet via results.json.
 */

import { getLocalResults } from './analytics.service';
import type { ForecastResponse } from '../types';
import { AppError } from '../utils/errors';

/**
 * Get Prophet forecast results.
 * Data originates exclusively from the Python Prophet engine.
 */
export function getForecast(): ForecastResponse {
  const results = getLocalResults();

  if (!results.forecast) {
    throw new AppError('Forecast data not available. Prophet engine may have failed.', 503, 'FORECAST_UNAVAILABLE');
  }

  return {
    model: results.forecast.model,
    nextMonth: results.forecast.nextMonth,
    threeMonthForecast: results.forecast.threeMonthForecast,
    growthRate: results.forecast.growthRate,
    confidenceInterval: results.forecast.confidenceInterval,
    seasonalityDetected: results.forecast.seasonalityDetected,
    executiveSummary: results.forecast.executiveSummary,
  };
}
