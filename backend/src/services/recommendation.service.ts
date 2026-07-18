/**
 * CloudSight AI — Recommendation Service
 *
 * Returns filtered optimization recommendations from cached analytics results.
 * Supports filtering by category (EC2/S3/EBS/RDS), risk, and impact level.
 */

import { getLocalResults } from './analytics.service';
import type { Recommendation } from '../types';

interface RecommendationFilters {
  category?: string;/*  */
  risk?: string;
  impact?: string;
}

/**
 * Classify impact level based on annual savings.
 * Matches the priority engine from Recommendation-Rules.md §9.
 */
function getImpactLevel(annualSavings: number): string {
  if (annualSavings > 10000) return 'HIGH';
  if (annualSavings > 2000) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get filtered recommendations.
 *
 * @param filters - Optional filters for category, risk, impact.
 * @returns Filtered array of Recommendation objects.
 */
export function getRecommendations(filters: RecommendationFilters): Recommendation[] {
  const results = getLocalResults();
  let recs = results.recommendations;

  // Filter by resource type (category in API spec maps to resourceType)
  if (filters.category) {
    recs = recs.filter((r) => r.resourceType === filters.category);
  }

  // Filter by risk level
  if (filters.risk) {
    recs = recs.filter((r) => r.risk === filters.risk);
  }

  // Filter by impact level (derived from annualSavings)
  if (filters.impact) {
    recs = recs.filter((r) => getImpactLevel(r.annualSavings) === filters.impact);
  }

  return recs;
}
