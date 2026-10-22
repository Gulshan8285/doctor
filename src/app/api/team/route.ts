import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkDoctorDelegateLimit } from '@/lib/permissions';
import { inviteDelegateSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Only doctors can manage team delegation' }, { status: 403 });
    }

    const delegates = await prisma.delegatedAccess.findMany({
      where: { doctorId: user.userId },
      include: {
        staffUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            lastLoginAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = delegates.filter(
      (d) => d.status === 'ACTIVE' || d.status === 'PENDING'
    ).length;

    return NextResponse.json({
      delegates: delegates.map((d) => ({
        id: d.id,
        invitedEmail: d.invitedEmail,
        invitedName: d.invitedName,
        status: d.status,
        permissions: JSON.parse(d.permissions || '[]'),
        createdAt: d.createdAt,
        expiresAt: d.expiresAt,
        revokedAt: d.revokedAt,
        staffUser: d.staffUser,
      })),
      activeCount,
      maxAllowed: 3,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to retrieve team members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Only doctors can invite delegated team members' }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = inviteDelegateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Invalid delegation details' },
        { status: 400 }
      );
    }

    const { email, name, permissions } = parseResult.data;
    const targetEmail = email.toLowerCase().trim();

    // Check doctor delegate limit
    const limitCheck = await checkDoctorDelegateLimit(user.userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    // Check if user is already an active delegate for this doctor
    const existingActive = await prisma.delegatedAccess.findFirst({
      where: {
        doctorId: user.userId,
        invitedEmail: targetEmail,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { error: 'An active or pending delegation already exists for this email address.' },
        { status: 400 }
      );
    }

    // Atomic transaction checking limit and inserting
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const createdDelegation = await prisma.$transaction(async (tx) => {
      const currentCount = await tx.delegatedAccess.count({
        where: {
          doctorId: user.userId,
          status: { in: ['ACTIVE', 'PENDING'] },
        },
      });

      if (currentCount >= 3) {
        throw new Error('Concurrent limit exceeded: Maximum 3 active team members allowed.');
      }

      // Check if user already has an account
      const staffUser = await tx.user.findUnique({
        where: { email: targetEmail },
      });

      return tx.delegatedAccess.create({
        data: {
          doctorId: user.userId,
          invitedEmail: targetEmail,
          invitedName: name.trim(),
          staffUserId: staffUser ? staffUser.id : null,
          status: staffUser ? 'ACTIVE' : 'PENDING',
          permissions: JSON.stringify(permissions),
          token,
          expiresAt,
        },
      });
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DELEGATE_INVITED',
      resourceType: 'DELEGATE',
      resourceId: createdDelegation.id,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        invitedEmail: targetEmail,
        permissions,
        delegateLimit: 3,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation issued successfully to ${targetEmail}`,
      delegation: createdDelegation,
    });
  } catch (error: any) {
    console.error('Error inviting delegate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process team member delegation' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { delegationId, permissions } = body;

    if (!delegationId || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: 'Valid delegation ID and permissions array required' }, { status: 400 });
    }

    const delegation = await prisma.delegatedAccess.findFirst({
      where: { id: delegationId, doctorId: user.userId },
    });

    if (!delegation) {
      return NextResponse.json({ error: 'Delegation record not found' }, { status: 404 });
    }

    const updated = await prisma.delegatedAccess.update({
      where: { id: delegationId },
      data: {
        permissions: JSON.stringify(permissions),
      },
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DELEGATE_PERMISSIONS_UPDATED',
      resourceType: 'DELEGATE',
      resourceId: delegationId,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: { updatedPermissions: permissions, targetEmail: delegation.invitedEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Delegated permissions updated successfully',
      delegation: updated,
    });
  } catch (error) {
    console.error('Error updating delegate permissions:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const delegationId = searchParams.get('id');

    if (!delegationId) {
      return NextResponse.json({ error: 'Delegation ID required' }, { status: 400 });
    }

    const delegation = await prisma.delegatedAccess.findFirst({
      where: { id: delegationId, doctorId: user.userId },
    });

    if (!delegation) {
      return NextResponse.json({ error: 'Delegation record not found' }, { status: 404 });
    }

    // Immediately revoke access
    await prisma.delegatedAccess.update({
      where: { id: delegationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: 'Revoked by supervising physician',
      },
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DELEGATE_REVOKED',
      resourceType: 'DELEGATE',
      resourceId: delegationId,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        revokedEmail: delegation.invitedEmail,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Access for ${delegation.invitedEmail} has been immediately revoked.`,
    });
  } catch (error) {
    console.error('Error revoking delegate:', error);
    return NextResponse.json({ error: 'Failed to revoke delegation' }, { status: 500 });
  }
}
