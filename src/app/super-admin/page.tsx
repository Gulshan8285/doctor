import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SuperAdminClient from './super-admin-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminPage() {
  const user = await getAdminSession();
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const [organizations, stats, auditEvents] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, patients: true, documents: true },
        },
      },
    }),
    Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.patient.count(),
      prisma.prescriptionDocument.count(),
      prisma.auditEvent.count(),
    ]),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        user: { select: { fullName: true, role: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  return (
    <SuperAdminClient
      stats={{
        totalOrganizations: stats[0],
        totalUsers: stats[1],
        totalPatients: stats[2],
        totalPrescriptions: stats[3],
        totalAuditEvents: stats[4],
      }}
      organizations={organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        licenseNumber: o.licenseNumber,
        city: o.city,
        createdAt: o.createdAt.toISOString(),
        userCount: o._count.users,
        patientCount: o._count.patients,
        docCount: o._count.documents,
      }))}
      auditEvents={auditEvents.map((a) => ({
        id: a.id,
        action: a.action,
        resourceType: a.resourceType,
        userName: a.user?.fullName || 'System',
        userRole: a.user?.role || 'N/A',
        orgName: a.organization?.name || 'Platform Governance',
        ipAddress: a.ipAddress,
        createdAt: a.createdAt.toISOString(),
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
      }))}
    />
  );
}
