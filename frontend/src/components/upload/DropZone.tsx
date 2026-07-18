import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCheck, AlertCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const REQUIRED_FILES = [
  { key: 'ec2', label: 'EC2 Instances', description: 'ec2.csv' },
  { key: 's3', label: 'S3 Buckets', description: 's3.csv' },
  { key: 'ebs', label: 'EBS Volumes', description: 'ebs.csv' },
  { key: 'rds', label: 'RDS Databases', description: 'rds.csv' },
  { key: 'monthlyCost', label: 'Monthly Costs', description: 'monthly_cost.csv' },
] as const;

interface DropZoneProps {
  files: Record<string, File | null>;
  onFilesChange: (files: Record<string, File | null>) => void;
}

export function DropZone({ files, onFilesChange }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      const updated = { ...files };

      for (const file of droppedFiles) {
        const name = file.name.toLowerCase();
        if (name.includes('ec2')) updated.ec2 = file;
        else if (name.includes('s3')) updated.s3 = file;
        else if (name.includes('ebs')) updated.ebs = file;
        else if (name.includes('rds')) updated.rds = file;
        else if (name.includes('monthly') || name.includes('cost')) updated.monthlyCost = file;
      }
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const handleFileSelect = (key: string, file: File | null) => {
    onFilesChange({ ...files, [key]: file });
  };

  const allFilesReady = REQUIRED_FILES.every((f) => files[f.key] !== null);

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
          dragOver
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
        )}
      >
        <Upload className={cn('mx-auto h-10 w-10 mb-4', dragOver ? 'text-blue-400' : 'text-zinc-500')} />
        <p className="text-sm font-medium text-zinc-300">
          Drop your CSV files here, or browse below
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Supports ec2.csv, s3.csv, ebs.csv, rds.csv, monthly_cost.csv
        </p>
      </div>

      {/* File slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REQUIRED_FILES.map((req) => {
          const file = files[req.key];
          return (
            <motion.div
              key={req.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'relative flex items-center gap-3 rounded-lg border p-3 transition-colors',
                file
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-zinc-800 bg-zinc-900/50'
              )}
            >
              {file ? (
                <FileCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-zinc-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {file ? file.name : req.label}
                </p>
                <p className="text-xs text-zinc-500">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : req.description}
                </p>
              </div>
              {file ? (
                <button
                  onClick={() => handleFileSelect(req.key, null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <label className="shrink-0 cursor-pointer text-xs font-medium text-blue-400 hover:text-blue-300">
                  Browse
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(e) => handleFileSelect(req.key, e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </motion.div>
          );
        })}
      </div>

      {allFilesReady && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2"
        >
          <FileCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">All 5 datasets ready for analysis</span>
        </motion.div>
      )}
    </div>
  );
}
