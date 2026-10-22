'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Eye,
  Download,
  FlaskConical,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDate, formatBytes } from '@/lib/utils';
import { DIAGNOSTIC_LABS } from '@/lib/diagnostic-labs';

export interface AdminDocItem {
  id: string;
  title: string;
  category: string;
  diagnosticLab: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  uploadedByName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  currentVersion: number;
  createdAt: string;
}

interface AdminPrescriptionsClientProps {
  initialDocs: AdminDocItem[];
}

export default function AdminPrescriptionsClient({ initialDocs }: AdminPrescriptionsClientProps) {
  const [docs] = useState<AdminDocItem[]>(initialDocs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState<AdminDocItem | null>(null);

  const filteredDocs = docs.filter((d) => {
    const matchesLab =
      selectedLab === 'ALL' ||
      (d.diagnosticLab || 'Dr Lal PathLabs').toLowerCase() === selectedLab.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.patientName.toLowerCase().includes(q) ||
      d.patientCode.toLowerCase().includes(q) ||
      d.doctorName.toLowerCase().includes(q);
    return matchesLab && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Company Admin Vault Registry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Clinic Prescription Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete cryptographic registry of all prescriptions and diagnostic reports uploaded by clinic doctors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="teal" className="text-xs px-3 py-1 font-bold">
            {filteredDocs.length} of {docs.length} Documents
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, patient, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Diagnostic Lab:
            </label>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="w-full sm:w-72 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Diagnostic Labs ({DIAGNOSTIC_LABS.length})</option>
              {DIAGNOSTIC_LABS.map((lab) => (
                <option key={lab.id} value={lab.name}>
                  🔬 {lab.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No matching prescription files found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try clearing the search query or changing the diagnostic lab filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Diagnostic Lab</th>
                    <th className="py-3 px-4">Patient Code & Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Upload Date</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {d.title}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Version: v{d.currentVersion}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-800">
                          <FlaskConical className="w-3 h-3 text-teal-600" />
                          <span>{d.diagnosticLab || 'Dr Lal PathLabs'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {d.patientName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {d.patientCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="teal">{d.category.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {d.doctorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-800">{formatDate(d.createdAt)}</div>
                        <div className="text-[10px] font-mono text-indigo-600 font-semibold">
                          {new Date(d.createdAt).toLocaleTimeString('en-IN', {
                            hour12: true,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{formatBytes(d.fileSize)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDoc(d)}
                            leftIcon={<Eye className="w-3.5 h-3.5 text-teal-600" />}
                            className="text-xs"
                          >
                            Preview
                          </Button>
                          <a
                            href={`/api/prescriptions/${d.id}/download`}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-Browser Document Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={`Preview Document: ${previewDoc?.title || ''}`}
        maxWidth="4xl"
      >
        {previewDoc && (
          <div className="space-y-3.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span>Patient: <strong>{previewDoc.patientName}</strong> ({previewDoc.patientCode})</span>
                <span className="text-slate-300">&bull;</span>
                <span>Doctor: <strong>{previewDoc.doctorName}</strong></span>
                <span className="text-slate-300">&bull;</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                  {previewDoc.diagnosticLab}
                </span>
              </div>
              <a
                href={`/api/prescriptions/${previewDoc.id}/download`}
                download
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>

            <div className="w-full h-[600px] border border-slate-200 rounded-xl overflow-hidden bg-white p-2 flex items-center justify-center shadow-inner">
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/prescriptions/${previewDoc.id}/preview`}
                  className="w-full h-full border-0"
                  title={previewDoc.title}
                />
              ) : previewDoc.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/prescriptions/${previewDoc.id}/preview`}
                  alt={previewDoc.title}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <iframe
                  src={`/api/prescriptions/${previewDoc.id}/preview`}
                  className="w-full h-full border-0"
                  title={previewDoc.title}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
