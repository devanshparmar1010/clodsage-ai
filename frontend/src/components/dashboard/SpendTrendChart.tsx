import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { ForecastResponse } from '../../types';
import { formatCurrency } from '../../lib/utils';

export function SpendTrendChart({ data }: { data: ForecastResponse }) {
  const months = ['Current', 'Month 1', 'Month 2', 'Month 3'];
  const chartData = [
    { month: months[0], spend: data.nextMonth - (data.nextMonth * data.growthRate / 100), lower: null, upper: null },
    { month: months[1], spend: data.threeMonthForecast[0], lower: data.confidenceInterval.lower, upper: data.confidenceInterval.upper },
    { month: months[2], spend: data.threeMonthForecast[1], lower: data.confidenceInterval.lower * 0.98, upper: data.confidenceInterval.upper * 1.01 },
    { month: months[3], spend: data.threeMonthForecast[2], lower: data.confidenceInterval.lower * 0.96, upper: data.confidenceInterval.upper * 1.02 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-zinc-400">Cost Forecast</h3>
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
          Powered by Meta Prophet
        </span>
      </div>
      <p className="text-xs text-zinc-600 mb-6">Three-month projection with confidence intervals</p>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(val: number) => [formatCurrency(val), 'Spend']}
          />
          <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGrad)" dot={{ fill: '#3b82f6', r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
