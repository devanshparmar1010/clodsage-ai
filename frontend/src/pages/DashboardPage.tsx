import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { SpendTrendChart } from '../components/dashboard/SpendTrendChart';
import { SavingsChart } from '../components/dashboard/SavingsChart';
import { FinOpsScoreCard } from '../components/dashboard/FinOpsScoreCard';
import { RecommendationsPreview } from '../components/dashboard/RecommendationsPreview';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { useDashboard, useRecommendations, useForecast, useScore } from '../hooks/useAnalytics';
import { api } from '../services/api';

export default function DashboardPage() {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');

  const dashboard = useDashboard();
  const recommendations = useRecommendations();
  const forecast = useForecast();
  const score = useScore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    return localStorage.getItem('cloudsight_aws_last_synced');
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.refreshAWS();
      if (res && res.success) {
        setLastSynced(res.lastSynced);
        localStorage.setItem('cloudsight_aws_last_synced', res.lastSynced);
      }
      // Refetch all active queries to load the new data
      await Promise.all([
        dashboard.refetch(),
        recommendations.refetch(),
        forecast.refetch(),
        score.refetch()
      ]);
    } catch (err: any) {
      alert(`Refresh failed: ${err.message || err}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (dashboard.isLoading) return <LoadingState />;
  if (dashboard.error?.message?.includes('No data available'))
    return <EmptyState title="No Data Yet" message="Configure your AWS credentials to see the executive dashboard." />;
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} onRetry={() => dashboard.refetch()} />;
  if (!dashboard.data) return null;

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Cloud infrastructure cost intelligence overview"
        actions={
          isLive ? (
            <div className="flex items-center gap-3">
              {lastSynced && (
                <span className="text-xs text-zinc-500 font-medium bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-md">
                  Last Synced: {lastSynced}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                {isRefreshing ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500 border-t-zinc-100 rounded-full" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
                  </svg>
                )}
                {isRefreshing ? 'Syncing...' : 'Refresh AWS Data'}
              </button>
            </div>
          ) : undefined
        }
      />
      {dashboard.data.aws_account && (
        <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>AWS Account User: <strong className="text-zinc-200">{dashboard.data.aws_account.accountName}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Account ID: {dashboard.data.aws_account.accountId}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      )}
      <div className="space-y-6">
        <SummaryCards data={dashboard.data} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {forecast.data && <SpendTrendChart data={forecast.data} />}
          {recommendations.data && <SavingsChart recommendations={recommendations.data} />}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {score.data && <FinOpsScoreCard data={score.data} />}
          {recommendations.data && <RecommendationsPreview recommendations={recommendations.data} />}
        </div>
      </div>
    </>
  );
}
