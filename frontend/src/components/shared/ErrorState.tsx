import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="rounded-full bg-red-500/10 p-6 mb-6">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">Something went wrong</h3>
      <p className="text-sm text-zinc-500 max-w-md mb-6">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors border border-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </motion.div>
  );
}
