import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.organizationId || '';

  const [
    totalDoctors,
    totalPatients,
    totalPrescriptions,
    activeDelegates,
    doctorsList,
    recentAuditEvents,
    recentPrescriptions,
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId: orgId, role: 'DOCTOR' } }),
    prisma.patient.count({ where: { organizationId: orgId } }),
    prisma.prescriptionDocument.count({ where: { organizationId: orgId } }),
    prisma.delegatedAccess.count({
      where: {
        grantingDoctor: { organizationId: orgId },
        status: 'ACTIVE',
      },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ['DOCTOR', 'DELEGATED_STAFF'] } },
      include: {
        doctorProfile: {
          include: { preferredPharmacy: { select: { name: true } } },
        },
        delegatedAccessGranted: {
          where: { status: 'ACTIVE' },
        },
        _count: {
          select: { patientsCreated: true, doctorDocuments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { fullName: true, role: true } } },
    }),
    prisma.prescriptionDocument.findMany({
      where: orgId ? { organizationId: orgId } : {},
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        patient: { select: { fullName: true, patientCode: true } },
        doctor: { select: { fullName: true } },
        uploadedBy: { select: { fullName: true } },
      },
    }),
  ]);

  return (
    <AdminDashboardClient
      stats={{
        totalDoctors,
        totalPatients,
        totalPrescriptions,
        activeDelegates,
      }}
      doctors={doctorsList.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        role: d.role,
        status: d.status,
        specialization: d.doctorProfile?.specialization || 'N/A',
        preferredPharmacy: d.doctorProfile?.preferredPharmacy?.name || 'None Selected',
        patientCount: d._count.patientsCreated,
        docCount: d._count.doctorDocuments,
        activeDelegates: d.delegatedAccessGranted.length,
        createdAt: d.createdAt.toISOString(),
      }))}
      recentPrescriptions={recentPrescriptions.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        diagnosticLab: doc.diagnosticLab || 'Dr Lal PathLabs',
        patientName: doc.patient.fullName,
        patientCode: doc.patient.patientCode,
        doctorName: doc.doctor.fullName,
        uploadedByName: doc.uploadedBy.fullName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        fileHash: doc.fileHash,
        currentVersion: doc.currentVersion,
        createdAt: doc.createdAt.toISOString(),
      }))}
      recentAudits={recentAuditEvents.map((a) => ({
        id: a.id,
        action: a.action,
        resourceType: a.resourceType,
        userName: a.user?.fullName || 'System',
        userRole: a.user?.role || 'N/A',
        createdAt: a.createdAt.toISOString(),
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
      }))}
    />
  );
}
