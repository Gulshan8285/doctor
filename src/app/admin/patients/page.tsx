import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Users } from 'lucide-react';

export default async function AdminPatientsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const patients = await prisma.patient.findMany({
    where: { organizationId: user.organizationId! },
    orderBy: { createdAt: 'desc' },
    include: {
      doctor: { select: { fullName: true } },
      _count: { select: { documents: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Clinic Patient Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Authorized organization-wide registry of all patients under clinic care.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Clinic Patients ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Attending Physician</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4 text-center">Prescriptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      {p.patientCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{p.phone}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.email || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-semibold text-teal-700">
                      {p.doctor?.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="teal">{p._count.documents} docs</Badge>
                    </td>
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
