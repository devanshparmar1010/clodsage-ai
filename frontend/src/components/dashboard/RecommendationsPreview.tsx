import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyFull, getRiskBg, cn } from '../../lib/utils';
import type { Recommendation } from '../../types';

export function RecommendationsPreview({ recommendations }: { recommendations: Recommendation[] }) {
  const navigate = useNavigate();
  const top5 = recommendations.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-400">Top Recommendations</h3>
        <button
          onClick={() => navigate('/recommendations')}
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-3">
        {top5.map((rec, i) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="flex items-center gap-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-3 hover:border-zinc-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{rec.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{rec.resourceType} • {rec.resourceId}</p>
            </div>
            <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border', getRiskBg(rec.risk))}>
              {rec.risk}
            </span>
            <span className="shrink-0 text-sm font-medium text-emerald-400">
              {formatCurrencyFull(rec.annualSavings)}/yr
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
