import { motion } from 'framer-motion';
import { CloudOff, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmptyState({ title, message }: { title?: string; message?: string }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="rounded-full bg-zinc-800/50 p-6 mb-6">
        <CloudOff className="h-10 w-10 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">
        {title || 'No Data Available'}
      </h3>
      <p className="text-sm text-zinc-500 max-w-md mb-6">
        {message || 'Upload your infrastructure datasets to generate insights, recommendations, and forecasts.'}
      </p>
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Upload className="h-4 w-4" />
        Upload Data
      </button>
    </motion.div>
  );
}
