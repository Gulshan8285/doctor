import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'doctor_prescription_system_super_secure_jwt_secret_key_2026_antigravity';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
export const COOKIE_NAME = 'doctor_auth_session';

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string | null;
  delegatedDoctorId?: string | null;
  permissions?: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

import { cache } from 'react';

/**
 * Gets the verified authenticated user for the current server context.
 * Performs database check to enforce immediate access revocation for suspended accounts
 * or revoked delegated staff.
 * Cached per request to eliminate redundant round-trips to the database.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload || !payload.userId) return null;

    // Check account status in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        status: true,
        role: true,
        organizationId: true,
        fullName: true,
        email: true,
      },
    });

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      return null;
    }

    // If user is DELEGATED_STAFF, verify active delegation grant
    let delegatedDoctorId: string | null = null;
    let permissions: string[] = [];

    if (dbUser.role === 'DELEGATED_STAFF') {
      const activeGrant = await prisma.delegatedAccess.findFirst({
        where: {
          staffUserId: dbUser.id,
          status: 'ACTIVE',
        },
      });

      // Immediate revocation: If delegation is missing or revoked, staff has no access
      if (!activeGrant) {
        return null;
      }

      delegatedDoctorId = activeGrant.doctorId;
      try {
        permissions = JSON.parse(activeGrant.permissions);
      } catch {
        permissions = [];
      }
    }

    return {
      userId: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
      delegatedDoctorId,
      permissions,
    };
  } catch (error) {
    console.error('Error verifying current user:', error);
    return null;
  }
});
