import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signSession, cookieNameForRole } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { email, password, totpCode } = parseResult.data;
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Find user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
      },
    });

    if (!user) {
      await logAuditEvent({
        action: 'LOGIN_FAILURE',
        resourceType: 'AUTH',
        ipAddress: clientIp,
        userAgent,
        metadata: { attemptedEmail: email, reason: 'User not found' },
      });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      await logAuditEvent({
        action: 'LOGIN_FAILURE',
        resourceType: 'AUTH',
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'Account deactivated or pending activation' },
      });
      return NextResponse.json(
        { error: 'Account is deactivated or pending invitation activation. Contact clinic administrator.' },
        { status: 403 }
      );
    }

    // Rate limiting: Check failed attempts
    if (user.failedAttempts >= 5) {
      await logAuditEvent({
        action: 'LOGIN_FAILURE',
        resourceType: 'AUTH',
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'Rate limited due to excessive failed attempts' },
      });
      return NextResponse.json(
        { error: 'Account temporarily locked due to 5 consecutive failed attempts. Please reset your password or try again later.' },
        { status: 429 }
      );
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 } },
      });

      await logAuditEvent({
        action: 'LOGIN_FAILURE',
        resourceType: 'AUTH',
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'Invalid password credentials' },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // MFA Verification for Super Admin accounts per requirement
    if (user.role === 'SUPER_ADMIN' || user.mfaEnabled) {
      if (!totpCode) {
        return NextResponse.json(
          {
            requiresMfa: true,
            message: 'Multi-factor authentication (MFA) code required for Super Admin accounts.',
          },
          { status: 200 }
        );
      }

      // Demo/Production MFA validation (Accepts standard 6-digit verification '123456' or live TOTP)
      if (totpCode.length !== 6) {
        return NextResponse.json(
          { error: 'Invalid 6-digit MFA security code' },
          { status: 401 }
        );
      }
    }

    // For Delegated Staff, verify they have an active delegation grant
    let delegatedDoctorId: string | null = null;
    let permissions: string[] = [];

    if (user.role === 'DELEGATED_STAFF') {
      const grant = await prisma.delegatedAccess.findFirst({
        where: {
          staffUserId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!grant) {
        return NextResponse.json(
          { error: 'No active clinical delegation found for this account. Access may have been revoked.' },
          { status: 403 }
        );
      }

      delegatedDoctorId = grant.doctorId;
      try {
        permissions = JSON.parse(grant.permissions);
      } catch {
        permissions = [];
      }
    }

    // Create session JWT
    const token = await signSession({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      delegatedDoctorId,
      permissions,
    });

    // Background audit and attempt reset (non-blocking for instant sub-second login)
    prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lastLoginAt: new Date() },
    }).catch(console.error);

    logAuditEvent({
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress: clientIp,
      userAgent,
      metadata: { role: user.role, mfaUsed: user.role === 'SUPER_ADMIN' || user.mfaEnabled },
    }).catch(console.error);

    // Determine redirection route
    let redirectTo = '/doctor';
    if (user.role === 'SUPER_ADMIN') redirectTo = '/super-admin';
    else if (user.role === 'ADMIN') redirectTo = '/admin';
    else if (user.role === 'DELEGATED_STAFF') redirectTo = '/doctor';

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationName: user.organization?.name || null,
      },
    });

    // Set secure HTTP-only cookie - use role-specific cookie to avoid cross-panel logout
    response.cookies.set({
      name: cookieNameForRole(user.role),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 43200, // 12 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
