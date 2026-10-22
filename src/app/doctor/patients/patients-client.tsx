'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, Eye, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface PatientSummary {
  id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  dob: string | null;
  gender: string | null;
  createdAt: string;
  documentCount: number;
}

interface PatientsClientProps {
  userRole: string;
  initialPatients: PatientSummary[];
  permissions: string[];
}

export default function PatientsClient({
  userRole,
  initialPatients,
  permissions,
}: PatientsClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientSummary[]>(initialPatients);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

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
  });

  const canAdd = userRole === 'DOCTOR' || permissions.includes('UPDATE_PATIENT_DETAILS');

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientCode.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  const handleSavePatient = async (confirmDuplicate = false) => {
    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientForm, confirmDuplicate }),
      });

      const data = await res.json();

      if (res.status === 409 && data.isDuplicateWarning) {
        setDuplicateWarning(data);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        toast({ title: 'Registration Failed', description: data.error, type: 'error' });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Patient Added',
        description: `Created patient record ${data.patient.patientCode}`,
        type: 'success',
      });

      setIsAddPatientOpen(false);
      router.push(`/doctor/patients/${data.patient.id}`);
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Patient Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete database of patients assigned to your clinical care.
          </p>
        </div>
        {canAdd && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddPatientOpen(true)}
          >
            Add New Patient
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by patient name, phone number, email, or Patient ID..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPatients.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No Matching Patients"
                description={
                  searchTerm
                    ? `No patient records match the search term "${searchTerm}".`
                    : 'No patients found under your supervision.'
                }
                action={
                  canAdd ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddPatientOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Register New Patient
                    </Button>
                  ) : undefined
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
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Demographics</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4 text-center">Prescriptions</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/doctor/patients/${p.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                        {p.patientCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {p.fullName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                        {p.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{p.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.gender || 'N/A'} {p.dob ? `(${formatDate(p.dob)})` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-800">{formatDate(p.createdAt)}</div>
                        <div className="text-[10px] font-mono text-teal-700 font-medium">
                          {new Date(p.createdAt).toLocaleTimeString('en-IN', {
                            hour12: true,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={p.documentCount > 0 ? 'teal' : 'slate'}>
                          {p.documentCount} {p.documentCount === 1 ? 'doc' : 'docs'}
                        </Badge>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/doctor/patients/${p.id}`} prefetch={true}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Profile
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

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Register New Patient"
        description="Fill in patient details. A unique Patient ID will be assigned."
        maxWidth="lg"
      >
        {duplicateWarning ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{duplicateWarning.warning}</span>
            </div>
            <p className="text-[11px] text-amber-700">Possible existing matches:</p>
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
                Revise Details
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleSavePatient(true)}
                isLoading={isSubmitting}
              >
                Confirm & Create Record
              </Button>
            </div>
          </div>
        ) : (
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
                  Email Address
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
                isLoading={isSubmitting}
              >
                Save Patient Record
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
