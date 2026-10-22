'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Calendar,
  Users,
  Eye,
  FileText,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

export default function AdvancedSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      let startDate = '';
      let endDate = '';
      const now = new Date();

      if (dateFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      } else if (dateFilter === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        startDate = new Date(y.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date(y.setHours(23, 59, 59, 999)).toISOString();
      } else if (dateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (dateFilter === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      } else if (dateFilter === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateFilter === 'custom') {
        if (customStart) startDate = new Date(customStart).toISOString();
        if (customEnd) endDate = new Date(customEnd).toISOString();
      }

      const params = new URLSearchParams();
      if (query.trim()) params.append('search', query.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.patients) {
        setResults(data.patients);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, dateFilter, customStart, customEnd]);

  // Debounced search on query or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 350);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const handleReset = () => {
    setQuery('');
    setDateFilter('all');
    setCustomStart('');
    setCustomEnd('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Advanced Patient & Record Search
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perform high-speed indexed search across patient demographics, phone numbers, emails, and
          time horizons.
        </p>
      </div>

      {/* Filter and Query Controls */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient name, phone number (+91...), email, or Patient ID (PAT-...)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Quick Date Horizon Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Horizon:
            </span>
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7days', label: 'Last 7 Days' },
              { key: '30days', label: 'Last 30 Days' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'custom', label: 'Custom Range' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  dateFilter === f.key
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}

            {(query || dateFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs ml-auto"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Matching Records ({results.length})</CardTitle>
            {isLoading && (
              <span className="text-xs text-teal-600 animate-pulse font-medium">
                Searching database...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Search}
                title="No Matching Records"
                description={
                  hasSearched
                    ? 'No patient records matched the specified query and date filters.'
                    : 'Enter keywords or apply date filters to find patient files.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Patient Code</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4 text-center">Prescriptions</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((pat) => (
                    <tr
                      key={pat.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/doctor/patients/${pat.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                        {pat.patientCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {pat.fullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {pat.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {pat.email || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(pat.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={pat.documentCount > 0 ? 'teal' : 'slate'}>
                          {pat.documentCount} docs
                        </Badge>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/doctor/patients/${pat.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Open Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
