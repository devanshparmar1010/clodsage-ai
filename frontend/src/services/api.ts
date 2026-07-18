import type {
  ChatResponse,
  DashboardResponse,
  Recommendation,
  ResourceCollection,
  ForecastResponse,
  ScoreResponse,
  UploadResponse,
  ErrorResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.message || body.error?.message || res.statusText;
    const code = body.error?.code || (res.status === 400 && body.message ? 'AWS_CREDENTIALS_MISSING' : 'NETWORK_ERROR');
    throw new ApiError(code, message, res.status);
  }
  return res.json();
}

export const api = {
  health: () => fetchJson<{ status: string }>('/health'),

  upload: async (files: FormData): Promise<UploadResponse> => {
    const res = await fetch(`${API_BASE}/api/v1/upload`, { method: 'POST', body: files });
    if (!res.ok) {
      const body: ErrorResponse = await res.json();
      throw new ApiError(body.error.code, body.error.message, res.status);
    }
    return res.json();
  },

  dashboard: () => fetchJson<DashboardResponse>('/api/v1/dashboard'),

  refreshAWS: () => fetchJson<{ success: boolean; lastSynced: string }>('/api/v1/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }),

  recommendations: (params?: URLSearchParams) =>
    fetchJson<Recommendation[]>(`/api/v1/recommendations${params ? '?' + params : ''}`),

  resources: (params?: URLSearchParams) =>
    fetchJson<ResourceCollection>(`/api/v1/resources${params ? '?' + params : ''}`),

  forecast: () => fetchJson<ForecastResponse>('/api/v1/forecast'),

  score: () => fetchJson<ScoreResponse>('/api/v1/score'),

  chat: (message: string, isLive?: boolean) =>
    fetchJson<ChatResponse>('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, isLive }),
    }),

  report: async (): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/api/v1/report`);
    if (!res.ok) throw new Error('Failed to download report');
    return res.blob();
  },

  awsDashboard: () => fetchJson<{
    total_ec2: number;
    running_ec2: number;
    stopped_ec2: number;
    total_s3: number;
    total_rds: number;
    total_ebs: number;
    monthly_cost: number;
    aws_account: { accountId: string; accountName: string };
  }>('/api/aws/dashboard'),

  awsRecommendations: () => fetchJson<any[]>('/api/aws/recommendations'),

  awsEC2: () => fetchJson<any>('/api/aws/ec2'),
  awsS3: () => fetchJson<any>('/api/aws/s3'),
  awsEBS: () => fetchJson<any>('/api/aws/ebs'),
  awsRDS: () => fetchJson<any>('/api/aws/rds'),
  awsForecast: () => fetchJson<ForecastResponse>('/api/aws/forecast'),

  awsDashboardWrapper: async (): Promise<DashboardResponse & { awsMetrics: any }> => {
    const awsData = await api.awsDashboard();
    const recs = await api.awsRecommendations();

    let potentialSavings = 0;
    recs.forEach((r: any) => {
      const match = r.estimatedSaving.match(/\$?([0-9.]+)/);
      if (match) {
        potentialSavings += parseFloat(match[1]);
      }
    });

    const monthlySpend = awsData.monthly_cost || 0.0;
    const savingsPercentage = monthlySpend > 0 ? (potentialSavings / monthlySpend) * 100 : 0;
    const scoreVal = Math.max(30, 100 - recs.length * 10);

    return {
      monthlySpend,
      potentialSavings,
      savingsPercentage,
      finOpsScore: scoreVal,
      forecastedSpend: monthlySpend * 1.02,
      awsMetrics: awsData,
      aws_account: awsData.aws_account
    };
  },

  awsRecommendationsWrapper: async (): Promise<Recommendation[]> => {
    const rawRecs = await api.awsRecommendations();
    const riskMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      'Low': 'LOW', 'Medium': 'MEDIUM', 'High': 'HIGH',
      'LOW': 'LOW', 'MEDIUM': 'MEDIUM', 'HIGH': 'HIGH'
    };

    return rawRecs.map((r: any, i: number) => {
      const savingMatch = r.estimatedSaving.match(/\$?([0-9.]+)/);
      const monthlySavings = savingMatch ? parseFloat(savingMatch[1]) : 0;
      const riskVal = riskMap[r.severity] || 'MEDIUM';

      return {
        id: `AWS-REC-${i + 1}`,
        resourceId: r.resource,
        resourceType: (r.service || 'EC2').toUpperCase() as any,
        title: r.recommendation,
        reason: `${r.service} resource ${r.resource} has optimization potential: ${r.recommendation}`,
        risk: riskVal,
        confidence: 0.95,
        monthlySavings: monthlySavings,
        annualSavings: monthlySavings * 12,
        implementationSteps: [
          `Review the utilization of ${r.service} resource ${r.resource}`,
          `Execute optimization step: ${r.recommendation}`,
          `Verify cost reductions in the next billing cycle`
        ],
        executiveExplanation: `${r.service} resource ${r.resource} is recommended for optimization to save ${r.estimatedSaving}.`,
        category: riskVal === 'HIGH' ? 'HIGH_IMPACT' : 'QUICK_WIN'
      };
    });
  },

  awsResourcesWrapper: async (params?: URLSearchParams): Promise<ResourceCollection> => {
    const typeFilter = params?.get('type') || 'All';
    const page = parseInt(params?.get('page') || '1', 10);
    const pageSize = parseInt(params?.get('pageSize') || '20', 10);

    const promises: Promise<Resource[]>[] = [];
    const typesToFetch = typeFilter === 'All' ? ['EC2', 'S3', 'EBS', 'RDS'] : [typeFilter];

    if (typesToFetch.includes('EC2')) {
      promises.push(
        api.awsEC2().then((res: any) =>
          (res.instances || []).map((inst: any) => ({
            id: inst.instanceId,
            type: 'EC2' as const,
            name: inst.instanceId,
            utilization: inst.state === 'running' ? 24.5 : 0.0,
            monthlyCost: inst.instanceType.includes('micro') ? 8.5 : inst.instanceType.includes('small') ? 16.2 : 32.4,
            status: inst.state === 'running' ? 'Active' as const : 'Idle' as const,
            region: inst.availabilityZone ? inst.availabilityZone.slice(0, -1) : 'ap-south-1',
            details: inst
          }))
        ).catch(() => [])
      );
    }

    if (typesToFetch.includes('S3')) {
      promises.push(
        api.awsS3().then((res: any) =>
          (res.buckets || []).map((b: any) => ({
            id: b.bucketName,
            type: 'S3' as const,
            name: b.bucketName,
            utilization: 80.0,
            monthlyCost: 12.30,
            status: 'Active' as const,
            region: b.region,
            details: b
          }))
        ).catch(() => [])
      );
    }

    if (typesToFetch.includes('EBS')) {
      promises.push(
        api.awsEBS().then((res: any) =>
          (res.volumes || []).map((v: any) => ({
            id: v.volumeId,
            type: 'EBS' as const,
            name: v.volumeId,
            utilization: v.attachedInstance ? 40.0 : 0.0,
            monthlyCost: Math.round(v.size * 0.10),
            status: v.attachedInstance ? 'Active' as const : 'Orphaned' as const,
            region: 'ap-south-1',
            details: v
          }))
        ).catch(() => [])
      );
    }

    if (typesToFetch.includes('RDS')) {
      promises.push(
        api.awsRDS().then((res: any) =>
          (res.dbInstances || []).map((db: any) => ({
            id: db.dbIdentifier,
            type: 'RDS' as const,
            name: db.dbIdentifier,
            utilization: db.status === 'available' ? 35.0 : 0.0,
            monthlyCost: Math.round(db.allocatedStorage * 0.15),
            status: db.status === 'available' ? 'Active' as const : 'Moderate' as const,
            region: 'ap-south-1',
            details: db
          }))
        ).catch(() => [])
      );
    }

    const fetchedLists = await Promise.all(promises);
    const allResources = fetchedLists.flat();

    const total = allResources.length;
    const startIndex = (page - 1) * pageSize;
    const items = allResources.slice(startIndex, startIndex + pageSize);

    return { total, page, pageSize, items };
  },
};

export { ApiError };
