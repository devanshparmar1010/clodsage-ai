import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { useResources } from '../hooks/useAnalytics';
import { cn, formatCurrencyFull, getStatusBg } from '../lib/utils';

const TYPES = ['All', 'EC2', 'S3', 'EBS', 'RDS'] as const;

export default function ResourcesPage() {
  const [type, setType] = useState<string>('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const params = new URLSearchParams();
  if (type !== 'All') params.set('type', type);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const { data, isLoading, isError, error, refetch } = useResources(params);

  if (isLoading) return <LoadingState />;
  if (error?.message?.includes('No analytics data'))
    return <EmptyState title="No Resources" message="Upload data to explore your cloud infrastructure." />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data) return null;

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <>
      <PageHeader title="Resource Explorer" description={`${data.total} resources across your infrastructure`} />

      {/* Type tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1); }}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
              type === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Resource</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Utilization</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cost/mo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((res, i) => (
              <motion.tr
                key={res.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200">{res.name || res.id}</p>
                  <p className="text-xs text-zinc-500">{res.id}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{res.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getStatusBg(res.status))}>
                    {res.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(res.utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{res.utilization}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrencyFull(res.monthlyCost)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-zinc-500">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of {data.total}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
