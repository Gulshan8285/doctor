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
  LayoutGrid,
  List,
  Phone,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const displayedPatients = patients.filter((pat: PatientItem) => {
    if (selectedLab === 'ALL') return true;
    return (pat.diagnosticLab || 'Dr Lal PathLabs').toLowerCase() === selectedLab.toLowerCase();
  });

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

      if (data.document) {
        setPatients((prev) =>
          prev.map((p) =>
            p.id === uploadForm.patientId
              ? {
                  ...p,
                  documentCount: p.documentCount + 1,
                  latestUploadDate: new Date().toISOString(),
                  latestUploadTitle: uploadForm.title,
                }
              : p
          )
        );
        setStats((prev) => ({
          ...prev,
          totalPrescriptions: prev.totalPrescriptions + 1,
          monthUploads: prev.monthUploads + 1,
        }));
      }

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

  const getLabColor = (labName?: string) => {
    const l = (labName || '').toLowerCase();
    if (l.includes('lal')) return { border: 'border-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-200', tag: 'Dr Lal' };
    if (l.includes('1mg')) return { border: 'border-orange-500', bg: 'bg-orange-50 text-orange-700 border-orange-200', tag: 'Tata 1mg' };
    if (l.includes('redcliffe')) return { border: 'border-rose-500', bg: 'bg-rose-50 text-rose-700 border-rose-200', tag: 'Redcliffe' };
    if (l.includes('thyrocare')) return { border: 'border-teal-500', bg: 'bg-teal-50 text-teal-700 border-teal-200', tag: 'Thyrocare' };
    if (l.includes('healthians')) return { border: 'border-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', tag: 'Healthians' };
    if (l.includes('metropolis')) return { border: 'border-purple-500', bg: 'bg-purple-50 text-purple-700 border-purple-200', tag: 'Metropolis' };
    if (l.includes('orange')) return { border: 'border-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200', tag: 'Orange Health' };
    if (l.includes('agilus')) return { border: 'border-cyan-500', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', tag: 'Agilus' };
    return { border: 'border-indigo-500', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', tag: labName || 'Partner Lab' };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO CLINICAL WORKSPACE BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Supervised Clinical Workspace &bull; Active Doctor Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Doctor Clinical Dashboard
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Maintain patient health records, upload verified prescriptions with cryptographic SHA-256 hashes, and manage clinical team delegation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canAddPatients && (
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Plus className="w-4 h-4 text-teal-700" />}
                onClick={() => setIsAddPatientOpen(true)}
                className="bg-white hover:bg-slate-100 text-slate-900 font-bold shadow-md cursor-pointer"
              >
                + Add Patient
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
                className="bg-teal-500 hover:bg-teal-400 text-white font-bold shadow-lg shadow-teal-500/30 cursor-pointer"
              >
                Upload Prescription
              </Button>
            )}
            {userRole === 'DOCTOR' && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Users className="w-4 h-4 text-teal-300" />}
                onClick={() => router.push('/doctor/team')}
                className="border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                Team ({stats.activeDelegates}/3)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 15 DIAGNOSTIC LABS / PROVIDERS CONTROL DECK */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Diagnostic Partner Integration
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-bold">
                  15 Certified Labs Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Filter patients and clinical records specifically for any partner laboratory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Selected Lab:</span>
            </div>
            <select
              id="lab-select"
              value={selectedLab}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLab(val);
                setPatientForm((prev) => ({ ...prev, diagnosticLab: val === 'ALL' ? 'Dr Lal PathLabs' : val }));
                setUploadForm((prev) => ({ ...prev, diagnosticLab: val === 'ALL' ? 'Dr Lal PathLabs' : val }));
              }}
              className="bg-slate-50 hover:bg-white border-2 border-teal-500/60 text-teal-950 font-bold text-sm rounded-xl px-4 py-2.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
            >
              <option value="ALL">🌐 All 15 Diagnostic Labs (Showing All)</option>
              {DIAGNOSTIC_LABS.map((lab) => (
                <option key={lab.id} value={lab.name}>
                  🔬 {lab.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Chips */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Quick Filter:
          </span>
          <button
            onClick={() => setSelectedLab('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedLab === 'ALL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Labs ({patients.length})
          </button>
          {DIAGNOSTIC_LABS.slice(0, 6).map((lab) => {
            const count = patients.filter(
              (p) => (p.diagnosticLab || 'Dr Lal PathLabs').toLowerCase() === lab.name.toLowerCase()
            ).length;
            const isSelected = selectedLab.toLowerCase() === lab.name.toLowerCase();
            return (
              <button
                key={lab.id}
                onClick={() => setSelectedLab(lab.name)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{lab.name}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MODERN HIGH-END KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden card-hover-lift">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-emerald-400" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Patients
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {stats.totalPatients}
              </h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  <TrendingUp className="w-3 h-3" />
                  +8.4%
                </span>
                <span className="text-[11px] text-slate-500">Under care</span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Prescriptions Finalized */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden card-hover-lift">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Prescriptions Vault
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {stats.totalPrescriptions}
              </h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                  SHA-256
                </span>
                <span className="text-[11px] text-slate-500">Verified</span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Uploads This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden card-hover-lift">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Uploads This Month
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {stats.monthUploads}
              </h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[11px] font-bold">
                  Current Cycle
                </span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 4: Team Delegation */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden card-hover-lift">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Staff Delegates
              </p>
              <div className="flex items-baseline gap-1 mt-1.5">
                <h3 className="text-3xl font-extrabold text-slate-900">
                  {stats.activeDelegates}
                </h3>
                <span className="text-sm font-bold text-slate-400">
                  / {stats.maxDelegates} Max
                </span>
              </div>
              <div className="mt-2 w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-1.5 rounded-full"
                  style={{ width: `${(stats.activeDelegates / stats.maxDelegates) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
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

      {/* 5. PATIENTS SECTION WITH CARDS / TABLE VIEW TOGGLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Patient Encounters & Clinical Registry
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                {displayedPatients.length} Active Patients
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedLab === 'ALL'
                ? 'Showing all active registered patients across all 15 partner labs'
                : `Filtered patient records registered under ${selectedLab}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Cards vs Table Segmented Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <Link href="/doctor/patients">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                View All
              </Button>
            </Link>
          </div>
        </div>

        {/* Patients Container */}
        <div>
          {patients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No Patients Registered Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Get started by registering your first patient to maintain electronic prescriptions and health records.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddPatientOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add First Patient
                </Button>
              </div>
            </div>
          ) : displayedPatients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <FlaskConical className="w-12 h-12 text-teal-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">
                No Patients Found under &ldquo;{selectedLab}&rdquo;
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Select &ldquo;All 15 Diagnostic Labs&rdquo; to see all patients, or click below to register a patient under {selectedLab}.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLab('ALL')}
                >
                  Reset Filter
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPatientForm((prev) => ({ ...prev, diagnosticLab: selectedLab === 'ALL' ? 'Dr Lal PathLabs' : selectedLab }));
                    setIsAddPatientOpen(true);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Register Patient
                </Button>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* A) INTERACTIVE PATIENT CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedPatients.map((pat) => {
                const labStyle = getLabColor(pat.diagnosticLab);
                return (
                  <div
                    key={pat.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-400 card-hover-lift transition-all p-5 flex flex-col justify-between relative group"
                  >
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${labStyle.border.replace('border-', 'bg-')}`} />

                    <div>
                      {/* Header: Avatar, Name & Code */}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-teal-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {getInitials(pat.fullName)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                              {pat.fullName}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-400 font-semibold">
                              {pat.patientCode}
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>

                      {/* Middle: Diagnostic Lab & Phone */}
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Diagnostic Lab:</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${labStyle.bg}`}>
                            <FlaskConical className="w-3 h-3" />
                            <span>{pat.diagnosticLab || 'Dr Lal PathLabs'}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Contact Phone:</span>
                          <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {pat.phone}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Prescriptions:</span>
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            <FileText className="w-3 h-3 text-teal-600" />
                            {pat.documentCount} {pat.documentCount === 1 ? 'record' : 'records'}
                          </span>
                        </div>
                      </div>

                      {/* Latest upload notice */}
                      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        {pat.latestUploadDate ? (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Last Upload:</span>
                            <span className="font-medium text-slate-700">
                              {formatDate(pat.latestUploadDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No prescriptions uploaded yet</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      {canUpload && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer"
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                          onClick={() => openUploadForPatient(pat.id)}
                        >
                          Upload Rx
                        </Button>
                      )}
                      <Link href={`/doctor/patients/${pat.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 cursor-pointer"
                          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        >
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* B) DENSE TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Patient Name & ID</th>
                      <th className="py-3 px-4">Diagnostic Lab</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Latest Upload</th>
                      <th className="py-3 px-4 text-center">Prescriptions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedPatients.map((pat) => {
                      const labStyle = getLabColor(pat.diagnosticLab);
                      return (
                        <tr
                          key={pat.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/doctor/patients/${pat.id}`)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(pat.fullName)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block group-hover:text-teal-600 transition-colors">
                                  {pat.fullName}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {pat.patientCode}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${labStyle.bg}`}>
                              <FlaskConical className="w-3 h-3" />
                              <span>{pat.diagnosticLab || 'Dr Lal PathLabs'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {pat.phone}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {pat.latestUploadDate ? (
                              <span>{formatDate(pat.latestUploadDate)}</span>
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
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
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
                                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                  onClick={() => openUploadForPatient(pat.id)}
                                >
                                  Upload
                                </Button>
                              )}
                              <Link href={`/doctor/patients/${pat.id}`}>
                                <Button variant="outline" size="sm" className="cursor-pointer">
                                  Profile
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

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
