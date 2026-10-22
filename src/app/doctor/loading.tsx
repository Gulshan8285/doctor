import React from 'react';

export default function DoctorLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Profile Skeleton */}
      <div className="h-32 bg-slate-200/80 rounded-2xl w-full" />

      {/* KPI Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200/80 rounded-2xl" />
        ))}
      </div>

      {/* Patients Card Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-slate-200/70 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
