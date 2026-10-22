import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30'; // days
    const daysAgo = parseInt(range);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    if (user.role === 'DOCTOR' || user.role === 'DELEGATED_STAFF') {
      const targetDoctorId =
        user.role === 'DOCTOR' ? user.userId : user.delegatedDoctorId;

      const [totalPatients, totalDocs, recentPatients, recentDocs, docsByCategory] =
        await Promise.all([
          prisma.patient.count({ where: { doctorId: targetDoctorId! } }),
          prisma.prescriptionDocument.count({ where: { doctorId: targetDoctorId! } }),
          prisma.patient.count({
            where: { doctorId: targetDoctorId!, createdAt: { gte: cutoffDate } },
          }),
          prisma.prescriptionDocument.count({
            where: { doctorId: targetDoctorId!, createdAt: { gte: cutoffDate } },
          }),
          prisma.prescriptionDocument.groupBy({
            by: ['category'],
            where: { doctorId: targetDoctorId! },
            _count: { id: true },
          }),
        ]);

      return NextResponse.json({
        summary: {
          totalPatients,
          totalDocuments: totalDocs,
          newPatientsInRange: recentPatients,
          documentsUploadedInRange: recentDocs,
          rangeDays: daysAgo,
        },
        categoryBreakdown: docsByCategory.map((c) => ({
          category: c.category,
          count: c._count.id,
        })),
      });
    }

    if (user.role === 'ADMIN') {
      const orgId = user.organizationId || '';
      const [orgDoctors, orgPatients, orgDocs, recentDocs, doctorActivity] =
        await Promise.all([
          prisma.user.count({
            where: { organizationId: orgId, role: 'DOCTOR' },
          }),
          prisma.patient.count({
            where: { organizationId: orgId },
          }),
          prisma.prescriptionDocument.count({
            where: { organizationId: orgId },
          }),
          prisma.prescriptionDocument.count({
            where: {
              organizationId: orgId,
              createdAt: { gte: cutoffDate },
            },
          }),
          prisma.user.findMany({
            where: { organizationId: orgId, role: 'DOCTOR' },
            select: {
              id: true,
              fullName: true,
              email: true,
              _count: {
                select: {
                  patientsCreated: true,
                  doctorDocuments: true,
                  delegatedAccessGranted: { where: { status: 'ACTIVE' } },
                },
              },
            },
          }),
        ]);

      return NextResponse.json({
        summary: {
          totalDoctors: orgDoctors,
          totalPatients: orgPatients,
          totalDocuments: orgDocs,
          documentsUploadedInRange: recentDocs,
          rangeDays: daysAgo,
        },
        doctorActivity: doctorActivity.map((d) => ({
          id: d.id,
          name: d.fullName,
          email: d.email,
          patientCount: d._count.patientsCreated,
          documentCount: d._count.doctorDocuments,
          activeDelegates: d._count.delegatedAccessGranted,
        })),
      });
    }

    if (user.role === 'SUPER_ADMIN') {
      const [totalOrgs, totalUsers, totalPatients, totalDocs, recentAudits] =
        await Promise.all([
          prisma.organization.count(),
          prisma.user.count(),
          prisma.patient.count(),
          prisma.prescriptionDocument.count(),
          prisma.auditEvent.count({
            where: { createdAt: { gte: cutoffDate } },
          }),
        ]);

      return NextResponse.json({
        summary: {
          totalOrganizations: totalOrgs,
          totalUsers,
          totalPatients,
          totalDocuments: totalDocs,
          securityAuditEvents: recentAudits,
          rangeDays: daysAgo,
        },
      });
    }

    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  } catch (error) {
    console.error('Reports analytics error:', error);
    return NextResponse.json({ error: 'Failed to generate operational report' }, { status: 500 });
  }
}
