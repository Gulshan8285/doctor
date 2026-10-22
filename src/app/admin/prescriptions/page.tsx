import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminPrescriptionsClient, { AdminDocItem } from './admin-prescriptions-client';

export const dynamic = 'force-dynamic';

export default async function AdminPrescriptionsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  const orgId = user.organizationId;

  const docs = await prisma.prescriptionDocument.findMany({
    where: orgId ? { organizationId: orgId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { fullName: true, patientCode: true } },
      doctor: { select: { fullName: true } },
      uploadedBy: { select: { fullName: true } },
    },
  });

  const formattedDocs: AdminDocItem[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    diagnosticLab: d.diagnosticLab || 'Dr Lal PathLabs',
    patientName: d.patient.fullName,
    patientCode: d.patient.patientCode,
    doctorName: d.doctor.fullName,
    uploadedByName: d.uploadedBy.fullName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    fileHash: d.fileHash,
    currentVersion: d.currentVersion,
    createdAt: d.createdAt.toISOString(),
  }));

  return <AdminPrescriptionsClient initialDocs={formattedDocs} />;
}
