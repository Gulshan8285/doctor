import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, FileText, Search, ShieldCheck, Plus, Upload } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffWorkspacePage() {
  const user = await getDoctorSession();
  if (!user || user.role !== 'DELEGATED_STAFF') {
    redirect('/login');
  }

  const supervisingDoctor = await prisma.user.findUnique({
    where: { id: user.delegatedDoctorId! },
    include: {
      doctorProfile: { select: { specialization: true, clinicName: true } },
    },
  });

  const patients = await prisma.patient.findMany({
    where: { doctorId: user.delegatedDoctorId! },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { _count: { select: { documents: true } } },
  });

  const permissions = user.permissions || [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Staff Clinical Workspace
            </h1>
            <Badge variant="blue">Delegated Assistant</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervising Physician: <strong>{supervisingDoctor?.fullName}</strong> &bull;{' '}
            {supervisingDoctor?.doctorProfile?.specialization || 'Cardiology'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {permissions.includes('UPLOAD_DOCUMENTS') && (
            <Link href="/doctor/prescriptions">
              <Button variant="primary" size="md" leftIcon={<Upload className="w-4 h-4" />}>
                Upload Prescription
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Granted Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Privileges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">
            You have been granted the following clinical permissions by{' '}
            <strong>{supervisingDoctor?.fullName}</strong>:
          </p>
          <div className="flex flex-wrap gap-2">
            {permissions.map((p) => (
              <Badge key={p} variant="teal" className="py-1 px-3 text-xs">
                {p.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Doctor Patients */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Patients Under Supervising Physician</CardTitle>
          <Link href="/doctor/search">
            <Button variant="outline" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
              Search All Patients
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4 text-center">Prescriptions</th>
                  <th className="py-3 px-4 text-right">Action</th>
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
                    <td className="py-3.5 px-4 text-slate-600">{p.gender || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="teal">{p._count.documents} docs</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/doctor/patients/${p.id}`}>
                        <Button variant="outline" size="sm">
                          View File
                        </Button>
                      </Link>
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
