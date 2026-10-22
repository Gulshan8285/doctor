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
  if (!user) redirect('/doctor/login');

  const { id } = await params;

  // Fetch full patient profile and activity concurrently in a single database round-trip
  const [patient, activity] = await Promise.all([
    prisma.patient.findUnique({
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
    }),
    prisma.auditEvent.findMany({
      where: {
        resourceType: { in: ['PATIENT', 'DOCUMENT'] },
        resourceId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: { select: { fullName: true, role: true } },
      },
    }),
  ]);

  if (!patient) notFound();

  // Instant RBAC check
  if (user.role === 'DOCTOR' && patient.doctorId !== user.userId) {
    notFound();
  }
  if (user.role === 'DELEGATED_STAFF' && patient.doctorId !== user.delegatedDoctorId) {
    notFound();
  }
  if (user.role === 'ADMIN' && patient.organizationId !== user.organizationId) {
    notFound();
  }

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
