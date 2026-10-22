import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Clinic Admin role required' }, { status: 403 });
    }

    const doctors = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ['DOCTOR', 'DELEGATED_STAFF'] },
      },
      include: {
        doctorProfile: {
          include: { preferredPharmacy: { select: { name: true } } },
        },
        delegatedAccessGranted: {
          where: { status: 'ACTIVE' },
          include: { staffUser: { select: { fullName: true } } },
        },
        _count: {
          select: {
            patientsCreated: true,
            doctorDocuments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      doctors: doctors.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        role: d.role,
        status: d.status,
        specialization: d.doctorProfile?.specialization || 'N/A',
        registrationNumber: d.doctorProfile?.registrationNumber || 'N/A',
        preferredPharmacy: d.doctorProfile?.preferredPharmacy?.name || 'None Selected',
        patientCount: d._count.patientsCreated,
        prescriptionCount: d._count.doctorDocuments,
        activeDelegates: d.delegatedAccessGranted.length,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching clinic doctors:', error);
    return NextResponse.json({ error: 'Failed to retrieve doctors list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, phone, specialization, registrationNumber, password } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Set custom password or standard demo password
    const userPassword = password && password.trim().length >= 6 ? password.trim() : 'Healthcare@2026';
    const passwordHash = await hashPassword(userPassword);

    const newDoctor = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          email: normalizedEmail,
          fullName: fullName.trim(),
          phone: phone || null,
          passwordHash,
          role: 'DOCTOR',
          status: 'ACTIVE',
        },
      });

      await tx.doctorProfile.create({
        data: {
          userId: u.id,
          specialization: specialization?.trim() || 'General Physician',
          registrationNumber: registrationNumber?.trim() || null,
          maxDelegates: 3,
        },
      });

      return u;
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'USER_STATUS_CHANGED',
      resourceType: 'DOCTOR',
      resourceId: newDoctor.id,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: { action: 'PROVISION_DOCTOR', email: normalizedEmail, name: fullName },
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/admin');
      revalidatePath('/admin/doctors');
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Doctor account created for ${fullName}. Password: ${userPassword}`,
      doctor: {
        id: newDoctor.id,
        fullName: newDoctor.fullName,
        email: newDoctor.email,
        phone: newDoctor.phone,
        specialization: specialization?.trim() || 'General Physician',
        status: 'ACTIVE',
        patientCount: 0,
        docCount: 0,
        activeDelegates: 0,
        subordinates: [],
      },
    });
  } catch (error) {
    console.error('Error provisioning doctor:', error);
    return NextResponse.json({ error: 'Failed to provision doctor account' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, status, fullName, phone, specialization } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, organizationId: user.organizationId },
      include: { doctorProfile: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Target user not found in this organization' }, { status: 404 });
    }

    // Update user and doctor profile in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          ...(status && ['ACTIVE', 'DEACTIVATED'].includes(status) ? { status } : {}),
          ...(fullName ? { fullName: fullName.trim() } : {}),
          ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        },
      });

      if (specialization && target.doctorProfile) {
        await tx.doctorProfile.update({
          where: { userId },
          data: { specialization: specialization.trim() },
        });
      }

      return u;
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'USER_STATUS_CHANGED',
      resourceType: 'USER',
      resourceId: userId,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: { 
        oldStatus: target.status, 
        newStatus: status || target.status, 
        email: target.email,
        updatedFields: { fullName, phone, specialization },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Doctor details updated successfully.`,
      user: updated,
    });
  } catch (error) {
    console.error('Error updating doctor details:', error);
    return NextResponse.json({ error: 'Failed to update doctor details' }, { status: 500 });
  }
}
