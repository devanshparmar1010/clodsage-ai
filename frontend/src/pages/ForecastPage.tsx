import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Eye, Calendar, BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { useForecast } from '../hooks/useAnalytics';
import { formatCurrency, formatPercent, getScoreColor } from '../lib/utils';

export default function ForecastPage() {
  const { data, isLoading, isError, error, refetch } = useForecast();

  if (isLoading) return <LoadingState />;
  if (error?.message?.includes('No analytics data'))
    return <EmptyState title="No Forecast Data" message="Upload historical cost data to generate Prophet forecasts." />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data) return null;

  const chartData = [
    { month: 'Month 1', spend: data.threeMonthForecast[0], lower: data.confidenceInterval.lower, upper: data.confidenceInterval.upper },
    { month: 'Month 2', spend: data.threeMonthForecast[1], lower: data.confidenceInterval.lower * 0.98, upper: data.confidenceInterval.upper * 1.01 },
    { month: 'Month 3', spend: data.threeMonthForecast[2], lower: data.confidenceInterval.lower * 0.96, upper: data.confidenceInterval.upper * 1.02 },
  ];

  const isGrowing = data.growthRate > 0;
  const TrendIcon = isGrowing ? TrendingUp : TrendingDown;
  const trendColor = isGrowing ? '#f59e0b' : '#059669';

  return (
    <>
      <PageHeader
        title="Cost Forecast"
        description="Prophet-powered cost projections with confidence intervals"
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400">
            <Activity className="h-3 w-3" />
            Powered by Meta Prophet
          </span>
        }
      />

      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Next Month', value: formatCurrency(data.nextMonth), icon: Calendar, color: 'text-blue-400' },
            { label: 'Growth Rate', value: formatPercent(data.growthRate), icon: TrendIcon, color: isGrowing ? 'text-amber-400' : 'text-emerald-400' },
            { label: 'Seasonality', value: data.seasonalityDetected ? 'Detected' : 'None', icon: BarChart3, color: data.seasonalityDetected ? 'text-violet-400' : 'text-zinc-400' },
            { label: 'Confidence Range', value: `${formatCurrency(data.confidenceInterval.lower)} - ${formatCurrency(data.confidenceInterval.upper)}`, icon: Eye, color: 'text-cyan-400' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <card.icon className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className={`text-xl font-semibold ${card.color}`}>{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Forecast chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Three-Month Forecast</h3>
          <p className="text-xs text-zinc-600 mb-6">Projected cloud spend with confidence intervals</p>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#09090b" />
              <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2.5} fill="url(#forecastGrad)" dot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#18181b' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Executive summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Executive Summary</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{data.executiveSummary}</p>
        </motion.div>
      </div>
    </>
  );
}
