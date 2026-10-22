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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatBytes } from '@/lib/utils';
import { DIAGNOSTIC_LABS } from '@/lib/diagnostic-labs';

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

interface AdminDashboardClientProps {
  stats: {
    totalDoctors: number;
    totalPatients: number;
    totalPrescriptions: number;
    activeDelegates: number;
  };
  doctors: DoctorItem[];
  recentPrescriptions: PrescriptionItem[];
  recentAudits: AuditItem[];
}

export default function AdminDashboardClient({
  stats,
  doctors,
  recentPrescriptions = [],
  recentAudits,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: 'General Physician',
    registrationNumber: '',
  });

  // Document preview & filter state
  const [previewDoc, setPreviewDoc] = useState<PrescriptionItem | null>(null);
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('ALL');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');

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

      setIsProvisionOpen(false);
      setProvisionForm({
        fullName: '',
        email: '',
        phone: '',
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
      toast({ title: 'Error', description: 'Could not update status', type: 'error' });
    } finally {
      setIsTogglingStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Main Company Administration Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Company & Hospital Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Primary portal for the company owner. Add doctors, update profiles, grant/revoke access, and review clinic activity.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsProvisionOpen(true)}
        >
          + Add New Doctor
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Doctors
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalDoctors}</h3>
              <p className="text-[11px] text-teal-600 font-medium mt-1">Authorized Clinicians</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Clinic Patients
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalPatients}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Under Care in Org</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Prescriptions Vault
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalPrescriptions}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Hashed & Finalized</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Delegated Staff
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.activeDelegates}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium mt-1">Active Staff Slots</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctors & Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Medical Staff & Clinicians</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
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
                          className="text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant={doc.status === 'ACTIVE' ? 'ghost' : 'outline'}
                          size="sm"
                          isLoading={isTogglingStatus === doc.id}
                          className={
                            doc.status === 'ACTIVE'
                              ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold'
                              : 'text-teal-600 border-teal-300 hover:bg-teal-50 text-xs font-semibold'
                          }
                          onClick={() => handleToggleStatus(doc)}
                        >
                          {doc.status === 'ACTIVE' ? 'Revoke Access' : 'Grant Access'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* DOCTOR PRESCRIPTIONS & DOCUMENTS UPLOADED */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Doctor Prescription Uploads & Documents</CardTitle>
              <Badge variant="teal">{recentPrescriptions.length} Uploaded</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live feed of clinical prescriptions, diagnostic reports, and patient files uploaded by doctors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search prescription or patient..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-52 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter by Diagnostic Lab */}
            <select
              value={selectedLabFilter}
              onChange={(e) => setSelectedLabFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Diagnostic Labs ({DIAGNOSTIC_LABS.length})</option>
              {DIAGNOSTIC_LABS.map((lab) => (
                <option key={lab.id} value={lab.name}>
                  🔬 {lab.name}
                </option>
              ))}
            </select>

            <Link href="/admin/prescriptions">
              <Button variant="outline" size="sm" className="text-xs">
                View Full Registry &rarr;
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const filteredPrescriptions = recentPrescriptions.filter((doc) => {
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
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-bold">
                    No prescription documents found matching the filter.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When doctors upload prescriptions, they will appear here in real-time.
                  </p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
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
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(doc.createdAt)}</td>
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

          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-xs text-teal-800">
            A temporary password (<code>DoctorCare@2026</code>) will be set. The physician can update
            their credentials upon initial login.
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
        maxWidth="2xl"
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
