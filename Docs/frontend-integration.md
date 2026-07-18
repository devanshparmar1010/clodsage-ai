# CloudSight AI — Frontend Integration Package

> **Contract Version:** 1.0.0  
> **Backend Base URL:** `http://localhost:3001`  
> **API Prefix:** `/api/v1`  
> **Generated:** July 2026

This document is the **definitive contract** between the backend and frontend teams. All endpoints, DTOs, response shapes, and error formats documented here are verified by 87 passing contract tests.

---

## Table of Contents

1. [API Consumption Guide](#1-api-consumption-guide)
2. [Example Request/Response Payloads](#2-example-requestresponse-payloads)
3. [TypeScript Interfaces](#3-typescript-interfaces)
4. [Mock Data Fixtures](#4-mock-data-fixtures)
5. [Loading & Empty States](#5-loading--empty-states)
6. [Error States](#6-error-states)
7. [Polling & Caching Strategy](#7-polling--caching-strategy)
8. [CORS Configuration](#8-cors-configuration)
9. [Environment Variables](#9-environment-variables)
10. [Frontend Onboarding Guide](#10-frontend-onboarding-guide)

---

## 1. API Consumption Guide

### Endpoint Summary

| Method | Endpoint | Purpose | Auth | Content-Type |
|--------|----------|---------|------|--------------|
| `GET` | `/health` | Health check | None | `application/json` |
| `POST` | `/api/v1/upload` | Upload CSV datasets | None | `multipart/form-data` |
| `GET` | `/api/v1/dashboard` | Executive metrics | None | `application/json` |
| `GET` | `/api/v1/recommendations` | Optimization list | None | `application/json` |
| `GET` | `/api/v1/resources` | Resource inventory | None | `application/json` |
| `GET` | `/api/v1/forecast` | Prophet forecast | None | `application/json` |
| `GET` | `/api/v1/score` | FinOps health score | None | `application/json` |
| `GET` | `/api/v1/report` | Executive PDF report | None | `application/pdf` |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND FLOW                            │
│                                                                 │
│  1. Upload CSVs ──► POST /upload                                │
│                         │                                       │
│                         ▼                                       │
│  2. Backend runs Python analytics pipeline (~25s)               │
│                         │                                       │
│                         ▼                                       │
│  3. Receive UploadResponse { uploadId, status, resourceCount }  │
│                         │                                       │
│                         ▼                                       │
│  4. Fetch all dashboard data in parallel:                       │
│     ├── GET /dashboard                                          │
│     ├── GET /recommendations                                    │
│     ├── GET /resources                                          │
│     ├── GET /forecast                                           │
│     └── GET /score                                              │
│                                                                 │
│  5. Download PDF: GET /report                                   │
└─────────────────────────────────────────────────────────────────┘
```

> **Important:** All GET endpoints read from the same cached analytics results. They will return `409 NO_DATA` until at least one upload has been processed. A previous results.json on disk will be auto-loaded on server startup.

### Query Parameters

#### `GET /api/v1/recommendations`

| Param | Type | Values | Description |
|-------|------|--------|-------------|
| `category` | string | `EC2`, `S3`, `EBS`, `RDS` | Filter by service type |
| `risk` | string | `LOW`, `MEDIUM`, `HIGH` | Filter by risk level |
| `impact` | string | `LOW`, `MEDIUM`, `HIGH` | Filter by savings impact |

All filters are optional and combinable:
```
GET /api/v1/recommendations?category=EC2&risk=LOW
GET /api/v1/recommendations?impact=HIGH
```

#### `GET /api/v1/resources`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | — | Filter: `EC2`, `S3`, `EBS`, `RDS` |
| `page` | integer | `1` | Page number (1-indexed) |
| `pageSize` | integer | `20` | Items per page (max 100) |

---

## 2. Example Request/Response Payloads

### POST /api/v1/upload

**Request:**
```typescript
const formData = new FormData();
formData.append('ec2', ec2File);
formData.append('s3', s3File);
formData.append('ebs', ebsFile);
formData.append('rds', rdsFile);
formData.append('monthlyCost', monthlyCostFile);

const response = await fetch('/api/v1/upload', {
  method: 'POST',
  body: formData,
});
```

**Response (200):**
```json
{
  "uploadId": "upl_a1b2c3d4",
  "status": "completed",
  "resourcesDetected": 43
}
```

---

### GET /api/v1/dashboard

**Response (200):**
```json
{
  "monthlySpend": 11387.20,
  "potentialSavings": 3073.62,
  "savingsPercentage": 26.99,
  "finOpsScore": 35,
  "forecastedSpend": 22016.09
}
```

---

### GET /api/v1/recommendations

**Response (200):**
```json
[
  {
    "id": "S3-GL-006",
    "resourceId": "data-lake-raw",
    "resourceType": "S3",
    "title": "Migrate data-lake-raw to Glacier",
    "reason": "Bucket has not been accessed for 90 days and is currently in STANDARD storage class.",
    "risk": "LOW",
    "confidence": 0.97,
    "monthlySavings": 826.20,
    "annualSavings": 9914.40,
    "implementationSteps": [
      "Create S3 Lifecycle policy for Glacier transition.",
      "Validate compliance requirements.",
      "Transition archived data."
    ],
    "executiveExplanation": "Data stored in data-lake-raw (15.0 TB) has remained inactive...",
    "category": "STRATEGIC",
    "ruleId": "S3-002"
  }
]
```

---

### GET /api/v1/resources?type=EC2&page=1&pageSize=2

**Response (200):**
```json
{
  "total": 15,
  "page": 1,
  "pageSize": 2,
  "items": [
    {
      "id": "i-001",
      "type": "EC2",
      "name": "prod-api",
      "utilization": 12,
      "monthlyCost": 72.50,
      "status": "Underutilized",
      "region": "us-east-1",
      "details": {
        "instanceType": "t3.large",
        "cpuAvg": 12,
        "memoryAvg": 28,
        "hoursRunning": 720,
        "environment": "prod"
      }
    }
  ]
}
```

---

### GET /api/v1/forecast

**Response (200):**
```json
{
  "model": "Prophet",
  "nextMonth": 22016.09,
  "threeMonthForecast": [22016.09, 21424.58, 20400.75],
  "growthRate": 7.4,
  "confidenceInterval": {
    "lower": 22011.71,
    "upper": 22020.93
  },
  "seasonalityDetected": true,
  "executiveSummary": "Cloud spending is projected to reach $22,016 next month, reflecting moderate growth of 7.4%. The three-month forecast averages $21,280/month..."
}
```

---

### GET /api/v1/score

**Response (200):**
```json
{
  "score": 35,
  "category": "Critical",
  "breakdown": {
    "compute": 90,
    "storage": 65,
    "reservedCapacity": 80
  },
  "recommendations": [
    "Terminate or rightsize 2 idle EC2 instance(s) to improve efficiency.",
    "Delete 4 orphaned EBS volume(s) to reduce storage waste.",
    "Add lifecycle policies to 4 S3 bucket(s) with inactive data.",
    "Purchase Savings Plans for 9 long-running instance(s).",
    "Enable Intelligent Tiering on 2 bucket(s) with cooling access patterns."
  ]
}
```

---

### GET /api/v1/report

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="CloudSight_AI_Report.pdf"
Body: <binary PDF data>
```

**Frontend download:**
```typescript
const response = await fetch('/api/v1/report');
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'CloudSight_AI_Report.pdf';
a.click();
URL.revokeObjectURL(url);
```

---

## 3. TypeScript Interfaces

Copy these directly into your frontend codebase. They are the **exact** types returned by the backend.

```typescript
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
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ServiceCategory = 'EC2' | 'S3' | 'EBS' | 'RDS';
export type RecommendationCategory = 'QUICK_WIN' | 'HIGH_IMPACT' | 'STRATEGIC';

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
export type ResourceStatus =
  | 'Active'
  | 'Moderate'
  | 'Underutilized'
  | 'Idle'
  | 'Orphaned'
  | 'Cold'
  | 'Warm';

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
  model: string; // Always "Prophet"
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
export type ScoreCategory =
  | 'Excellent'    // 90-100
  | 'Healthy'      // 70-89
  | 'Needs Optimization'  // 50-69
  | 'Critical';    // 0-49

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
```

---

## 4. Mock Data Fixtures

Use these for frontend development when the backend is unavailable.

```typescript
export const mockDashboard: DashboardResponse = {
  monthlySpend: 11387.20,
  potentialSavings: 3073.62,
  savingsPercentage: 26.99,
  finOpsScore: 35,
  forecastedSpend: 22016.09,
};

export const mockRecommendations: Recommendation[] = [
  {
    id: 'S3-GL-006',
    resourceId: 'data-lake-raw',
    resourceType: 'S3',
    title: 'Migrate data-lake-raw to Glacier',
    reason: 'Bucket has not been accessed for 90 days.',
    risk: 'LOW',
    confidence: 0.97,
    monthlySavings: 826.20,
    annualSavings: 9914.40,
    implementationSteps: [
      'Create S3 Lifecycle policy for Glacier transition.',
      'Validate compliance requirements.',
      'Transition archived data.',
    ],
    executiveExplanation: 'Data stored in data-lake-raw (15.0 TB) has remained inactive...',
    category: 'STRATEGIC',
    ruleId: 'S3-002',
  },
  {
    id: 'EC2-RS-001',
    resourceId: 'i-001',
    resourceType: 'EC2',
    title: 'Rightsize prod-api (t3.large -> t3.medium)',
    reason: 'CPU utilization at 12.0% and memory at 28.0%.',
    risk: 'LOW',
    confidence: 0.95,
    monthlySavings: 30.37,
    annualSavings: 364.44,
    implementationSteps: [
      'Schedule maintenance window.',
      'Resize instance from t3.large to t3.medium.',
      'Monitor CloudWatch metrics for 48 hours.',
      'Validate application performance.',
    ],
    category: 'QUICK_WIN',
    ruleId: 'EC2-001',
  },
  {
    id: 'EBS-OR-001',
    resourceId: 'vol-001',
    resourceType: 'EBS',
    title: 'Delete orphaned volume vol-001',
    reason: 'Volume has been unattached for 45 days.',
    risk: 'LOW',
    confidence: 0.95,
    monthlySavings: 12.00,
    annualSavings: 144.00,
    implementationSteps: [
      'Verify volume is not needed.',
      'Create snapshot if backup required.',
      'Delete the volume.',
    ],
    category: 'QUICK_WIN',
    ruleId: 'EBS-001',
  },
];

export const mockForecast: ForecastResponse = {
  model: 'Prophet',
  nextMonth: 22016.09,
  threeMonthForecast: [22016.09, 21424.58, 20400.75],
  growthRate: 7.4,
  confidenceInterval: { lower: 22011.71, upper: 22020.93 },
  seasonalityDetected: true,
  executiveSummary:
    'Cloud spending is projected to reach $22,016 next month, reflecting moderate growth of 7.4%.',
};

export const mockScore: ScoreResponse = {
  score: 35,
  category: 'Critical',
  breakdown: { compute: 90, storage: 65, reservedCapacity: 80 },
  recommendations: [
    'Terminate or rightsize 2 idle EC2 instance(s) to improve efficiency.',
    'Delete 4 orphaned EBS volume(s) to reduce storage waste.',
    'Add lifecycle policies to 4 S3 bucket(s) with inactive data.',
  ],
};

export const mockResources: ResourceCollection = {
  total: 43,
  page: 1,
  pageSize: 20,
  items: [
    {
      id: 'i-001',
      type: 'EC2',
      name: 'prod-api',
      utilization: 12,
      monthlyCost: 72.50,
      status: 'Underutilized',
      region: 'us-east-1',
      details: { instanceType: 't3.large', cpuAvg: 12, memoryAvg: 28 },
    },
    {
      id: 'data-lake-raw',
      type: 'S3',
      name: 'data-lake-raw',
      utilization: 75,
      monthlyCost: 1200.00,
      status: 'Cold',
      region: 'us-east-1',
      details: { sizeTb: 15.0, storageClass: 'STANDARD', lastAccessDays: 90 },
    },
  ],
};
```

---

## 5. Loading & Empty States

### Loading States

The upload endpoint triggers a ~25-second analytics pipeline. Design for this:

```typescript
// Upload state machine
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }         // File upload
  | { status: 'analyzing'; message: string }           // Python pipeline
  | { status: 'complete'; data: UploadResponse }
  | { status: 'error'; error: ErrorResponse };

// Recommended loading messages for the "analyzing" state
const ANALYZING_MESSAGES = [
  'Analyzing EC2 instances...',           // 0-5s
  'Scanning S3 storage patterns...',      // 5-10s
  'Evaluating EBS volumes...',            // 10-13s
  'Optimizing RDS databases...',          // 13-16s
  'Calculating savings opportunities...', // 16-19s
  'Running Prophet forecast...',          // 19-23s
  'Generating recommendations...',        // 23-25s
];
```

### Empty States (No Data Yet)

When GET endpoints return `409 NO_DATA`:

| Component | Empty State Message | Action |
|-----------|-------------------|--------|
| Dashboard | "Upload your infrastructure data to see cost insights" | Show upload CTA |
| Recommendations | "No recommendations yet. Upload data to get started." | Show upload CTA |
| Resources | "No resources detected. Upload your CSV files." | Show upload CTA |
| Forecast | "Cost forecast requires historical data. Upload to begin." | Show upload CTA |
| Score | "Your FinOps score will appear after analysis." | Show upload CTA |

### Skeleton Loading

While dashboard data loads after upload, show skeleton placeholders:

```typescript
// Duration expectations for each endpoint after upload
const LOAD_TIMES = {
  dashboard: '<50ms',      // Reads from cache
  recommendations: '<50ms', // Reads from cache
  resources: '<100ms',      // Parses CSVs
  forecast: '<50ms',        // Reads from cache
  score: '<50ms',           // Reads from cache
  report: '200-500ms',      // PDF generation
};
```

---

## 6. Error States

### Error Response Shape

Every error follows this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "issues": [
        {
          "code": "invalid_enum_value",
          "message": "Invalid enum value. Expected 'EC2' | 'S3' | 'EBS' | 'RDS', received 'INVALID'",
          "path": ["category"]
        }
      ]
    }
  }
}
```

### Error Code Reference

| HTTP | Code | When | Frontend Action |
|------|------|------|-----------------|
| `400` | `VALIDATION_ERROR` | Invalid query params or missing files | Show field-level errors |
| `404` | `NOT_FOUND` | Unknown endpoint | Show "page not found" |
| `409` | `NO_DATA` | GET endpoint called before upload | Show empty state + upload CTA |
| `502` | `ANALYTICS_ERROR` | Python pipeline failed | Show "Analysis failed, please retry" |
| `503` | `FORECAST_UNAVAILABLE` | Prophet engine failed | Show forecast unavailable message |
| `500` | `INTERNAL_ERROR` | Unexpected server error | Show generic error + support contact |

### Error Handling Helper

```typescript
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) {
    const error: ErrorResponse = await res.json();
    
    if (res.status === 409) {
      throw new NoDataError(error.error.message);
    }
    if (res.status === 400) {
      throw new ValidationError(error.error.message, error.error.details);
    }
    throw new ApiError(error.error.code, error.error.message);
  }

  return res.json();
}
```

---

## 7. Polling & Caching Strategy

### Recommended Approach: Fetch-On-Upload

```
Upload ──► Cache results on client ──► Serve from client state
```

**Do NOT poll.** Analytics results are static until the next upload. After a successful upload:

1. Fetch all endpoints **once** in parallel
2. Cache results in client state (React state, Zustand, etc.)
3. Serve all UI views from cached state
4. Only re-fetch after a new upload

```typescript
// After successful upload, fetch everything in parallel
async function loadAllData(): Promise<AppData> {
  const [dashboard, recommendations, resources, forecast, score] = 
    await Promise.all([
      apiFetch<DashboardResponse>('/api/v1/dashboard'),
      apiFetch<Recommendation[]>('/api/v1/recommendations'),
      apiFetch<ResourceCollection>('/api/v1/resources'),
      apiFetch<ForecastResponse>('/api/v1/forecast'),
      apiFetch<ScoreResponse>('/api/v1/score'),
    ]);

  return { dashboard, recommendations, resources, forecast, score };
}
```

### Client-Side Filtering

Recommendation filtering (`category`, `risk`, `impact`) can be done entirely client-side after the initial fetch to avoid additional requests:

```typescript
// Fetch all recs once, then filter client-side
const allRecs = await apiFetch<Recommendation[]>('/api/v1/recommendations');

function filterRecs(
  recs: Recommendation[],
  filters: { category?: string; risk?: string; impact?: string }
): Recommendation[] {
  return recs.filter(r => {
    if (filters.category && r.resourceType !== filters.category) return false;
    if (filters.risk && r.risk !== filters.risk) return false;
    if (filters.impact) {
      const level = r.annualSavings > 10000 ? 'HIGH' : r.annualSavings > 2000 ? 'MEDIUM' : 'LOW';
      if (level !== filters.impact) return false;
    }
    return true;
  });
}
```

### Resource Pagination

Resources require server-side pagination (reads CSVs on each request). Use page/pageSize params:

```typescript
async function loadResourcePage(type?: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  
  return apiFetch<ResourceCollection>(`/api/v1/resources?${params}`);
}
```

---

## 8. CORS Configuration

CORS is **fully open** for MVP development:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

The backend uses the `cors` npm package with default settings. **No preflight issues** — all endpoints work from any origin during development.

### Verification

```bash
# Verify CORS headers
curl -I http://localhost:3001/api/v1/dashboard

# Expected headers in response:
# Access-Control-Allow-Origin: *
```

---

## 9. Environment Variables

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `ANALYTICS_PATH` | `../analytics` | Path to Python analytics package |
| `ANALYTICS_TIMEOUT` | `120000` | Pipeline timeout (ms) |
| `LOG_LEVEL` | `info` | Winston log level |

### Frontend (.env)

```env
# Required
VITE_API_URL=http://localhost:3001

# Optional
VITE_API_TIMEOUT=30000
VITE_MOCK_DATA=false
```

### API Client Configuration

```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
const USE_MOCKS = import.meta.env.VITE_MOCK_DATA === 'true';
```

---

## 10. Frontend Onboarding Guide

### Prerequisites

1. Backend server running: `cd backend && npm run dev`
2. Node.js 22+ installed
3. Sample data available in `analytics/data/`

### Quick Start

```bash
# 1. Verify backend is running
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"cloudsight-ai-api","version":"1.0.0"}

# 2. Check data is loaded (from previous analytics run)
curl http://localhost:3001/api/v1/dashboard
# Expected: {"monthlySpend":11387.20,...}

# 3. If 409, trigger upload first:
curl -X POST http://localhost:3001/api/v1/upload \
  -F "ec2=@../analytics/data/ec2.csv" \
  -F "s3=@../analytics/data/s3.csv" \
  -F "ebs=@../analytics/data/ebs.csv" \
  -F "rds=@../analytics/data/rds.csv" \
  -F "monthlyCost=@../analytics/data/monthly_cost.csv"
```

### Recommended Frontend Stack

| Concern | Recommendation |
|---------|---------------|
| Framework | React 18+ or Next.js 14+ |
| State | Zustand or React Context |
| HTTP Client | Native `fetch` (no axios needed) |
| Charts | Recharts or Chart.js |
| Tables | TanStack Table |
| PDF Download | Native Blob + anchor download |
| Styling | Tailwind CSS or vanilla CSS |

### API Client Template

```typescript
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  health: () => fetchJson<{ status: string }>('/health'),
  upload: (files: FormData) => fetchPost<UploadResponse>('/api/v1/upload', files),
  dashboard: () => fetchJson<DashboardResponse>('/api/v1/dashboard'),
  recommendations: (params?: URLSearchParams) =>
    fetchJson<Recommendation[]>(`/api/v1/recommendations${params ? '?' + params : ''}`),
  resources: (params?: URLSearchParams) =>
    fetchJson<ResourceCollection>(`/api/v1/resources${params ? '?' + params : ''}`),
  forecast: () => fetchJson<ForecastResponse>('/api/v1/forecast'),
  score: () => fetchJson<ScoreResponse>('/api/v1/score'),
  report: () => fetchBlob('/api/v1/report'),
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err: ErrorResponse = await res.json();
    throw new Error(err.error.message);
  }
  return res.json();
}

async function fetchPost<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body });
  if (!res.ok) {
    const err: ErrorResponse = await res.json();
    throw new Error(err.error.message);
  }
  return res.json();
}

async function fetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`);
  return res.blob();
}
```

### Page-to-Endpoint Mapping

| Frontend Page | Primary Endpoint | Secondary |
|---------------|-----------------|-----------|
| Upload/Landing | `POST /upload` | — |
| Dashboard | `GET /dashboard` | `GET /score`, `GET /forecast` |
| Recommendations | `GET /recommendations` | — |
| Resource Explorer | `GET /resources` | — |
| Forecast | `GET /forecast` | — |
| FinOps Score | `GET /score` | — |
| Report Download | `GET /report` | — |

### Swagger UI

Interactive API documentation is available at:
```
http://localhost:3001/api-docs
```

---

## Appendix: Impact Level Calculation

The `impact` filter on recommendations is calculated from `annualSavings`:

| Impact Level | Annual Savings Range |
|---|---|
| `HIGH` | > $10,000 |
| `MEDIUM` | $2,000 — $10,000 |
| `LOW` | < $2,000 |

### Score Category Mapping

| Score Range | Category | Suggested Color |
|---|---|---|
| 90–100 | Excellent | `#059669` (green) |
| 70–89 | Healthy | `#2563eb` (blue) |
| 50–69 | Needs Optimization | `#d97706` (amber) |
| 0–49 | Critical | `#dc2626` (red) |

### Risk Level Colors

| Risk | Suggested Color | Badge Style |
|------|----------------|-------------|
| LOW | `#059669` (green) | Solid green badge |
| MEDIUM | `#d97706` (amber) | Solid amber badge |
| HIGH | `#dc2626` (red) | Solid red badge |
