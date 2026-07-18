import { motion } from 'framer-motion';
import { getScoreColor } from '../../lib/utils';
import type { ScoreResponse } from '../../types';

export function FinOpsScoreCard({ data }: { data: ScoreResponse }) {
  const color = getScoreColor(data.score);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (data.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6"
    >
      <h3 className="text-sm font-medium text-zinc-400 mb-6">FinOps Health Score</h3>

      <div className="flex items-center gap-8">
        {/* Score ring */}
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
            <motion.circle
              cx="70" cy="70" r={radius}
              fill="none" stroke={color} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>{data.score}</span>
            <span className="text-xs text-zinc-500">{data.category}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          {Object.entries(data.breakdown).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-zinc-400 capitalize">
                  {key === 'reservedCapacity' ? 'Reserved Capacity' : key}
                </span>
                <span className="text-xs font-medium text-zinc-300">{val}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: getScoreColor(val) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <p className="text-xs font-medium text-zinc-400 mb-2">Improvements</p>
          <ul className="space-y-1.5">
            {data.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-zinc-500 flex gap-2">
                <span className="text-zinc-600">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
