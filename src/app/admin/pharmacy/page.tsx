import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PharmacyClient from '@/app/doctor/pharmacy/pharmacy-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPharmacyPage() {
  const user = await getAdminSession();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
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
