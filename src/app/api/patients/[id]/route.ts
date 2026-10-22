import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyPatientAccess } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyPatientAccess(user, id);

    if (!access.allowed || !access.patient) {
      return NextResponse.json(
        { error: access.reason || 'Unauthorized access to patient record' },
        { status: 403 }
      );
    }

    // Fetch full profile with prescriptions and versions
    const patientDetails = await prisma.patient.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            doctorProfile: { select: { specialization: true, clinicName: true } },
          },
        },
        organization: {
          select: { name: true, city: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { fullName: true, role: true } },
            versions: {
              orderBy: { versionNumber: 'desc' },
              include: {
                createdBy: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!patientDetails) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch relevant audit events for this patient (Activity tab)
    const recentActivity = await prisma.auditEvent.findMany({
      where: {
        resourceType: { in: ['PATIENT', 'DOCUMENT'] },
        OR: [
          { resourceId: id },
          { metadata: { contains: patientDetails.patientCode } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: { select: { fullName: true, role: true } },
      },
    });

    return NextResponse.json({
      patient: patientDetails,
      activity: recentActivity,
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json({ error: 'Failed to fetch patient profile' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyPatientAccess(user, id);

    if (!access.allowed || !access.patient) {
      return NextResponse.json({ error: access.reason || 'Access denied' }, { status: 403 });
    }

    // Check update permission for delegated staff
    if (user.role === 'DELEGATED_STAFF') {
      if (!user.permissions?.includes('UPDATE_PATIENT_DETAILS') && !user.permissions?.includes('ADD_NOTES')) {
        return NextResponse.json({ error: 'Staff lacks permission to update patient details' }, { status: 403 });
      }
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.phone) {
      updateData.phone = body.phone;
      updateData.normalizedPhone = body.phone.replace(/[^0-9]/g, '');
    }
    if (body.email !== undefined) updateData.email = body.email ? body.email.toLowerCase().trim() : null;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.emergencyContactName !== undefined) updateData.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = body.emergencyContactPhone;
    if (body.nonClinicalNotes !== undefined) updateData.nonClinicalNotes = body.nonClinicalNotes;

    const updated = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'PATIENT_UPDATE',
      resourceType: 'PATIENT',
      resourceId: id,
      organizationId: access.patient.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: { fieldsUpdated: Object.keys(updateData) },
    });

    return NextResponse.json({
      success: true,
      message: 'Patient details updated successfully',
      patient: updated,
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Failed to update patient record' }, { status: 500 });
  }
}
