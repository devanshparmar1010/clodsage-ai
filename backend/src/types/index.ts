/**
 * CloudSight AI — Shared TypeScript DTOs
 *
 * All interfaces derived directly from API-Specification.yaml component schemas.
 * These are the single source of truth for request/response types across
 * the backend and will be consumed by the frontend.
 *
 * DO NOT deviate from the OpenAPI specification.
 */

// ---------------------------------------------------------------------------
// Upload — POST /api/v1/upload
// ---------------------------------------------------------------------------

export interface UploadResponse {
  uploadId: string;
  status: string;
  resourcesDetected: number;
}

// ---------------------------------------------------------------------------
// Dashboard — GET /api/v1/dashboard
// ---------------------------------------------------------------------------

export interface DashboardResponse {
  monthlySpend: number;
  potentialSavings: number;
  savingsPercentage: number;
  finOpsScore: number;
  forecastedSpend: number;
  aws_account?: {
    accountId: string;
    accountName: string;
  };
}

// ---------------------------------------------------------------------------
// Recommendations — GET /api/v1/recommendations
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  resourceId: string;
  resourceType: string;
  title: string;
  reason: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  monthlySavings: number;
  annualSavings: number;
  implementationSteps: string[];
  /** Extended fields beyond base OpenAPI spec (passed through from analytics) */
  executiveExplanation?: string;
  category?: string;
  ruleId?: string;
}

// ---------------------------------------------------------------------------
// Resources — GET /api/v1/resources
// ---------------------------------------------------------------------------

export interface Resource {
  id: string;
  type: string;
  name?: string;
  utilization: number;
  monthlyCost: number;
  status: string;
  region?: string;
  details?: Record<string, unknown>;
}

export interface ResourceCollection {
  total: number;
  page: number;
  pageSize: number;
  items: Resource[];
}

// ---------------------------------------------------------------------------
// Forecast — GET /api/v1/forecast
// ---------------------------------------------------------------------------

export interface ForecastResponse {
  model: string;
  nextMonth: number;
  threeMonthForecast: number[];
  growthRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  seasonalityDetected: boolean;
  executiveSummary: string;
}

// ---------------------------------------------------------------------------
// Score — GET /api/v1/score
// ---------------------------------------------------------------------------

export interface ScoreResponse {
  score: number;
  category: string;
  breakdown: {
    compute: number;
    storage: number;
    reservedCapacity: number;
  };
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Error — All error responses
// ---------------------------------------------------------------------------

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Analytics Results — Internal type for results.json
// ---------------------------------------------------------------------------

export interface AnalyticsResults {
  metadata: {
    generated_at: string;
    version: string;
    pipeline: string;
    resources_analyzed: Record<string, number>;
    total_resources: number;
    total_recommendations: number;
    processing_time_seconds: number;
  };
  dashboard: DashboardResponse;
  recommendations: Recommendation[];
  savings: {
    totalMonthlySavings: number;
    totalAnnualSavings: number;
    roiPercentage: number;
    savingsPercentage: number;
    totalCurrentMonthlyCost: number;
    recommendationsCount: number;
    byCategory: Record<string, number>;
    byRisk: Record<string, number>;
    byService: Record<string, number>;
  };
  score: ScoreResponse & {
    penalties: Array<{ condition: string; points: number; details: string }>;
    rewards: Array<{ condition: string; points: number; details: string }>;
  };
  forecast: ForecastResponse & {
    trendDirection: string;
    historicalDataPoints: number;
  };
}
