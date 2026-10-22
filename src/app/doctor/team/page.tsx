import React from 'react';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TeamClient from './team-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TeamAccessPage() {
  const user = await getDoctorSession();
  if (!user) redirect('/doctor/login');

  if (user.role !== 'DOCTOR') {
    redirect('/doctor');
  }

  const [delegates, doctorProfile] = await Promise.all([
    prisma.delegatedAccess.findMany({
      where: { doctorId: user.userId },
      include: {
        staffUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            lastLoginAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
      select: { maxDelegates: true },
    }),
  ]);

  const activeCount = delegates.filter(
    (d) => d.status === 'ACTIVE' || d.status === 'PENDING'
  ).length;

  return (
    <TeamClient
      initialDelegates={delegates.map((d) => ({
        id: d.id,
        invitedEmail: d.invitedEmail,
        invitedName: d.invitedName,
        status: d.status,
        permissions: JSON.parse(d.permissions || '[]'),
        createdAt: d.createdAt.toISOString(),
        expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
        revokedAt: d.revokedAt ? d.revokedAt.toISOString() : null,
        staffUser: d.staffUser
          ? {
              ...d.staffUser,
              lastLoginAt: d.staffUser.lastLoginAt
                ? d.staffUser.lastLoginAt.toISOString()
                : null,
            }
          : null,
      }))}
      activeCount={activeCount}
      maxAllowed={doctorProfile?.maxDelegates || 3}
    />
  );
}
