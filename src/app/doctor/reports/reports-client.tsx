'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  FileCheck2,
  PieChart,
  ShieldAlert,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface ReportsClientProps {
  summary: {
    totalPatients: number;
    totalDocs: number;
    monthDocs: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  recentUploads: Array<{
    id: string;
    title: string;
    category: string;
    patientName: string;
    patientCode: string;
    uploaderName: string;
    createdAt: string;
  }>;
}

export default function ReportsClient({
  summary,
  categoryBreakdown,
  recentUploads,
}: ReportsClientProps) {
  const { toast } = useToast();

  const [confirmExportType, setConfirmExportType] = useState<'patients' | 'prescriptions' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'patients' | 'prescriptions') => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        toast({ title: 'Export Failed', description: 'Failed to generate export file.', type: 'error' });
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctorcare-${type}-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Generated',
        description: `Downloaded ${type} CSV. Audit log recorded.`,
        type: 'success',
      });
      setConfirmExportType(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to process export download', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Clinical Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Operational summaries of consultations, prescription volumes, and export archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={() => setConfirmExportType('patients')}
          >
            Export Patients CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => setConfirmExportType('prescriptions')}
          >
            Export Prescriptions CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Patients
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.totalPatients}
              </h3>
              <p className="text-[11px] text-teal-600 font-medium mt-1">Under Active Care</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Prescriptions
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.totalDocs}
              </h3>
              <p className="text-[11px] text-sky-600 font-medium mt-1">Cryptographically Sealed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Uploads This Month
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.monthDocs}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Active Cycle</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown & Document History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Document Category Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No documents recorded.</p>
            ) : (
              categoryBreakdown.map((cat) => {
                const percentage =
                  summary.totalDocs > 0
                    ? Math.round((cat.count / summary.totalDocs) * 100)
                    : 0;
                return (
                  <div key={cat.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{cat.category.replace(/_/g, ' ')}</span>
                      <span>
                        {cat.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Upload History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentUploads.length === 0 ? (
              <p className="p-6 text-xs text-slate-400 text-center">No uploads recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {recentUploads.map((u) => (
                  <div key={u.id} className="p-3.5 text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate max-w-xs block">
                        {u.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(u.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>
                        Patient: <strong>{u.patientName}</strong> ({u.patientCode})
                      </span>
                      <span>&bull;</span>
                      <span>By: {u.uploaderName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Confirmation Modal */}
      {confirmExportType && (
        <Modal
          isOpen={Boolean(confirmExportType)}
          onClose={() => setConfirmExportType(null)}
          title={`Confirm ${confirmExportType.toUpperCase()} Export`}
          description="Operational data exports are sanitized to prevent CSV injection and logged in the immutable audit trail."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Patient Data Privacy Notice</span>
              </div>
              <p>
                Downloaded files contain patient identifiers. Please ensure this file is handled
                according to applicable confidentiality guidelines.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setConfirmExportType(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isExporting}
                onClick={() => handleExport(confirmExportType)}
              >
                Confirm & Download CSV
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
