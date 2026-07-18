import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/layout/PageHeader';
import { RecommendationCard } from '../components/recommendations/RecommendationCard';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { useRecommendations } from '../hooks/useAnalytics';
import { cn } from '../lib/utils';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'QUICK_WIN', label: 'Quick Wins' },
  { key: 'HIGH_IMPACT', label: 'High Impact' },
  { key: 'STRATEGIC', label: 'Strategic' },
] as const;

const SERVICES = ['All', 'EC2', 'S3', 'EBS', 'RDS'] as const;
const RISKS = ['All', 'LOW', 'MEDIUM', 'HIGH'] as const;

export default function RecommendationsPage() {
  const { data, isLoading, isError, error, refetch } = useRecommendations();
  const [tab, setTab] = useState<string>('all');
  const [service, setService] = useState<string>('All');
  const [risk, setRisk] = useState<string>('All');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      if (tab !== 'all' && r.category !== tab) return false;
      if (service !== 'All' && r.resourceType !== service) return false;
      if (risk !== 'All' && r.risk !== risk) return false;
      return true;
    });
  }, [data, tab, service, risk]);

  if (isLoading) return <LoadingState />;
  if (error?.message?.includes('No analytics data'))
    return <EmptyState title="No Recommendations" message="Upload data to generate optimization recommendations." />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Recommendations"
        description={`${data?.length || 0} optimization opportunities identified`}
      />

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
              tab === t.key ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Service:</span>
          <div className="flex gap-1">
            {SERVICES.map((s) => (
              <button
                key={s}
                onClick={() => setService(s)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md transition-colors border',
                  service === s ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Risk:</span>
          <div className="flex gap-1">
            {RISKS.map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md transition-colors border',
                  risk === r ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <motion.div layout className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500 py-10 text-center">No recommendations match the selected filters.</p>
        ) : (
          filtered.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
        )}
      </motion.div>
    </>
  );
}
