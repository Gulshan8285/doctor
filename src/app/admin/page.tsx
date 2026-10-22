import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.organizationId;
  const orgFilter = orgId ? { organizationId: orgId } : {};

  const [
    totalDoctors,
    totalPatients,
    totalPrescriptions,
    activeDelegates,
    doctorsList,
    delegatedStaffList,
    recentAuditEvents,
    recentPrescriptions,
  ] = await Promise.all([
    prisma.user.count({ where: { ...orgFilter, role: 'DOCTOR' } }),
    prisma.patient.count({ where: orgFilter }),
    prisma.prescriptionDocument.count({ where: orgFilter }),
    prisma.delegatedAccess.count({
      where: {
        ...(orgId ? { grantingDoctor: { organizationId: orgId } } : {}),
        status: 'ACTIVE',
      },
    }),
    prisma.user.findMany({
      where: { ...orgFilter, role: 'DOCTOR' },
      include: {
        doctorProfile: {
          include: { preferredPharmacy: { select: { name: true } } },
        },
        delegatedAccessGranted: {
          include: {
            staffUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { patientsCreated: true, doctorDocuments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.delegatedAccess.findMany({
      where: orgId ? { grantingDoctor: { organizationId: orgId } } : {},
      include: {
        grantingDoctor: { select: { id: true, fullName: true, email: true } },
        staffUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditEvent.findMany({
      where: orgFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { fullName: true, role: true } } },
    }),
    prisma.prescriptionDocument.findMany({
      where: orgFilter,
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
        specialization: d.doctorProfile?.specialization || 'General Physician',
        preferredPharmacy: d.doctorProfile?.preferredPharmacy?.name || 'None Selected',
        patientCount: d._count.patientsCreated,
        docCount: d._count.doctorDocuments,
        activeDelegates: d.delegatedAccessGranted.filter((da) => da.status === 'ACTIVE').length,
        createdAt: d.createdAt.toISOString(),
        subordinates: d.delegatedAccessGranted.map((da) => {
          let perms: string[] = [];
          try {
            perms = JSON.parse(da.permissions || '[]');
          } catch {
            perms = [];
          }
          return {
            id: da.id,
            name: da.staffUser?.fullName || da.invitedName || 'Assistant',
            email: da.staffUser?.email || da.invitedEmail,
            phone: da.staffUser?.phone || null,
            status: da.status,
            permissions: perms,
            createdAt: da.createdAt.toISOString(),
          };
        }),
      }))}
      delegatedStaff={delegatedStaffList.map((d) => ({
        id: d.id,
        invitedEmail: d.invitedEmail,
        invitedName: d.invitedName,
        status: d.status,
        permissions: JSON.parse(d.permissions || '[]'),
        createdAt: d.createdAt.toISOString(),
        grantingDoctorName: d.grantingDoctor.fullName,
        grantingDoctorEmail: d.grantingDoctor.email,
        staffUser: d.staffUser
          ? {
              id: d.staffUser.id,
              fullName: d.staffUser.fullName,
              email: d.staffUser.email,
              phone: d.staffUser.phone,
              role: d.staffUser.role,
              status: d.staffUser.status,
              lastLoginAt: d.staffUser.lastLoginAt ? d.staffUser.lastLoginAt.toISOString() : null,
            }
          : null,
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
