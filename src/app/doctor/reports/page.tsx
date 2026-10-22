import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReportsClient from './reports-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  const user = await getDoctorSession();
  if (!user) redirect('/doctor/login');

  const targetDoctorId = user.role === 'DOCTOR' ? user.userId : user.delegatedDoctorId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPatients, totalDocs, monthDocs, docsByCategory, recentUploads] =
    await Promise.all([
      prisma.patient.count({ where: { doctorId: targetDoctorId! } }),
      prisma.prescriptionDocument.count({ where: { doctorId: targetDoctorId! } }),
      prisma.prescriptionDocument.count({
        where: { doctorId: targetDoctorId!, createdAt: { gte: startOfMonth } },
      }),
      prisma.prescriptionDocument.groupBy({
        by: ['category'],
        where: { doctorId: targetDoctorId! },
        _count: { id: true },
      }),
      prisma.prescriptionDocument.findMany({
        where: { doctorId: targetDoctorId! },
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
