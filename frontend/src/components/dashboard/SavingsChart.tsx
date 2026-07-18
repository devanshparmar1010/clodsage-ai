import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Recommendation } from '../../types';
import { formatCurrency } from '../../lib/utils';

const SERVICE_COLORS: Record<string, string> = {
  EC2: '#3b82f6',
  S3: '#8b5cf6',
  EBS: '#06b6d4',
  RDS: '#f59e0b',
};

export function SavingsChart({ recommendations }: { recommendations: Recommendation[] }) {
  const byService: Record<string, number> = {};
  for (const rec of recommendations) {
    byService[rec.resourceType] = (byService[rec.resourceType] || 0) + rec.annualSavings;
  }

  const chartData = Object.entries(byService)
    .map(([service, savings]) => ({ service, savings }))
    .sort((a, b) => b.savings - a.savings);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
    >
      <h3 className="text-sm font-medium text-zinc-400 mb-1">Savings by Service</h3>
      <p className="text-xs text-zinc-600 mb-6">Annual savings opportunity breakdown</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="service" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
            formatter={(val: number) => [formatCurrency(val), 'Annual Savings']}
          />
          <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.service} fill={SERVICE_COLORS[entry.service] || '#71717a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
