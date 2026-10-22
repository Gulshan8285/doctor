import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DoctorDashboardClient from './doctor-dashboard-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DoctorDashboardPage() {
  const user = await getDoctorSession();
  if (!user) return null;

  const targetDoctorId = user.role === 'DOCTOR' ? user.userId : user.delegatedDoctorId;

  // Calculate start of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch real statistics in parallel
  const [
    totalPatients,
    totalPrescriptions,
    monthUploads,
    activeDelegates,
    recentPatients,
    doctorProfile,
  ] = await Promise.all([
    prisma.patient.count({ where: { doctorId: targetDoctorId! } }),
    prisma.prescriptionDocument.count({ where: { doctorId: targetDoctorId! } }),
    prisma.prescriptionDocument.count({
      where: {
        doctorId: targetDoctorId!,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.delegatedAccess.count({
      where: {
        doctorId: targetDoctorId!,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    }),
    prisma.patient.findMany({
      where: { doctorId: targetDoctorId! },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        _count: { select: { documents: true } },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, title: true },
        },
      },
    }),
    user.role === 'DOCTOR'
      ? prisma.doctorProfile.findUnique({
          where: { userId: user.userId },
          include: { preferredPharmacy: { select: { name: true } } },
        })
      : null,
  ]);

  const initialStats = {
    totalPatients,
    totalPrescriptions,
    monthUploads,
    activeDelegates,
    maxDelegates: doctorProfile?.maxDelegates || 3,
    preferredPharmacy: doctorProfile?.preferredPharmacy?.name || 'Not Configured',
  };

  const initialPatients = recentPatients.map((p) => ({
    id: p.id,
    patientCode: p.patientCode,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    documentCount: p._count.documents,
    latestUploadDate: p.documents[0]?.createdAt
      ? p.documents[0].createdAt.toISOString()
      : null,
    latestUploadTitle: p.documents[0]?.title || null,
    diagnosticLab: p.diagnosticLab || 'Dr Lal PathLabs',
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <DoctorDashboardClient
      userRole={user.role}
      initialStats={initialStats}
      initialPatients={initialPatients}
      permissions={user.permissions || []}
    />
  );
}
