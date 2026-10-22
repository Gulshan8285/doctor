import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PatientsClient from './patients-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PatientsPage() {
  const user = await getDoctorSession();
  if (!user) return null;

  const targetDoctorId = user.role === 'DOCTOR' ? user.userId : user.delegatedDoctorId;

  const initialPatients = await prisma.patient.findMany({
    where: { doctorId: targetDoctorId! },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { documents: true } },
    },
  });

  return (
    <PatientsClient
      userRole={user.role}
      initialPatients={initialPatients.map((p) => ({
        id: p.id,
        patientCode: p.patientCode,
        fullName: p.fullName,
        phone: p.phone,
        email: p.email,
        dob: p.dob ? p.dob.toISOString() : null,
        gender: p.gender,
        createdAt: p.createdAt.toISOString(),
        documentCount: p._count.documents,
      }))}
      permissions={user.permissions || []}
    />
  );
}
