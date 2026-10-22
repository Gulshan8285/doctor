'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Users,
  FileCheck2,
  UserCheck,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Building2,
  Download,
  FlaskConical,
  FileText,
  Search,
  TrendingUp,
  ArrowUpRight,
  LayoutGrid,
  List,
  Sparkles,
  Filter,
  Activity,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatBytes } from '@/lib/utils';
import { DIAGNOSTIC_LABS } from '@/lib/diagnostic-labs';

export interface DoctorSubordinate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
  permissions: string[];
  createdAt: string;
}

interface DoctorItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  specialization: string;
  preferredPharmacy: string;
  patientCount: number;
  docCount: number;
  activeDelegates: number;
  createdAt: string;
  subordinates?: DoctorSubordinate[];
}

interface PrescriptionItem {
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

interface AuditItem {
  id: string;
  action: string;
  resourceType: string;
  userName: string;
  userRole: string;
  createdAt: string;
  metadata: any;
}

export interface DelegatedStaffItem {
  id: string;
  invitedEmail: string;
  invitedName: string | null;
  status: string;
  permissions: string[];
  createdAt: string;
  grantingDoctorName: string;
  grantingDoctorEmail: string;
  staffUser: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    lastLoginAt: string | null;
  } | null;
}

interface AdminDashboardClientProps {
  stats: {
    totalDoctors: number;
    totalPatients: number;
    totalPrescriptions: number;
    activeDelegates: number;
  };
  doctors: DoctorItem[];
  delegatedStaff?: DelegatedStaffItem[];
  recentPrescriptions: PrescriptionItem[];
  recentAudits: AuditItem[];
}

export default function AdminDashboardClient({
  stats,
  doctors,
  delegatedStaff = [],
  recentPrescriptions = [],
  recentAudits,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [doctorList, setDoctorList] = useState<DoctorItem[]>(doctors);
  const [staffList, setStaffList] = useState<DelegatedStaffItem[]>(delegatedStaff);
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>(recentPrescriptions);
  const [staffViewMode, setStaffViewMode] = useState<'card' | 'table'>('card');
  const [isRevokingStaff, setIsRevokingStaff] = useState<string | null>(null);

  React.useEffect(() => {
    setDoctorList(doctors);
  }, [doctors]);

  React.useEffect(() => {
    setStaffList(delegatedStaff || []);
  }, [delegatedStaff]);

  React.useEffect(() => {
    setPrescriptionList(recentPrescriptions);
  }, [recentPrescriptions]);

  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialization: 'General Physician',
    registrationNumber: '',
  });

  // Document preview & filter state
  const [previewDoc, setPreviewDoc] = useState<PrescriptionItem | null>(null);
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('ALL');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');

  // View toggles: Card View vs Table View
  const [doctorViewMode, setDoctorViewMode] = useState<'card' | 'table'>('card');
  const [prescriptionViewMode, setPrescriptionViewMode] = useState<'card' | 'table'>('card');

  // Edit Doctor state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    specialization: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const handleOpenEdit = (doc: DoctorItem) => {
    setEditingDoctor(doc);
    setEditForm({
      fullName: doc.fullName,
      phone: doc.phone || '',
      specialization: doc.specialization,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingDoctor.id,
          fullName: editForm.fullName,
          phone: editForm.phone,
          specialization: editForm.specialization,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Update Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Doctor Updated',
        description: 'Doctor details have been saved successfully.',
        type: 'success',
      });

      setIsEditOpen(false);
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvisionDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provisionForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Provisioning Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Doctor Account Created',
        description: data.message,
        type: 'success',
      });

      if (data.doctor) {
        setDoctorList((prev) => [data.doctor, ...prev]);
      }

      setIsProvisionOpen(false);
      setProvisionForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        specialization: 'General Physician',
        registrationNumber: '',
      });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (doctor: DoctorItem) => {
    const newStatus = doctor.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    setIsTogglingStatus(doctor.id);

    // Fast 0ms optimistic UI update
    setDoctorList((prev) =>
      prev.map((d) => (d.id === doctor.id ? { ...d, status: newStatus } : d))
    );

    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: doctor.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on error
        setDoctorList((prev) =>
          prev.map((d) => (d.id === doctor.id ? { ...d, status: doctor.status } : d))
        );
        toast({ title: 'Status Update Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Access Status Updated',
        description: `${doctor.fullName} access is now ${newStatus === 'ACTIVE' ? 'GRANTED (Active)' : 'REVOKED (Deactivated)'}.`,
        type: 'success',
      });
      router.refresh();
    } catch {
      setDoctorList((prev) =>
        prev.map((d) => (d.id === doctor.id ? { ...d, status: doctor.status } : d))
      );
      toast({ title: 'Error', description: 'Could not update status', type: 'error' });
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleRevokeStaffAccess = async (staffOrId: DelegatedStaffItem | string, staffNameOrEmail?: string) => {
    const id = typeof staffOrId === 'string' ? staffOrId : staffOrId.id;
    const displayName = typeof staffOrId === 'string'
      ? (staffNameOrEmail || 'Staff Member')
      : (staffOrId.staffUser?.fullName || staffOrId.invitedName || staffOrId.invitedEmail);

    setIsRevokingStaff(id);
    // Optimistic UI update (0ms delay)
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'REVOKED' } : s))
    );
    setDoctorList((prev) =>
      prev.map((d) => ({
        ...d,
        subordinates: (d.subordinates || []).map((sub) =>
          sub.id === id ? { ...sub, status: 'REVOKED' as const } : sub
        ),
      }))
    );

    try {
      const res = await fetch(`/api/team?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Revocation Failed', description: data.error, type: 'error' });
        router.refresh();
        return;
      }

      toast({
        title: 'Staff Access Revoked',
        description: `Subordinate access for ${displayName} has been immediately revoked.`,
        type: 'success',
      });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsRevokingStaff(null);
    }
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

  const getInitials = (name?: string | null) => {
    if (!name) return 'SM';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Hospital Administration & Super Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Executive Healthcare Command Center
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Supervise hospital clinicians, provision doctors, audit cryptographic prescriptions across 15 diagnostic labs, and manage clinic compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsProvisionOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              + Provision Doctor
            </Button>
            <Link href="/admin/prescriptions">
              <Button
                variant="outline"
                size="md"
                leftIcon={<FileCheck2 className="w-4 h-4 text-teal-600" />}
                className="bg-white text-slate-900 border-slate-200 hover:bg-slate-100 font-bold shadow-sm cursor-pointer"
              >
                All Prescriptions ({stats.totalPrescriptions})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. UPGRADED KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doctors Card */}
        <Card className="card-hover-lift overflow-hidden border-slate-200/90 shadow-xs relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 to-emerald-400" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Doctors
                </p>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">
                  <TrendingUp className="w-3 h-3" />
                  <span>100% Verified</span>
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {stats.totalDoctors}
              </h3>
              <p className="text-xs text-teal-600 font-semibold mt-1">
                Authorized Clinicians
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Patients Card */}
        <Card className="card-hover-lift overflow-hidden border-slate-200/90 shadow-xs relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 to-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Clinic Patients
                </p>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700">
                  <TrendingUp className="w-3 h-3" />
                  <span>Directory</span>
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {stats.totalPatients}
              </h3>
              <p className="text-xs text-sky-600 font-semibold mt-1">
                Under Clinical Care
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions Vault */}
        <Card className="card-hover-lift overflow-hidden border-slate-200/90 shadow-xs relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Prescriptions Vault
                </p>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="w-3 h-3" />
                  <span>SHA-256</span>
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {stats.totalPrescriptions}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Cryptographically Finalized
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Delegated Staff */}
        <Card className="card-hover-lift overflow-hidden border-slate-200/90 shadow-xs relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Delegated Staff
                </p>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                  <span>Assigned</span>
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {stats.activeDelegates}
              </h3>
              <p className="text-xs text-purple-600 font-semibold mt-1">
                Active Medical Staff Slots
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. ORGANIZATION MEDICAL STAFF & CLINICIANS */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Organization Medical Staff & Clinicians
              </CardTitle>
              <Badge variant="teal">{doctorList.length} Doctors</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Full directory of doctors provisioned in this healthcare tenant with access control and delegation quotas.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Card vs Table */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDoctorViewMode('card')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  doctorViewMode === 'card'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                onClick={() => setDoctorViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  doctorViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => setIsProvisionOpen(true)}
              className="text-xs"
            >
              Add Doctor
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {doctorViewMode === 'card' ? (
            /* DOCTOR CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorList.map((doc) => {
                const isActive = doc.status === 'ACTIVE';
                return (
                  <div
                    key={doc.id}
                    className="card-hover-lift bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all"
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isActive ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : 'bg-rose-400'
                      }`}
                    />

                    <div>
                      {/* Top Row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-base shadow-xs shrink-0">
                            {getInitials(doc.fullName)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {doc.fullName}
                            </h4>
                            <span className="inline-block text-[11px] font-semibold text-indigo-600 mt-0.5">
                              {doc.specialization}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <Badge variant="emerald">Active</Badge>
                        ) : (
                          <Badge variant="rose">Deactivated</Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.email}</span>
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{doc.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Metrics Pill Deck */}
                      <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Patients</p>
                          <p className="text-sm font-bold text-slate-800">{doc.patientCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Rx Files</p>
                          <p className="text-sm font-bold text-slate-800">{doc.docCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Staff</p>
                          <p className="text-sm font-bold text-purple-700">{doc.activeDelegates}/3</p>
                        </div>
                      </div>

                      {/* Nested Subordinates / Junior Staff Section */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Delegated Subordinates</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {(doc.subordinates || []).length}/3 Assigned
                          </span>
                        </div>

                        {(!doc.subordinates || doc.subordinates.length === 0) ? (
                          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 text-center text-[11px] text-slate-400 italic">
                            No junior staff assigned to this physician
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {doc.subordinates.map((sub) => (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/90 hover:border-indigo-200 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {sub.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-500 truncate">
                                      {sub.email}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      sub.status === 'ACTIVE'
                                        ? 'emerald'
                                        : sub.status === 'PENDING'
                                        ? 'amber'
                                        : 'rose'
                                    }
                                  >
                                    {sub.status}
                                  </Badge>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {sub.permissions.map((p) => (
                                    <span
                                      key={p}
                                      className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600"
                                    >
                                      {p.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(doc)}
                        leftIcon={<Pencil className="w-3.5 h-3.5 text-slate-500" />}
                        className="text-xs flex-1 cursor-pointer"
                      >
                        Edit
                      </Button>
                      <Button
                        variant={isActive ? 'ghost' : 'outline'}
                        size="sm"
                        isLoading={isTogglingStatus === doc.id}
                        className={`text-xs font-semibold flex-1 cursor-pointer ${
                          isActive
                            ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-teal-600 border-teal-300 hover:bg-teal-50'
                        }`}
                        onClick={() => handleToggleStatus(doc)}
                      >
                        {isActive ? 'Revoke' : 'Grant'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DOCTOR TABLE VIEW */
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Doctor Name</th>
                    <th className="py-3 px-4">Specialization</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Patients</th>
                    <th className="py-3 px-4 text-center">Prescriptions</th>
                    <th className="py-3 px-4 text-center">Delegates (Max 3)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctorList.map((doc) => (
                    <React.Fragment key={doc.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {doc.fullName}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Role: {doc.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{doc.specialization}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        <div>{doc.email}</div>
                        {doc.phone && <div className="text-[11px]">{doc.phone}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {doc.patientCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {doc.docCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="purple">{doc.activeDelegates}/3</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {doc.status === 'ACTIVE' ? (
                          <Badge variant="emerald">Active</Badge>
                        ) : (
                          <Badge variant="rose">Deactivated</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(doc)}
                            leftIcon={<Pencil className="w-3.5 h-3.5 text-slate-500" />}
                            className="text-xs cursor-pointer"
                          >
                            Edit
                          </Button>
                          <Button
                            variant={doc.status === 'ACTIVE' ? 'ghost' : 'outline'}
                            size="sm"
                            isLoading={isTogglingStatus === doc.id}
                            className={`text-xs font-semibold cursor-pointer ${
                              doc.status === 'ACTIVE'
                                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                                : 'text-teal-600 border-teal-300 hover:bg-teal-50'
                            }`}
                            onClick={() => handleToggleStatus(doc)}
                          >
                            {doc.status === 'ACTIVE' ? 'Revoke Access' : 'Grant Access'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {doc.subordinates && doc.subordinates.length > 0 && (
                      <tr key={`${doc.id}-subs`} className="bg-indigo-50/40 border-b border-indigo-100">
                        <td colSpan={8} className="py-2.5 px-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                              Subordinate Staff under {doc.fullName}:
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {doc.subordinates.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs text-xs"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                    <span>{sub.name}</span>
                                    <Badge
                                      variant={
                                        sub.status === 'ACTIVE'
                                          ? 'emerald'
                                          : sub.status === 'PENDING'
                                          ? 'amber'
                                          : 'rose'
                                      }
                                    >
                                      {sub.status}
                                    </Badge>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono truncate">
                                    {sub.email}
                                  </div>
                                  <div className="text-[9px] text-indigo-600 font-medium mt-0.5 truncate">
                                    {sub.permissions.join(', ')}
                                  </div>
                                </div>
                                {sub.status !== 'REVOKED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] text-rose-600 hover:bg-rose-50 px-2 py-1 h-auto cursor-pointer shrink-0"
                                    onClick={() => handleRevokeStaffAccess(sub.id, sub.email)}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3.5. DELEGATED CLINICAL STAFF & DOCTOR HIERARCHY (SUBORDINATES) */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <UserCheck className="w-4 h-4" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Delegated Clinical Staff & Doctor Hierarchy (Subordinates)
              </CardTitle>
              <Badge variant="purple">{staffList.length} Delegated Members</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Subordinate clinical assistants, nurses, and staff granted access by attending doctors. Displays supervisory doctor linkage and active permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Card vs Table */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStaffViewMode('card')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  staffViewMode === 'card'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  staffViewMode === 'table'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {staffList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-bold">
                No delegated subordinate staff registered currently.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                When doctors invite subordinate clinical assistants or nurses from their Doctor Team dashboard, they will appear here in real-time.
              </p>
            </div>
          ) : staffViewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((st) => {
                const isActive = st.status === 'ACTIVE';
                const isPending = st.status === 'PENDING';
                return (
                  <div
                    key={st.id}
                    className="card-hover-lift bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all"
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          : isPending
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />

                    <div>
                      {/* Top Row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-base shadow-xs shrink-0">
                            {getInitials(st.staffUser?.fullName || st.invitedName)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {st.staffUser?.fullName || st.invitedName}
                            </h4>
                            <span className="inline-block text-[11px] font-semibold text-purple-700 mt-0.5">
                              {st.staffUser?.role === 'DELEGATED_STAFF'
                                ? 'Clinical Assistant'
                                : isPending
                                ? 'Invited Delegate'
                                : 'Medical Staff'}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <Badge variant="emerald">Active</Badge>
                        ) : isPending ? (
                          <Badge variant="amber">Pending</Badge>
                        ) : (
                          <Badge variant="rose">Revoked</Badge>
                        )}
                      </div>

                      {/* Supervisory Linkage (Doctor Hierarchy) */}
                      <div className="mt-3.5 p-3 rounded-xl bg-purple-50/60 border border-purple-100/80">
                        <div className="flex items-center gap-1.5 text-xs text-purple-950 font-bold mb-1">
                          <Stethoscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Supervising Doctor:</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {st.grantingDoctorName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {st.grantingDoctorEmail}
                        </p>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{st.staffUser?.email || st.invitedEmail}</span>
                        </div>
                        {st.staffUser?.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{st.staffUser.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Delegated Permissions Chips */}
                      <div className="mt-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                          Delegated Permissions ({st.permissions.length}):
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {st.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700"
                            >
                              {perm.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Granted: {formatDate(st.createdAt)}</span>
                      {isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={isRevokingStaff === st.id}
                          onClick={() => handleRevokeStaffAccess(st)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold px-2.5 py-1 h-auto cursor-pointer"
                        >
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Supervising Doctor</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Delegated Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Granted Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {st.staffUser?.fullName || st.invitedName}
                        <span className="text-[10px] text-purple-600 block font-semibold">
                          Subordinate Staff
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          {st.grantingDoctorName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {st.grantingDoctorEmail}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        <div>{st.staffUser?.email || st.invitedEmail}</div>
                        {st.staffUser?.phone && <div className="text-[11px]">{st.staffUser.phone}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {st.permissions.slice(0, 3).map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700">
                              {p.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {st.permissions.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{st.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {st.status === 'ACTIVE' ? (
                          <Badge variant="emerald">Active</Badge>
                        ) : st.status === 'PENDING' ? (
                          <Badge variant="amber">Pending</Badge>
                        ) : (
                          <Badge variant="rose">Revoked</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(st.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {st.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={isRevokingStaff === st.id}
                            onClick={() => handleRevokeStaffAccess(st)}
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. DOCTOR PRESCRIPTIONS & DOCUMENTS UPLOADED */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Doctor Prescription Uploads & Documents
                </CardTitle>
                <Badge variant="teal">{prescriptionList.length} Uploaded</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live cryptographic feed of clinical prescriptions, diagnostic reports, and medical files uploaded by doctors.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* View Mode Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPrescriptionViewMode('card')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prescriptionViewMode === 'card'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrescriptionViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prescriptionViewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
              </div>

              <Link href="/admin/prescriptions">
                <Button variant="outline" size="sm" className="text-xs">
                  Full Vault &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Lab Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Quick Lab Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedLabFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedLabFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All Labs ({prescriptionList.length})
              </button>
              {['Dr Lal PathLabs', 'Tata 1mg', 'Redcliffe Labs', 'Healthians', 'Thyrocare', 'Metropolis Healthcare'].map((lab) => {
                const isSelected = selectedLabFilter.toLowerCase() === lab.toLowerCase();
                return (
                  <button
                    key={lab}
                    type="button"
                    onClick={() => setSelectedLabFilter(lab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {lab}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search prescription..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Lab Selector for all 15 labs */}
              <select
                value={selectedLabFilter}
                onChange={(e) => setSelectedLabFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All 15 Labs</option>
                {DIAGNOSTIC_LABS.map((lab) => (
                  <option key={lab.id} value={lab.name}>
                    🔬 {lab.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {(() => {
            const filteredPrescriptions = prescriptionList.filter((doc) => {
              const matchesLab =
                selectedLabFilter === 'ALL' ||
                (doc.diagnosticLab || 'Dr Lal PathLabs').toLowerCase() ===
                  selectedLabFilter.toLowerCase();
              const q = docSearchQuery.toLowerCase().trim();
              const matchesQuery =
                !q ||
                doc.title.toLowerCase().includes(q) ||
                doc.patientName.toLowerCase().includes(q) ||
                doc.patientCode.toLowerCase().includes(q) ||
                doc.doctorName.toLowerCase().includes(q);
              return matchesLab && matchesQuery;
            });

            if (filteredPrescriptions.length === 0) {
              return (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-700 font-bold">
                    No prescription documents found matching the filter.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When doctors upload prescriptions, they will appear here in real-time.
                  </p>
                </div>
              );
            }

            return prescriptionViewMode === 'card' ? (
              /* PRESCRIPTIONS CARD GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrescriptions.map((doc) => {
                  const labStyle = getLabColor(doc.diagnosticLab);
                  return (
                    <div
                      key={doc.id}
                      className="card-hover-lift bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${labStyle.border.replace('border-', 'bg-')}`} />

                      <div>
                        {/* Top: Lab badge & version */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${labStyle.bg}`}>
                            <FlaskConical className="w-3 h-3" />
                            <span>{doc.diagnosticLab || 'Dr Lal PathLabs'}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            v{doc.currentVersion}
                          </span>
                        </div>

                        {/* Document Title */}
                        <h4 className="text-sm font-bold text-slate-900 mt-3 line-clamp-1">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Category: {doc.category.replace(/_/g, ' ')}
                        </p>

                        {/* Patient & Doctor */}
                        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Patient:</span>
                            <span className="font-bold text-slate-800">{doc.patientName}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Code:</span>
                            <span className="font-mono text-slate-600 text-[11px]">{doc.patientCode}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500">Doctor:</span>
                            <span className="font-semibold text-slate-700">{doc.doctorName}</span>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="text-slate-700 font-medium">{formatDate(doc.createdAt)}</span>
                            <span className="ml-1.5 font-mono text-[10px] text-indigo-600 font-semibold">
                              {new Date(doc.createdAt).toLocaleTimeString('en-IN', {
                                hour12: true,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                          <span className="font-mono">{formatBytes(doc.fileSize)}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-teal-600" />}
                          className="text-xs flex-1"
                        >
                          Preview
                        </Button>
                        <a
                          href={`/api/prescriptions/${doc.id}/download`}
                          download
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex-1"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* PRESCRIPTIONS TABLE VIEW */
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Diagnostic Lab</th>
                      <th className="py-3 px-4">Patient Name & Code</th>
                      <th className="py-3 px-4">Attending Doctor</th>
                      <th className="py-3 px-4">Upload Date</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPrescriptions.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {doc.title}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Category: {doc.category.replace(/_/g, ' ')} &bull; v{doc.currentVersion}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-800">
                            <FlaskConical className="w-3 h-3 text-teal-600" />
                            <span>{doc.diagnosticLab || 'Dr Lal PathLabs'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {doc.patientName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {doc.patientCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {doc.doctorName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-medium text-slate-800">{formatDate(doc.createdAt)}</div>
                          <div className="text-[10px] font-mono text-indigo-600 font-semibold">
                            {new Date(doc.createdAt).toLocaleTimeString('en-IN', {
                              hour12: true,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{formatBytes(doc.fileSize)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc(doc)}
                              leftIcon={<Eye className="w-3.5 h-3.5 text-teal-600" />}
                              className="text-xs"
                            >
                              Preview
                            </Button>
                            <a
                              href={`/api/prescriptions/${doc.id}/download`}
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
            );
          })()}
        </CardContent>
      </Card>

      {/* Recent Clinic Audit Logs */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Security & Compliance Audit Trail</CardTitle>
          <span className="text-xs text-slate-400">Strictly Scope-Isolated</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {recentAudits.map((a) => (
              <div key={a.id} className="p-3.5 flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {a.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    User: <strong className="text-slate-700">{a.userName}</strong> ({a.userRole})
                  </p>
                  {a.metadata && (
                    <p className="text-[11px] font-mono text-slate-400 mt-1 bg-slate-50 p-1.5 rounded">
                      {JSON.stringify(a.metadata)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Provision Doctor */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision Healthcare Provider"
        description="Create an authorized doctor account for your organization. Public self-registration is strictly prohibited."
        maxWidth="md"
      >
        <form onSubmit={handleProvisionDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={provisionForm.fullName}
              onChange={(e) =>
                setProvisionForm({ ...provisionForm, fullName: e.target.value })
              }
              placeholder="e.g. Dr. Kavita Deshmukh"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={provisionForm.email}
              onChange={(e) =>
                setProvisionForm({ ...provisionForm, email: e.target.value })
              }
              placeholder="dr.kavita@apollo.org"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Specialization
            </label>
            <input
              type="text"
              value={provisionForm.specialization}
              onChange={(e) =>
                setProvisionForm({ ...provisionForm, specialization: e.target.value })
              }
              placeholder="e.g. Consultant Neurologist"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Medical Council Registration Number
            </label>
            <input
              type="text"
              value={provisionForm.registrationNumber}
              onChange={(e) =>
                setProvisionForm({ ...provisionForm, registrationNumber: e.target.value })
              }
              placeholder="e.g. MCI-2015-8849"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Account Password
            </label>
            <input
              type="text"
              value={provisionForm.password}
              onChange={(e) =>
                setProvisionForm({ ...provisionForm, password: e.target.value })
              }
              placeholder="e.g. Healthcare@2026 (Leave blank for default)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Doctor will use this email &amp; password to log in. Default is <code>Healthcare@2026</code>.
            </p>
          </div>

          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-xs text-teal-800">
            Account will be created instantly. The physician can log in immediately at <code>/doctor/login</code>.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsProvisionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Update Doctor: ${editingDoctor?.fullName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Doctor Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Specialization
            </label>
            <input
              type="text"
              value={editForm.specialization}
              onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
              placeholder="e.g. Senior Cardiologist"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Save Doctor Changes
            </Button>
          </div>
        </form>
      </Modal>

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

            <div className="w-full h-[550px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
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
