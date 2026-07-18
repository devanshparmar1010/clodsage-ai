import { motion } from 'framer-motion';
import { DollarSign, PiggyBank, Percent, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent, getScoreColor } from '../../lib/utils';
import type { DashboardResponse } from '../../types';
import { useEffect, useState } from 'react';

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1.2 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = value >= 100
    ? `${prefix}${Math.round(display).toLocaleString()}${suffix}`
    : `${prefix}${display.toFixed(1)}${suffix}`;

  return <span>{formatted}</span>;
}

const CARDS = [
  { key: 'monthlySpend', label: 'Monthly Spend', icon: DollarSign, prefix: '$', color: 'text-zinc-100' },
  { key: 'potentialSavings', label: 'Potential Savings', icon: PiggyBank, prefix: '$', color: 'text-emerald-400' },
  { key: 'savingsPercentage', label: 'Savings %', icon: Percent, suffix: '%', color: 'text-emerald-400' },
  { key: 'finOpsScore', label: 'FinOps Score', icon: Activity, suffix: '/100', color: 'dynamic' },
  { key: 'forecastedSpend', label: 'Forecasted Spend', icon: TrendingUp, prefix: '$', color: 'text-amber-400' },
] as const;

export function SummaryCards({ data }: { data: DashboardResponse }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {CARDS.map((card, i) => {
        const value = data[card.key];
        const textColor = card.color === 'dynamic' ? '' : card.color;
        const scoreColor = card.key === 'finOpsScore' ? getScoreColor(value) : undefined;

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <p
              className="text-2xl font-semibold tracking-tight"
              style={scoreColor ? { color: scoreColor } : undefined}
            >
              <span className={textColor}>
                <AnimatedCounter
                  value={value}
                  prefix={card.prefix || ''}
                  suffix={card.suffix || ''}
                />
              </span>
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
