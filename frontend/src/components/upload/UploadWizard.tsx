import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUpload } from '../../hooks/useAnalytics';
import { DropZone } from './DropZone';

const ANALYZING_MESSAGES = [
  'Analyzing EC2 instances...',
  'Scanning S3 storage patterns...',
  'Evaluating EBS volumes...',
  'Optimizing RDS databases...',
  'Calculating savings opportunities...',
  'Running Prophet forecast...',
  'Generating recommendations...',
];

export function UploadWizard() {
  const navigate = useNavigate();
  const upload = useUpload();
  const [files, setFiles] = useState<Record<string, File | null>>({
    ec2: null, s3: null, ebs: null, rds: null, monthlyCost: null,
  });
  const [msgIdx, setMsgIdx] = useState(0);

  const allReady = Object.values(files).every((f) => f !== null);

  const handleUpload = async () => {
    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    // Rotate analyzing messages
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % ANALYZING_MESSAGES.length);
    }, 3500);

    try {
      await upload.mutateAsync(formData);
      clearInterval(interval);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch {
      clearInterval(interval);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {upload.isIdle && (
          <motion.div key="dropzone" exit={{ opacity: 0, y: -20 }}>
            <DropZone files={files} onFilesChange={setFiles} />
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!allReady}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analyze Infrastructure
              </button>
            </div>
          </motion.div>
        )}

        {upload.isPending && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16"
          >
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-6" />
            <p className="text-lg font-medium text-zinc-200 mb-2">
              Analyzing your infrastructure
            </p>
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-zinc-500"
            >
              {ANALYZING_MESSAGES[msgIdx]}
            </motion.p>
          </motion.div>
        )}

        {upload.isSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-16"
          >
            <div className="rounded-full bg-emerald-500/10 p-5 mb-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-zinc-100 mb-1">Analysis Complete</p>
            <p className="text-sm text-zinc-500 mb-1">
              {upload.data.resourcesDetected} resources detected
            </p>
            <p className="text-xs text-zinc-600">Redirecting to dashboard...</p>
          </motion.div>
        )}

        {upload.isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16"
          >
            <div className="rounded-full bg-red-500/10 p-5 mb-6">
              <AlertTriangle className="h-12 w-12 text-red-400" />
            </div>
            <p className="text-lg font-semibold text-zinc-100 mb-2">Analysis Failed</p>
            <p className="text-sm text-zinc-500 mb-4">{upload.error?.message}</p>
            <button
              onClick={() => upload.reset()}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors border border-zinc-700"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
