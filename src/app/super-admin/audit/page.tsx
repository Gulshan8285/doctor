import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminAuditPage() {
  const user = await getAdminSession();
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      user: { select: { fullName: true, role: true, email: true } },
      organization: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Global Security & Access Audit Log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete, non-repudiable audit trail spanning all clinics, authentication attempts, and document operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Security Feed ({events.length} events)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 flex items-start gap-3.5 text-xs hover:bg-slate-50/70 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {ev.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(ev.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 mt-0.5">
                    <span>
                      Actor: <strong>{ev.user?.fullName || 'System'}</strong> ({ev.user?.role || 'SYSTEM'})
                    </span>
                    <span>&bull;</span>
                    <span>Tenant: {ev.organization?.name || 'Platform Governance'}</span>
                    {ev.ipAddress && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-[11px] text-slate-400">IP: {ev.ipAddress}</span>
                      </>
                    )}
                  </div>
                  {ev.metadata && (
                    <p className="text-[11px] font-mono text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                      {ev.metadata}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
