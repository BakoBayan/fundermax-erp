'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/90 dark:bg-slate-700/60 rounded-md ${className}`}
      {...props}
    />
  );
};

export const KpiCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-40 rounded-xl my-2" />
      <Skeleton className="h-3 w-24 rounded" />
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 4, columns = 6 }) => {
  return (
    <div className="w-full space-y-2 py-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 py-2 px-3 border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-4 rounded ${c === 0 ? 'w-1/3' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

