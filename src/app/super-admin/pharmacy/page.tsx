import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PharmacyClient from '@/app/doctor/pharmacy/pharmacy-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminPharmacyPage() {
  const user = await getAdminSession();
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const providers = await prisma.pharmacyProvider.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <PharmacyClient
      userRole="SUPER_ADMIN"
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
