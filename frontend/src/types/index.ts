export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ServiceCategory = 'EC2' | 'S3' | 'EBS' | 'RDS';
export type RecommendationCategory = 'QUICK_WIN' | 'HIGH_IMPACT' | 'STRATEGIC';
export type ScoreCategory = 'Excellent' | 'Healthy' | 'Needs Optimization' | 'Critical';
export type ResourceStatus = 'Active' | 'Moderate' | 'Underutilized' | 'Idle' | 'Orphaned' | 'Cold' | 'Warm';

export interface UploadResponse {
  uploadId: string;
  status: string;
  resourcesDetected: number;
}

export interface DashboardResponse {
  monthlySpend: number;
  potentialSavings: number;
  savingsPercentage: number;
  finOpsScore: number;
  forecastedSpend: number;
}

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

export interface ForecastResponse {
  model: string;
  nextMonth: number;
  threeMonthForecast: number[];
  growthRate: number;
  confidenceInterval: { lower: number; upper: number };
  seasonalityDetected: boolean;
  executiveSummary: string;
}

export interface ScoreResponse {
  score: number;
  category: ScoreCategory;
  breakdown: { compute: number; storage: number; reservedCapacity: number };
  recommendations: string[];
}

export interface ErrorResponse {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export interface ChatResponse {
  answer: string;
}
