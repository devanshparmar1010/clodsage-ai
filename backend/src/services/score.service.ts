/**
 * CloudSight AI — Score Service
 *
 * Returns FinOps Cloud Efficiency Score from cached analytics results.
 * Logic originates from score_engine.py — this service only reads.
 */

import { getCachedResults } from './analytics.service';
import type { ScoreResponse } from '../types';

/**
 * Get the Cloud Efficiency Score.
 * All scoring logic is in the Python score_engine.py.
 */
export function getScore(): ScoreResponse {
  const results = getCachedResults();

  return {
    score: results.score.score,
    category: results.score.category,
    breakdown: results.score.breakdown,
    recommendations: results.score.recommendations,
  };
}
