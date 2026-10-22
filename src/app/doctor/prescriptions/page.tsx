import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PrescriptionsVaultClient from './prescriptions-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrescriptionsPage() {
  const user = await getDoctorSession();
  if (!user) return null;

  const targetDoctorId = user.role === 'DOCTOR' ? user.userId : user.delegatedDoctorId;

  const [documents, patients] = await Promise.all([
    prisma.prescriptionDocument.findMany({
      where: { doctorId: targetDoctorId! },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, patientCode: true, phone: true } },
        uploadedBy: { select: { fullName: true, role: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: { select: { fullName: true } } },
        },
      },
    }),
    prisma.patient.findMany({
      where: { doctorId: targetDoctorId! },
      select: { id: true, fullName: true, patientCode: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return (
    <PrescriptionsVaultClient
      userRole={user.role}
      initialDocuments={documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        documentDate: d.documentDate.toISOString(),
        versions: d.versions.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        })),
      }))}
      patients={patients}
      permissions={user.permissions || []}
    />
  );
}
