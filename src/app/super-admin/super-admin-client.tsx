'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Clock,
  Activity,
  Server,
  Lock,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime } from '@/lib/utils';

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  licenseNumber: string | null;
  city: string | null;
  createdAt: string;
  userCount: number;
  patientCount: number;
  docCount: number;
}

interface AuditItem {
  id: string;
  action: string;
  resourceType: string;
  userName: string;
  userRole: string;
  orgName: string;
  ipAddress: string | null;
  createdAt: string;
  metadata: any;
}

interface SuperAdminClientProps {
  stats: {
    totalOrganizations: number;
    totalUsers: number;
    totalPatients: number;
    totalPrescriptions: number;
    totalAuditEvents: number;
  };
  organizations: OrgItem[];
  auditEvents: AuditItem[];
}

export default function SuperAdminClient({
  stats,
  organizations,
  auditEvents,
}: SuperAdminClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    slug: '',
    licenseNumber: '',
    city: 'Hyderabad',
    adminName: '',
    adminEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOnboardOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Onboarding Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Clinic Registered',
        description: data.message,
        type: 'success',
      });

      setIsOnboardOpen(false);
      setOnboardForm({
        name: '',
        slug: '',
        licenseNumber: '',
        city: 'Hyderabad',
        adminName: '',
        adminEmail: '',
      });
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Platform Super Admin Console
            </h1>
            <Badge variant="purple">MFA Active</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global governance, tenant clinic onboarding, and cross-organization security oversight.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsOnboardOpen(true)}
        >
          Onboard New Clinic
        </Button>
      </div>

      {/* Platform Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card>
          <CardContent className="p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Clinics / Orgs
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalOrganizations}
              </h3>
              <p className="text-[10px] text-teal-600 font-medium mt-0.5">Active Tenants</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Users
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{stats.totalUsers}</h3>
              <p className="text-[10px] text-sky-600 font-medium mt-0.5">Doctors & Staff</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Platform Patients
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{stats.totalPatients}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">All Clinics</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Prescriptions
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalPrescriptions}
              </h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Hashed Vaults</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Audit Trail
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalAuditEvents}
              </h3>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5">Logged Events</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">PostgreSQL 16 Engine</span>
            <span className="text-[10px] text-slate-500">Connected & Synced</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">Cryptographic Vault</span>
            <span className="text-[10px] text-slate-500">SHA-256 Active</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">MFA Security Gate</span>
            <span className="text-[10px] text-slate-500">Enforced for Super Admin</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">DPDP Act Compliance</span>
            <span className="text-[10px] text-slate-500">Audit & Scoping Active</span>
          </div>
        </div>
      </div>

      {/* Organizations Directory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarded Healthcare Organizations & Clinics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Slug / Identifier</th>
                  <th className="py-3 px-4">License / Location</th>
                  <th className="py-3 px-4 text-center">Users</th>
                  <th className="py-3 px-4 text-center">Patients</th>
                  <th className="py-3 px-4 text-center">Prescriptions</th>
                  <th className="py-3 px-4">Onboarded</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {org.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{org.slug}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span>{org.licenseNumber || 'License N/A'}</span> &bull;{' '}
                      <span className="text-slate-500">{org.city || 'India'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {org.userCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {org.patientCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {org.docCount}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant="emerald">Live Tenant</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Global Audit Trail */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Global Platform Security & Audit Trail</CardTitle>
          <span className="text-xs text-slate-400">Real-time Platform Feed</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {auditEvents.map((a) => (
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
                  <div className="flex flex-wrap items-center gap-2 text-slate-500 mt-0.5">
                    <span>
                      Actor: <strong className="text-slate-700">{a.userName}</strong> ({a.userRole})
                    </span>
                    <span>&bull;</span>
                    <span>Clinic: {a.orgName}</span>
                    {a.ipAddress && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-[10px]">IP: {a.ipAddress}</span>
                      </>
                    )}
                  </div>
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

      {/* Modal: Onboard Clinic */}
      <Modal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        title="Onboard Healthcare Organization"
        description="Provision a new clinic tenant along with its initial organization administrator."
        maxWidth="md"
      >
        <form onSubmit={handleOnboardOrg} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization / Clinic Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={onboardForm.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '-')
                  .replace(/-+/g, '-');
                setOnboardForm({ ...onboardForm, name, slug });
              }}
              placeholder="e.g. Fortis Healthcare Center"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slug <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={onboardForm.slug}
                onChange={(e) =>
                  setOnboardForm({ ...onboardForm, slug: e.target.value })
                }
                placeholder="fortis-health"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={onboardForm.city}
                onChange={(e) =>
                  setOnboardForm({ ...onboardForm, city: e.target.value })
                }
                placeholder="e.g. Bengaluru"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Establishment License Number
            </label>
            <input
              type="text"
              value={onboardForm.licenseNumber}
              onChange={(e) =>
                setOnboardForm({ ...onboardForm, licenseNumber: e.target.value })
              }
              placeholder="e.g. KA-CLINIC-2024-9912"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 block mb-2">
              Initial Organization Administrator:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Admin Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={onboardForm.adminName}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, adminName: e.target.value })
                  }
                  placeholder="e.g. Rajiv Menon"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Admin Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={onboardForm.adminEmail}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, adminEmail: e.target.value })
                  }
                  placeholder="admin@fortis.org"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-xs text-teal-800">
            Default temporary password will be <code>ClinicAdmin@2026</code>. The administrator will
            be prompted to change credentials.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsOnboardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Onboard Organization
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
