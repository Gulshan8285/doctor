import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Users, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminUsersPage() {
  const user = await getAdminSession();
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organization: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Platform User Accounts Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Master registry of Super Admins, Clinic Admins, Physicians, and Delegated Staff across all tenants.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Accounts ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Organization / Tenant</th>
                  <th className="py-3 px-4">MFA Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.role === 'SUPER_ADMIN'
                            ? 'purple'
                            : u.role === 'ADMIN'
                            ? 'blue'
                            : u.role === 'DOCTOR'
                            ? 'teal'
                            : 'slate'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {u.organization?.name || 'Platform Level'}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.mfaEnabled || u.role === 'SUPER_ADMIN' ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'ACTIVE' ? 'emerald' : 'rose'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
