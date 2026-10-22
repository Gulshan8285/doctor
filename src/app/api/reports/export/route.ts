import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeCsvField, formatDate } from '@/lib/utils';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const type = body.type || 'patients'; // 'patients' | 'prescriptions'

    const where: any = {};
    if (user.role === 'DOCTOR') {
      where.doctorId = user.userId;
    } else if (user.role === 'DELEGATED_STAFF') {
      if (!user.permissions?.includes('VIEW_REPORTS')) {
        return NextResponse.json({ error: 'Lacks VIEW_REPORTS permission' }, { status: 403 });
      }
      where.doctorId = user.delegatedDoctorId;
    } else if (user.role === 'ADMIN') {
      where.organizationId = user.organizationId;
    } else if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized export' }, { status: 403 });
    }

    let csvContent = '';
    let exportCount = 0;

    if (type === 'patients') {
      const patients = await prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { doctor: { select: { fullName: true } } },
      });

      exportCount = patients.length;
      const headers = ['Patient ID', 'Full Name', 'Phone', 'Email', 'Gender', 'Registration Date', 'Attending Doctor'];
      const rows = patients.map((p) => [
        sanitizeCsvField(p.patientCode),
        sanitizeCsvField(p.fullName),
        sanitizeCsvField(p.phone),
        sanitizeCsvField(p.email || 'N/A'),
        sanitizeCsvField(p.gender || 'N/A'),
        sanitizeCsvField(formatDate(p.createdAt)),
        sanitizeCsvField(p.doctor?.fullName || 'N/A'),
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    } else {
      const docs = await prisma.prescriptionDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { patientCode: true, fullName: true } },
          uploadedBy: { select: { fullName: true } },
        },
      });

      exportCount = docs.length;
      const headers = ['Document Title', 'Patient ID', 'Patient Name', 'Category', 'Version', 'File Size (Bytes)', 'Upload Date', 'Uploaded By', 'SHA-256 Hash'];
      const rows = docs.map((d) => [
        sanitizeCsvField(d.title),
        sanitizeCsvField(d.patient?.patientCode),
        sanitizeCsvField(d.patient?.fullName),
        sanitizeCsvField(d.category),
        sanitizeCsvField(`v${d.currentVersion}`),
        sanitizeCsvField(d.fileSize),
        sanitizeCsvField(formatDate(d.createdAt)),
        sanitizeCsvField(d.uploadedBy?.fullName || 'N/A'),
        sanitizeCsvField(d.fileHash),
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DATA_EXPORTED',
      resourceType: 'EXPORT',
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        exportType: type,
        recordsExported: exportCount,
        antiFormulaSanitized: true,
      },
    });

    const filename = `doctorcare-export-${type}-${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to process data export' }, { status: 500 });
  }
}
