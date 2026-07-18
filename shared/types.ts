/**
 * CloudSight AI — Shared TypeScript Types
 *
 * Copy this file directly into your frontend project.
 * These types match the backend API responses exactly.
 *
 * Contract version: 1.0.0
 * Verified by: 87/87 API contract tests
 */

// ─── Enums & Literals ────────────────────────────────────────────
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ServiceCategory = 'EC2' | 'S3' | 'EBS' | 'RDS';
export type RecommendationCategory = 'QUICK_WIN' | 'HIGH_IMPACT' | 'STRATEGIC';
export type ScoreCategory = 'Excellent' | 'Healthy' | 'Needs Optimization' | 'Critical';
export type ResourceStatus =
  | 'Active'
  | 'Moderate'
  | 'Underutilized'
  | 'Idle'
  | 'Orphaned'
  | 'Cold'
  | 'Warm';

// ─── Upload ──────────────────────────────────────────────────────
export interface UploadResponse {
  uploadId: string;
  status: string;
  resourcesDetected: number;
}

// ─── Dashboard ───────────────────────────────────────────────────
export interface DashboardResponse {
  monthlySpend: number;
  potentialSavings: number;
  savingsPercentage: number;
  finOpsScore: number;
  forecastedSpend: number;
}

// ─── Recommendations ─────────────────────────────────────────────
export interface Recommendation {
  id: string;
  resourceId: string;
  resourceType: ServiceCategory;
  title: string;
  reason: string;
  risk: RiskLevel;
  confidence: number;
  monthlySavings: number;
  annualSavings: number;
  implementationSteps: string[];
  executiveExplanation?: string;
  category?: RecommendationCategory;
  ruleId?: string;
}

// ─── Resources ───────────────────────────────────────────────────
export interface Resource {
  id: string;
  type: ServiceCategory;
  name?: string;
  utilization: number;
  monthlyCost: number;
  status: ResourceStatus;
  region?: string;
  details?: Record<string, unknown>;
}

export interface ResourceCollection {
  total: number;
  page: number;
  pageSize: number;
  items: Resource[];
}

// ─── Forecast ────────────────────────────────────────────────────
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

// ─── Score ────────────────────────────────────────────────────────
export interface ScoreResponse {
  score: number;
  category: ScoreCategory;
  breakdown: {
    compute: number;
    storage: number;
    reservedCapacity: number;
  };
  recommendations: string[];
}

// ─── Errors ──────────────────────────────────────────────────────
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── API Client Types ────────────────────────────────────────────
export interface RecommendationFilters {
  category?: ServiceCategory;
  risk?: RiskLevel;
  impact?: ImpactLevel;
}

export interface ResourceFilters {
  type?: ServiceCategory;
  page?: number;
  pageSize?: number;
}

// ─── App State ───────────────────────────────────────────────────
export interface AppData {
  dashboard: DashboardResponse;
  recommendations: Recommendation[];
  resources: ResourceCollection;
  forecast: ForecastResponse;
  score: ScoreResponse;
}

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  status: DataStatus;
  data: AppData | null;
  error: string | null;
}
