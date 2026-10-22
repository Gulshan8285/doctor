'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  FileText,
  Eye,
  X,
  FileCheck2,
  Download,
  AlertCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatBytes } from '@/lib/utils';

export interface AdminPatientDocument {
  id: string;
  title: string;
  category: string;
  diagnosticLab?: string | null;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface AdminPatientItem {
  id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dob: string | null;
  address: string | null;
  emergencyContact: string | null;
  doctorName: string;
  doctorEmail?: string | null;
  doctorSpecialization?: string | null;
  hospitalName: string;
  documentCount: number;
  documents: AdminPatientDocument[];
  createdAt: string;
}

interface AdminPatientsClientProps {
  initialPatients: AdminPatientItem[];
}

export default function AdminPatientsClient({ initialPatients }: AdminPatientsClientProps) {
  const [patients] = useState<AdminPatientItem[]>(initialPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDocFilter, setHasDocFilter] = useState<'ALL' | 'WITH_DOCS' | 'NO_DOCS'>('ALL');
  const [selectedPatient, setSelectedPatient] = useState<AdminPatientItem | null>(null);

  // Master Search across Name, Code, Phone, Email, Doctor, Hospital
  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return patients.filter((p) => {
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.patientCode.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        p.doctorName.toLowerCase().includes(q) ||
        p.hospitalName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (hasDocFilter === 'WITH_DOCS') return p.documentCount > 0;
      if (hasDocFilter === 'NO_DOCS') return p.documentCount === 0;

      return true;
    });
  }, [patients, searchQuery, hasDocFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Clinic Patient Master Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Organization-wide patient census with attending doctor linkage, hospital tags, and unified prescription files.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="indigo" className="text-xs px-3 py-1 font-bold">
            Total Patients: {patients.length}
          </Badge>
        </div>
      </div>

      {/* Master Search Bar & Filter Controls */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Master Search: Patient name, Patient ID (PAT-...), phone (+91...), attending doctor, or hospital branch..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-10 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
              </span>
              {[
                { key: 'ALL', label: 'All Patients' },
                { key: 'WITH_DOCS', label: 'Has Prescriptions' },
                { key: 'NO_DOCS', label: 'No Prescriptions' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setHasDocFilter(f.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    hasDocFilter === f.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing <strong>{filteredPatients.length}</strong> of {patients.length} patients
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {filteredPatients.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Users}
                title="No Matching Patients"
                description={
                  searchQuery
                    ? `No patients found matching "${searchQuery}". Check spelling or try searching by Patient ID or Doctor name.`
                    : 'No patients registered in the clinic database yet.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Patient ID &amp; Name</th>
                    <th className="py-3 px-4">Contact Details</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Hospital / Clinic</th>
                    <th className="py-3 px-4">Registration Date &amp; Time (Sec)</th>
                    <th className="py-3 px-4 text-center">Prescriptions</th>
                    <th className="py-3 px-4 text-right">Profile &amp; Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => {
                    const regDate = new Date(p.createdAt);
                    const formattedTime = !isNaN(regDate.getTime())
                      ? regDate.toLocaleTimeString('en-IN', {
                          hour12: true,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPatient(p)}
                      >
                        {/* Patient Code & Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit mb-1 border border-indigo-100">
                            {p.patientCode}
                          </div>
                          <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {p.fullName}
                          </div>
                          {p.gender && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              {p.gender} {p.dob ? `• ${formatDate(p.dob)}` : ''}
                            </span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.phone}</span>
                          </div>
                          {p.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{p.email}</span>
                            </div>
                          )}
                        </td>

                        {/* Attending Doctor */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{p.doctorName}</span>
                          </div>
                          {p.doctorSpecialization && (
                            <span className="text-[10px] text-teal-700 block mt-0.5 font-medium">
                              {p.doctorSpecialization}
                            </span>
                          )}
                        </td>

                        {/* Hospital / Clinic */}
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{p.hospitalName}</span>
                          </div>
                        </td>

                        {/* Registration Date & Time with exact Seconds */}
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatDate(p.createdAt)}</span>
                          </div>
                          <div className="text-[10px] font-mono text-indigo-600 flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>{formattedTime}</span>
                          </div>
                        </td>

                        {/* Prescriptions Count */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={p.documentCount > 0 ? 'teal' : 'slate'} className="font-bold">
                            {p.documentCount} {p.documentCount === 1 ? 'Rx File' : 'Rx Files'}
                          </Badge>
                        </td>

                        {/* Action: Open Profile & Files */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5 text-indigo-600" />}
                            onClick={() => setSelectedPatient(p)}
                            className="cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700"
                          >
                            View Profile &amp; Rx
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Patient Profile & Prescriptions Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={`Patient Clinical Record: ${selectedPatient.fullName}`}
          description={`ID: ${selectedPatient.patientCode} • Attending Doctor: ${selectedPatient.doctorName} • Clinic: ${selectedPatient.hospitalName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Demographics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Patient Code</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedPatient.patientCode}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Phone Number</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedPatient.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Email Address</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5 truncate">{selectedPatient.email || 'None'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Hospital Branch</p>
                <p className="font-bold text-indigo-700 mt-0.5 truncate">{selectedPatient.hospitalName}</p>
              </div>
            </div>

            {/* Prescriptions Section (Everything in one place as requested) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Uploaded Prescriptions &amp; Lab Reports ({selectedPatient.documents.length})
                  </h3>
                </div>
                <Badge variant={selectedPatient.documents.length > 0 ? 'emerald' : 'slate'}>
                  {selectedPatient.documents.length} Records
                </Badge>
              </div>

              {selectedPatient.documents.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium">No prescription files uploaded yet for this patient.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When Dr. {selectedPatient.doctorName} uploads prescriptions, they will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {selectedPatient.documents.map((doc) => {
                    const docDate = new Date(doc.createdAt);
                    const docTime = !isNaN(docDate.getTime())
                      ? docDate.toLocaleTimeString('en-IN', {
                          hour12: true,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {doc.title}
                            </span>
                            <Badge variant="teal" className="text-[9px] px-1.5 py-0">
                              {doc.diagnosticLab || 'Dr Lal PathLabs'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>Category: {doc.category}</span>
                            <span>Size: {formatBytes(doc.fileSize)}</span>
                            <span className="text-indigo-600 font-mono">
                              {formatDate(doc.createdAt)} • {docTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`/api/prescriptions/${doc.id}/preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-slate-700 hover:text-teal-700 cursor-pointer"
                              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                            >
                              Preview
                            </Button>
                          </a>
                          <a
                            href={`/api/prescriptions/${doc.id}/download`}
                            download
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs cursor-pointer"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              Download
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedPatient(null)}
              >
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
