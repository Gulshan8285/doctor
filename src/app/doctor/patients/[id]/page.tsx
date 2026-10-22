import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyPatientAccess } from '@/lib/permissions';
import PatientProfileClient from './patient-profile-client';

export const dynamic = 'force-dynamic';

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const access = await verifyPatientAccess(user, id);

  if (!access.allowed || !access.patient) {
    notFound();
  }

  // Fetch full patient profile
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      doctor: { select: { fullName: true, email: true, phone: true } },
      organization: { select: { name: true, city: true } },
      documents: {
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { fullName: true, role: true } },
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: { createdBy: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!patient) notFound();

  // Fetch audit activity
  const activity = await prisma.auditEvent.findMany({
    where: {
      resourceType: { in: ['PATIENT', 'DOCUMENT'] },
      OR: [
        { resourceId: id },
        { metadata: { contains: patient.patientCode } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { fullName: true, role: true } },
    },
  });

  return (
    <PatientProfileClient
      userRole={user.role}
      patient={{
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
        dob: patient.dob ? patient.dob.toISOString() : null,
        documents: patient.documents.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          documentDate: d.documentDate.toISOString(),
          versions: d.versions.map((v) => ({
            ...v,
            createdAt: v.createdAt.toISOString(),
          })),
        })),
      }}
      activity={activity.map((a) => ({
        id: a.id,
        action: a.action,
        resourceType: a.resourceType,
        userName: a.user?.fullName || 'System',
        createdAt: a.createdAt.toISOString(),
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
      }))}
      permissions={user.permissions || []}
    />
  );
}
