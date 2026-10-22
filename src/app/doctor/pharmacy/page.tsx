import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PharmacyClient from './pharmacy-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PharmacyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/doctor/login');

  const [providers, profile] = await Promise.all([
    prisma.pharmacyProvider.findMany({
      orderBy: { name: 'asc' },
    }),
    user.role === 'DOCTOR'
      ? prisma.doctorProfile.findUnique({
          where: { userId: user.userId },
          include: { preferredPharmacy: true },
        })
      : null,
  ]);

  return (
    <PharmacyClient
      userRole={user.role}
      providers={providers.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        website: p.website,
        description: p.description,
        serviceRegion: p.serviceRegion,
        connectionType: p.connectionType,
        isActive: p.isActive,
        apiNotes: p.apiNotes,
      }))}
      currentPreference={
        profile?.preferredPharmacyId
          ? {
              providerId: profile.preferredPharmacyId,
              providerName: profile.preferredPharmacy?.name || null,
              notes: profile.pharmacyNotes,
            }
          : null
      }
    />
  );
}
