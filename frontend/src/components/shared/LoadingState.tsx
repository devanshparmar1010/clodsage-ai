import { cn } from '../../lib/utils';

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
            <div className="h-8 w-28 bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-16 bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="h-4 w-32 bg-zinc-800 rounded mb-6" />
            <div className="h-48 bg-zinc-800/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
