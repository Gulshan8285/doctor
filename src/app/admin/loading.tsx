import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 bg-slate-200/80 rounded-2xl w-full" />

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200/80 rounded-2xl" />
        ))}
      </div>

      {/* Main Table / Grid Skeleton */}
      <div className="h-96 bg-slate-200/70 rounded-2xl w-full" />
    </div>
  );
}
