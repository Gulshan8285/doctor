import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Building2, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminSettingsPage() {
  const user = await getAdminSession();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId! },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Clinic Configuration & Compliance Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review legal establishment credentials, clinical delegate caps, and data retention policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                Clinic Name
              </span>
              <p className="font-bold text-sm text-slate-800 mt-0.5">{org?.name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                License / Registration Number
              </span>
              <p className="font-mono text-slate-800 mt-0.5">{org?.licenseNumber || 'None'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                Location & Jurisdiction
              </span>
              <p className="text-slate-800 mt-0.5">
                {org?.city}, {org?.country}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & Policy Invariants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Delegate Cap Enforced
                </span>
                <span className="text-[11px] text-slate-500">
                  Each physician is strictly limited to 3 active delegated team members.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Prescription Immutability
                </span>
                <span className="text-[11px] text-slate-500">
                  Finalized prescriptions cannot be silently edited. Version addendums require
                  justification.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
