import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import type { UploadResponse } from '../types';

export function useDashboard() {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  return useQuery({
    queryKey: ['dashboard', isLive],
    queryFn: isLive ? api.awsDashboardWrapper : api.dashboard,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRecommendations(params?: URLSearchParams) {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  return useQuery({
    queryKey: ['recommendations', isLive, params?.toString()],
    queryFn: isLive ? api.awsRecommendationsWrapper : () => api.recommendations(params),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useResources(params?: URLSearchParams) {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  return useQuery({
    queryKey: ['resources', isLive, params?.toString()],
    queryFn: isLive ? () => api.awsResourcesWrapper(params) : () => api.resources(params),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useForecast() {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  return useQuery({
    queryKey: ['forecast', isLive],
    queryFn: isLive ? api.awsForecast : api.forecast,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useScore() {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  const dashboard = useDashboard();
  return useQuery({
    queryKey: ['score', isLive, dashboard.data?.finOpsScore],
    queryFn: isLive ? async () => {
      const scoreVal = dashboard.data?.finOpsScore || 85;
      const category = scoreVal >= 90 ? 'Excellent' : scoreVal >= 75 ? 'Healthy' : scoreVal >= 50 ? 'Needs Optimization' : 'Critical';
      return {
        score: scoreVal,
        category,
        breakdown: { compute: scoreVal - 5, storage: scoreVal + 2, reservedCapacity: 75 },
        recommendations: ['Review EC2 idle instances', 'Delete unattached EBS volumes']
      };
    } : api.score,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, Error, FormData>({
    mutationFn: api.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      queryClient.invalidateQueries({ queryKey: ['score'] });
    },
  });
}

export function useReportDownload() {
  return useMutation({
    mutationFn: async () => {
      const blob = await api.report();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CloudSight_AI_Report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
