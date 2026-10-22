import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PharmacyClient from '@/app/doctor/pharmacy/pharmacy-client';

export default async function AdminPharmacyPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const providers = await prisma.pharmacyProvider.findMany({
    orderBy: { name: 'asc' },
  });

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
      currentPreference={null}
    />
  );
}
