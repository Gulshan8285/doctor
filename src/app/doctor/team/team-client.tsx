'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Plus,
  ShieldAlert,
  Trash2,
  Edit2,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime } from '@/lib/utils';

interface DelegateItem {
  id: string;
  invitedEmail: string;
  invitedName: string | null;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
  permissions: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  staffUser?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    lastLoginAt: string | null;
    status: string;
  } | null;
}

interface TeamClientProps {
  initialDelegates: DelegateItem[];
  activeCount: number;
  maxAllowed: number;
}

const ALL_PERMISSIONS = [
  {
    key: 'VIEW_PATIENTS',
    label: 'View Patient Demographics',
    description: 'Allows viewing assigned patient profiles and contact cards.',
  },
  {
    key: 'SEARCH_PATIENTS',
    label: 'Search Patient Records',
    description: 'Permits searching patients by name, phone, or Patient ID.',
  },
  {
    key: 'UPDATE_PATIENT_DETAILS',
    label: 'Update Contact Information',
    description: 'Permits updating address and emergency contact details.',
  },
  {
    key: 'ADD_NOTES',
    label: 'Add Non-Clinical Notes',
    description: 'Permits adding administrative notes and scheduling follow-ups.',
  },
  {
    key: 'UPLOAD_DOCUMENTS',
    label: 'Upload Supporting Documents',
    description: 'Permits uploading diagnostic lab tests or supporting documents.',
  },
  {
    key: 'VIEW_PRESCRIPTIONS',
    label: 'View Finalized Prescriptions',
    description: 'Allows in-browser authenticated preview of prescriptions.',
  },
  {
    key: 'DOWNLOAD_PRESCRIPTIONS',
    label: 'Download Prescriptions',
    description: 'Permits downloading offline copies of prescription files.',
  },
  {
    key: 'VIEW_REPORTS',
    label: 'View Operational Reports',
    description: 'Permits viewing summary analytics and operational trends.',
  },
];

export default function TeamClient({
  initialDelegates,
  activeCount,
  maxAllowed,
}: TeamClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [delegates, setDelegates] = useState<DelegateItem[]>(initialDelegates);
  const [currentActiveCount, setCurrentActiveCount] = useState(activeCount);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'VIEW_PATIENTS',
    'SEARCH_PATIENTS',
    'UPLOAD_DOCUMENTS',
    'VIEW_PRESCRIPTIONS',
    'DOWNLOAD_PRESCRIPTIONS',
  ]);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Revoke confirmation modal state
  const [revokeTarget, setRevokeTarget] = useState<DelegateItem | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  // Edit permissions modal state
  const [editTarget, setEditTarget] = useState<DelegateItem | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const isLimitReached = currentActiveCount >= maxAllowed;

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleEditPermission = (key: string) => {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPermissions.length === 0) {
      toast({ title: 'Permissions Required', description: 'Select at least one permission for the delegate.', type: 'error' });
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Invitation Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Invitation Issued',
        description: `Delegation invitation generated for ${inviteEmail}`,
        type: 'success',
      });

      if (data.delegation) {
        setDelegates((prev) => [
          {
            id: data.delegation.id,
            invitedEmail: data.delegation.invitedEmail,
            invitedName: data.delegation.invitedName,
            status: data.delegation.status,
            permissions: typeof data.delegation.permissions === 'string' ? JSON.parse(data.delegation.permissions) : data.delegation.permissions,
            createdAt: data.delegation.createdAt,
            expiresAt: data.delegation.expiresAt,
            revokedAt: null,
            staffUser: null,
          },
          ...prev,
        ]);
        setCurrentActiveCount((c) => c + 1);
      }

      setIsInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    const previousDelegates = delegates;
    const previousCount = currentActiveCount;

    // Optimistic instant update (0ms lag)
    setDelegates((prev) =>
      prev.map((d) => (d.id === target.id ? { ...d, status: 'REVOKED' as const, revokedAt: new Date().toISOString() } : d))
    );
    setCurrentActiveCount((c) => Math.max(0, c - 1));
    setRevokeTarget(null);

    toast({
      title: 'Access Revoked Immediately',
      description: `Team member ${target.invitedEmail} no longer has access to your records.`,
      type: 'success',
    });

    try {
      const res = await fetch(`/api/team?id=${target.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on error
        setDelegates(previousDelegates);
        setCurrentActiveCount(previousCount);
        toast({ title: 'Revocation Failed', description: data.error, type: 'error' });
        return;
      }

      router.refresh();
    } catch {
      setDelegates(previousDelegates);
      setCurrentActiveCount(previousCount);
      toast({ title: 'Error', description: 'Could not revoke access', type: 'error' });
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const target = editTarget;
    const newPerms = [...editPermissions];
    const previousDelegates = delegates;

    // Optimistic instant update (0ms lag)
    setDelegates((prev) =>
      prev.map((d) => (d.id === target.id ? { ...d, permissions: newPerms } : d))
    );
    setEditTarget(null);

    toast({
      title: 'Permissions Updated',
      description: 'Updated permissions applied immediately.',
      type: 'success',
    });

    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegationId: target.id,
          permissions: newPerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDelegates(previousDelegates);
        toast({ title: 'Update Failed', description: data.error, type: 'error' });
        return;
      }

      router.refresh();
    } catch {
      setDelegates(previousDelegates);
      toast({ title: 'Error', description: 'Failed to update permissions', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Team Access & Delegation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Delegate clinical support duties to up to 3 authorized team members with granular
            permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={isLimitReached}
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsInviteOpen(true)}
        >
          {isLimitReached ? 'Slot Limit Reached (3/3)' : 'Invite Team Member'}
        </Button>
      </div>

      {/* Delegation Capacity Card */}
      <div className="p-4 rounded-xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            {currentActiveCount}/{maxAllowed}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Active Delegation Slots
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLimitReached
                ? 'All 3 active delegation slots are occupied. Revoke an existing member to add a replacement.'
                : `You can invite ${maxAllowed - currentActiveCount} more team member(s) under your supervision.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400">Strict Limit:</span>
          <Badge variant="purple">Max {maxAllowed} Active Delegates</Badge>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized Clinical Delegates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {delegates.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={UserCheck}
                title="No Team Members Invited"
                description="Invite medical assistants, clinic receptionists, or junior fellows to support your practice."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsInviteOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Invite First Delegate
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name & Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Granted Permissions</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {delegates.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {d.staffUser?.fullName || d.invitedName || 'Invited Staff'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {d.invitedEmail}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {d.status === 'ACTIVE' && (
                          <Badge variant="emerald">Active Access</Badge>
                        )}
                        {d.status === 'PENDING' && (
                          <Badge variant="amber">Invitation Pending</Badge>
                        )}
                        {d.status === 'REVOKED' && (
                          <Badge variant="rose">Access Revoked</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {d.permissions.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium"
                            >
                              {p.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {d.permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-bold">
                              +{d.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {d.staffUser?.lastLoginAt ? (
                          formatDateTime(d.staffUser.lastLoginAt)
                        ) : (
                          <span className="text-slate-400 italic">No recent login</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {d.status !== 'REVOKED' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit2 className="w-3 h-3 text-slate-500" />}
                              onClick={() => {
                                setEditTarget(d);
                                setEditPermissions(d.permissions);
                              }}
                            >
                              Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              leftIcon={<Trash2 className="w-3 h-3" />}
                              onClick={() => setRevokeTarget(d)}
                            >
                              Revoke
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Revoked on {formatDate(d.revokedAt)}
                          </span>
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

      {/* MODAL 1: INVITE DELEGATE */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Delegated Team Member"
        description="Provide staff details and select granular access permissions under your supervision."
        maxWidth="lg"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Priya Nair"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@hospital.org"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Permitted Privileges:
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-800 block">
                      {perm.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {perm.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Delegated staff can never modify original prescriptions or promote themselves to admin.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingInvite}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT PERMISSIONS */}
      {editTarget && (
        <Modal
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          title={`Modify Privileges: ${editTarget.staffUser?.fullName || editTarget.invitedEmail}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSavePermissions} className="space-y-4">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={editPermissions.includes(perm.key)}
                    onChange={() => toggleEditPermission(perm.key)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-800 block">
                      {perm.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {perm.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingEdit}
              >
                Apply Updated Permissions
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM REVOCATION */}
      {revokeTarget && (
        <Modal
          isOpen={Boolean(revokeTarget)}
          onClose={() => setRevokeTarget(null)}
          title="Revoke Delegated Access"
          description="Are you sure you want to revoke access for this team member?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Immediate Access Termination</p>
              <p>
                <strong>{revokeTarget.staffUser?.fullName || revokeTarget.invitedEmail}</strong> will
                immediately lose access to all patient files, prescriptions, and search endpoints
                under your account.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRevokeTarget(null)}
              >
                Keep Access
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmittingRevoke}
                onClick={handleRevokeConfirm}
              >
                Confirm Immediate Revocation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
