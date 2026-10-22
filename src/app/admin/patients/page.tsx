import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminPatientsClient, { AdminPatientItem } from './admin-patients-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPatientsPage() {
  const user = await getAdminSession();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  const orgId = user.organizationId;

  const rawPatients = await prisma.patient.findMany({
    where: orgId ? { organizationId: orgId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      doctor: {
        select: {
          fullName: true,
          email: true,
          doctorProfile: { select: { specialization: true } },
        },
      },
      organization: { select: { name: true } },
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          diagnosticLab: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      },
      _count: { select: { documents: true } },
    },
  });

  const formattedPatients: AdminPatientItem[] = rawPatients.map((p) => ({
    id: p.id,
    patientCode: p.patientCode,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    gender: p.gender,
    dob: p.dob ? p.dob.toISOString() : null,
    address: p.address,
    emergencyContact: p.emergencyContactName
      ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` (${p.emergencyContactPhone})` : ''}`
      : null,
    doctorName: p.doctor?.fullName || 'Assigned Physician',
    doctorEmail: p.doctor?.email || null,
    doctorSpecialization: p.doctor?.doctorProfile?.specialization || 'General Physician',
    hospitalName: p.organization?.name || 'Apollo Hospital Central',
    documentCount: p._count.documents,
    documents: p.documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      diagnosticLab: d.diagnosticLab || 'Dr Lal PathLabs',
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      createdAt: d.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
  }));

  return <AdminPatientsClient initialPatients={formattedPatients} />;
}
