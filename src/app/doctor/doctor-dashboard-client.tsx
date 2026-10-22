'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  FileText,
  Calendar,
  UserCheck,
  Plus,
  Upload,
  Search,
  BarChart3,
  Pill,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { DIAGNOSTIC_LABS } from '@/lib/diagnostic-labs';

interface PatientItem {
  id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  documentCount: number;
  latestUploadDate: string | null;
  latestUploadTitle: string | null;
  diagnosticLab?: string;
  createdAt: string;
}

interface DoctorDashboardClientProps {
  userRole: string;
  initialStats: {
    totalPatients: number;
    totalPrescriptions: number;
    monthUploads: number;
    activeDelegates: number;
    maxDelegates: number;
    preferredPharmacy: string;
  };
  initialPatients: PatientItem[];
  permissions: string[];
}

export default function DoctorDashboardClient({
  userRole,
  initialStats,
  initialPatients,
  permissions,
}: DoctorDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientItem[]>(initialPatients);
  const [stats, setStats] = useState(initialStats);

  // Modals state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<string>('');

  // 15 Diagnostic Labs filter state
  const [selectedLab, setSelectedLab] = useState<string>('ALL');

  // Add Patient Form State
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    consentAcknowledged: true,
    nonClinicalNotes: '',
    diagnosticLab: 'Dr Lal PathLabs',
  });
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Prescription Upload Form State
  const [uploadForm, setUploadForm] = useState({
    patientId: '',
    title: '',
    category: 'PRESCRIPTION',
    documentDate: new Date().toISOString().split('T')[0],
    diagnosticLab: 'Dr Lal PathLabs',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);

  // Permission checks
  const canUpload =
    userRole === 'DOCTOR' || permissions.includes('UPLOAD_DOCUMENTS');
  const canAddPatients =
    userRole === 'DOCTOR' || permissions.includes('UPDATE_PATIENT_DETAILS');

  // Submit Patient Handler
  const handleSavePatient = async (confirmDuplicate = false) => {
    setIsSubmittingPatient(true);
    setDuplicateWarning(null);

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patientForm,
          confirmDuplicate,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.isDuplicateWarning) {
        setDuplicateWarning(data);
        setIsSubmittingPatient(false);
        return;
      }

      if (!res.ok) {
        toast({ title: 'Registration Failed', description: data.error, type: 'error' });
        setIsSubmittingPatient(false);
        return;
      }

      toast({
        title: 'Patient Registered',
        description: `Patient ID ${data.patient.patientCode} generated successfully.`,
        type: 'success',
      });

      setIsAddPatientOpen(false);
      setPatientForm({
        fullName: '',
        phone: '',
        email: '',
        dob: '',
        gender: 'Male',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        consentAcknowledged: true,
        nonClinicalNotes: '',
        diagnosticLab: 'Dr Lal PathLabs',
      });

      // Navigate to patient profile
      router.push(`/doctor/patients/${data.patient.id}`);
      router.refresh();
    } catch {
      toast({ title: 'Network Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  // Submit Upload Handler
  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({ title: 'File Missing', description: 'Please select a prescription document', type: 'error' });
      return;
    }

    setIsSubmittingUpload(true);
    try {
      const formData = new FormData();
      formData.append('patientId', uploadForm.patientId);
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('documentDate', uploadForm.documentDate);
      formData.append('diagnosticLab', uploadForm.diagnosticLab || 'Dr Lal PathLabs');
      formData.append('file', uploadFile);

      const res = await fetch('/api/prescriptions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Upload Failed', description: data.error, type: 'error' });
        setIsSubmittingUpload(false);
        return;
      }

      toast({
        title: 'Document Finalized',
        description: 'Prescription uploaded with cryptographic integrity hash.',
        type: 'success',
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadForm({
        patientId: '',
        title: '',
        category: 'PRESCRIPTION',
        documentDate: new Date().toISOString().split('T')[0],
        diagnosticLab: 'Dr Lal PathLabs',
      });

      router.refresh();
    } catch {
      toast({ title: 'Upload Error', description: 'Failed to process document upload', type: 'error' });
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  const openUploadForPatient = (patientId: string) => {
    setUploadForm((prev) => ({ ...prev, patientId }));
    setIsUploadOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Clinical Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your patient records, cryptographic prescriptions, and delegated team members.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canAddPatients && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Plus className="w-4 h-4 text-teal-600" />}
              onClick={() => setIsAddPatientOpen(true)}
            >
              Add Patient
            </Button>
          )}
          {canUpload && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => {
                if (patients.length > 0) {
                  setUploadForm((prev) => ({ ...prev, patientId: patients[0].id }));
                }
                setIsUploadOpen(true);
              }}
            >
              Upload Prescription
            </Button>
          )}
          {userRole === 'DOCTOR' && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Users className="w-4 h-4 text-indigo-600" />}
              onClick={() => router.push('/doctor/team')}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              Give Staff Access ({stats.activeDelegates}/3)
            </Button>
          )}
        </div>
      </div>

      {/* 15 DIAGNOSTIC LABS / PROVIDERS SELECTOR DROPDOWN */}
      <div className="bg-gradient-to-r from-teal-50 via-white to-sky-50 p-5 rounded-2xl border-2 border-teal-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                Select Diagnostic Lab / Partner
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                {selectedLab === 'ALL' ? 'Showing All 15 Labs' : selectedLab}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a lab from the list to filter patients and prescriptions for that diagnostic partner.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedLab(val);
              setPatientForm((prev) => ({ ...prev, diagnosticLab: val === 'ALL' ? 'Dr Lal PathLabs' : val }));
              setUploadForm((prev) => ({ ...prev, diagnosticLab: val === 'ALL' ? 'Dr Lal PathLabs' : val }));
            }}
            className="w-full md:w-80 bg-white border-2 border-teal-500 text-teal-950 font-bold text-sm rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
          >
            <option value="ALL">🌐 All Diagnostic Labs (Show All Patients)</option>
            {DIAGNOSTIC_LABS.map((lab) => (
              <option key={lab.id} value={lab.name}>
                🔬 {lab.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients */}
        <Card className="hover:border-teal-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Patients
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalPatients}
              </h3>
              <p className="text-[11px] text-teal-600 font-medium mt-1">
                Under Active Care
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Prescriptions */}
        <Card className="hover:border-teal-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Prescriptions Finalized
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalPrescriptions}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                SHA-256 Verified
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Uploads This Month */}
        <Card className="hover:border-teal-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Uploads This Month
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.monthUploads}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Active Cycle
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Team Delegation Limit (X/3) */}
        <Card className="hover:border-teal-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team Delegates
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <h3 className="text-2xl font-bold text-slate-900">
                  {stats.activeDelegates}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  / {stats.maxDelegates} Max
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.maxDelegates - stats.activeDelegates} slots available
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setIsAddPatientOpen(true)}
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Add Patient</span>
        </button>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Upload Rx</span>
        </button>

        <Link
          href="/doctor/search"
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <Search className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Search Records</span>
        </Link>

        <Link
          href="/doctor/reports"
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">View Reports</span>
        </Link>

        <Link
          href="/doctor/team"
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <UserCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Team Access</span>
        </Link>

        <Link
          href="/doctor/pharmacy"
          className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
            <Pill className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-800">Pharmacy Pref</span>
        </Link>
      </div>

      {/* Preferred Pharmacy Notification Banner */}
      <div className="p-4 bg-teal-50/70 border border-teal-200/70 rounded-xl flex items-center justify-between text-xs text-teal-900">
        <div className="flex items-center gap-2.5">
          <Pill className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>Preferred Pharmacy Partner:</strong> {stats.preferredPharmacy}. (Clinical Note:
            Prescriptions remain in your private vault until authorized export or provider transmission.)
          </span>
        </div>
        <Link
          href="/doctor/pharmacy"
          className="text-teal-700 hover:underline font-semibold shrink-0 ml-4 hidden sm:block"
        >
          Configure
        </Link>
      </div>

      {/* Recent Patients Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Recent Patient Encounters</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing recently registered and consulted patient files under your supervision.
            </p>
          </div>
          <Link href="/doctor/patients">
            <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              View All Patients
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No Patients Registered Yet"
                description="Get started by registering your first patient to maintain prescriptions and health records."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddPatientOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add First Patient
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const displayedPatients =
                  selectedLab === 'ALL'
                    ? patients
                    : patients.filter(
                        (p) =>
                          (p.diagnosticLab || 'Dr Lal PathLabs').toLowerCase() ===
                          selectedLab.toLowerCase()
                      );

                if (displayedPatients.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <FlaskConical className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-bold">
                        No patient records found under &ldquo;{selectedLab}&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select &ldquo;All Diagnostic Labs&rdquo; to view all records, or click &ldquo;Add Patient&rdquo; to register one under this partner.
                      </p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Patient Name & ID</th>
                        <th className="py-3 px-4">Diagnostic Lab</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4">Latest Upload Date</th>
                        <th className="py-3 px-4 text-center">Prescriptions</th>
                        <th className="py-3 px-4">Record Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedPatients.map((pat) => (
                        <tr
                          key={pat.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/doctor/patients/${pat.id}`)}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 block group-hover:text-teal-600 transition-colors">
                              {pat.fullName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {pat.patientCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-800">
                              <FlaskConical className="w-3 h-3 text-teal-600" />
                              <span>{pat.diagnosticLab || 'Dr Lal PathLabs'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {pat.phone}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {pat.latestUploadDate ? (
                              <div>
                                <span>{formatDate(pat.latestUploadDate)}</span>
                                {pat.latestUploadTitle && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                    {pat.latestUploadTitle}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No uploads</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant={pat.documentCount > 0 ? 'teal' : 'slate'}>
                              {pat.documentCount} {pat.documentCount === 1 ? 'doc' : 'docs'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active Record
                            </span>
                          </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => openUploadForPatient(pat.id)}
                            >
                              Upload
                            </Button>
                          )}
                          <Link href={`/doctor/patients/${pat.id}`}>
                            <Button variant="outline" size="sm">
                              Profile
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}
    </CardContent>
  </Card>

      {/* MODAL 1: ADD PATIENT FORM */}
      <Modal
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Register New Patient"
        description="Enter patient demographics. An automatic Patient ID will be assigned."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Duplicate Warning Dialog / Alert */}
          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{duplicateWarning.warning}</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Matches found in your records:
              </p>
              <ul className="text-xs list-disc pl-5 text-amber-800 space-y-0.5">
                {duplicateWarning.matches?.map((m: any) => (
                  <li key={m.id}>
                    <strong>{m.fullName}</strong> ({m.patientCode}) &bull; {m.phone}
                  </li>
                ))}
              </ul>
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Edit Information
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleSavePatient(true)}
                  isLoading={isSubmittingPatient}
                >
                  Confirm & Create Record
                </Button>
              </div>
            </div>
          )}

          {!duplicateWarning && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSavePatient(false);
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.fullName}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, fullName: e.target.value })
                    }
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, email: e.target.value })
                    }
                    placeholder="patient@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={patientForm.dob}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, dob: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, gender: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Child">Child / Infant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={patientForm.emergencyContactPhone}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    placeholder="Emergency phone"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Diagnostic Lab / Partner <span className="text-rose-500">*</span>
                </label>
                <select
                  value={patientForm.diagnosticLab}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, diagnosticLab: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  {DIAGNOSTIC_LABS.map((lab) => (
                    <option key={lab.id} value={lab.name}>
                      🔬 {lab.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={patientForm.address}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, address: e.target.value })
                  }
                  placeholder="Street address, city"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Non-Clinical Clinical Notes / Flags
                </label>
                <textarea
                  rows={2}
                  value={patientForm.nonClinicalNotes}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      nonClinicalNotes: e.target.value,
                    })
                  }
                  placeholder="e.g. Follow-up every 3 months; preferred language Telugu/Hindi."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  required
                  checked={patientForm.consentAcknowledged}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      consentAcknowledged: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="consent" className="text-[11px] text-slate-600 leading-snug">
                  Patient has provided consent for health record storage and consultation
                  under applicable DPDP Act guidelines.
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsAddPatientOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingPatient}
                >
                  Save & Open Profile
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* MODAL 2: UPLOAD PRESCRIPTION FORM */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Clinical Document"
        description="Prescriptions and medical files are stored in private storage and hashed for integrity."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={uploadForm.patientId}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, patientId: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">-- Choose a Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode}) &bull; {p.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title / Label <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, title: e.target.value })
                }
                placeholder="e.g. Cardiology OPD Follow-up Rx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, category: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="PRESCRIPTION">Prescription (Rx)</option>
                <option value="LAB_REPORT">Diagnostic Lab Report</option>
                <option value="REFERRAL_LETTER">Referral Letter</option>
                <option value="DIAGNOSTIC_IMAGING">ECG / Ultrasound / Imaging</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Diagnostic Lab / Facility Partner <span className="text-rose-500">*</span>
            </label>
            <select
              value={uploadForm.diagnosticLab}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, diagnosticLab: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              {DIAGNOSTIC_LABS.map((lab) => (
                <option key={lab.id} value={lab.name}>
                  🔬 {lab.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prescription Document File <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-teal-400 transition-colors bg-slate-50/50">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-teal-600" />
                <div className="flex text-xs text-slate-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-semibold text-teal-600 focus-within:outline-none hover:text-teal-700"
                  >
                    <span>Choose a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-[11px] text-slate-500">
                  PDF, PNG, JPEG, or TXT up to 25MB
                </p>
                {uploadFile && (
                  <p className="text-xs font-semibold text-teal-700 mt-2">
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Once finalized, the original document cannot be silently overwritten. New corrections
              will be tracked as auditable addendums.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingUpload}
            >
              Finalize & Store Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
