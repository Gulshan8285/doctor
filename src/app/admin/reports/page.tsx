import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReportsClient from '@/app/doctor/reports/reports-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminReportsPage() {
  const user = await getAdminSession();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  const orgId = user.organizationId;
  const orgFilter = orgId ? { organizationId: orgId } : {};
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPatients, totalDocs, monthDocs, docsByCategory, recentUploads] =
    await Promise.all([
      prisma.patient.count({ where: orgFilter }),
      prisma.prescriptionDocument.count({ where: orgFilter }),
      prisma.prescriptionDocument.count({
        where: { ...orgFilter, createdAt: { gte: startOfMonth } },
      }),
      prisma.prescriptionDocument.groupBy({
        by: ['category'],
        where: { organizationId: orgId! },
        _count: { id: true },
      }),
      prisma.prescriptionDocument.findMany({
        where: { organizationId: orgId! },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          patient: { select: { fullName: true, patientCode: true } },
          uploadedBy: { select: { fullName: true } },
        },
      }),
    ]);

  return (
    <ReportsClient
      summary={{
        totalPatients,
        totalDocs,
        monthDocs,
      }}
      categoryBreakdown={docsByCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      }))}
      recentUploads={recentUploads.map((u) => ({
        id: u.id,
        title: u.title,
        category: u.category,
        patientName: u.patient?.fullName || 'N/A',
        patientCode: u.patient?.patientCode || 'N/A',
        uploaderName: u.uploadedBy?.fullName || 'Physician',
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
