import React from 'react';

export default function PatientProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Profile Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* Profile Details & Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-96 bg-slate-200/80 rounded-2xl" />
        <div className="lg:col-span-2 space-y-4">
          <div className="h-12 bg-slate-200/80 rounded-xl" />
          <div className="h-80 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
