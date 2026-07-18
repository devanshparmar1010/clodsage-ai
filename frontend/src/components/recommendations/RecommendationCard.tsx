import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrencyFull, getRiskBg, cn } from '../../lib/utils';
import type { Recommendation } from '../../types';

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">{rec.id}</span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', getRiskBg(rec.risk))}>
              {rec.risk}
            </span>
            {rec.category && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {rec.category?.replace('_', ' ')}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-zinc-100">{rec.title}</h4>
          <p className="text-xs text-zinc-500 mt-1">{rec.reason}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold text-emerald-400">{formatCurrencyFull(rec.annualSavings)}</p>
          <p className="text-xs text-zinc-500">/year</p>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-zinc-800/50">
        <div>
          <span className="text-xs text-zinc-500">Confidence</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-20 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${rec.confidence * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-zinc-300">{(rec.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Monthly</span>
          <p className="text-sm font-medium text-zinc-300 mt-0.5">{formatCurrencyFull(rec.monthlySavings)}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Service</span>
          <p className="text-sm font-medium text-zinc-300 mt-0.5">{rec.resourceType}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          {expanded ? 'Less' : 'Details'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-zinc-800/50 space-y-3">
              {rec.executiveExplanation && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">Executive Summary</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{rec.executiveExplanation}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-2">Implementation Steps</p>
                <ol className="space-y-1.5">
                  {rec.implementationSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-zinc-500">
                      <span className="text-zinc-600 font-mono shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
