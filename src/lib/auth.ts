import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'doctor_prescription_system_super_secure_jwt_secret_key_2026_antigravity';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
export const COOKIE_NAME = 'doctor_auth_session'; // legacy alias
export const DOCTOR_COOKIE = 'doctor_auth_session';
export const ADMIN_COOKIE = 'admin_auth_session';
export const LEGACY_COOKIE = 'doctor_auth_session';

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

async function validatePayload(payload: SessionPayload | null): Promise<SessionPayload | null> {
  if (!payload || !payload.userId) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, status: true, role: true, organizationId: true, fullName: true, email: true },
  });
  if (!dbUser || dbUser.status !== 'ACTIVE') return null;
  let delegatedDoctorId: string | null = null;
  let permissions: string[] = [];
  if (dbUser.role === 'DELEGATED_STAFF') {
    const activeGrant = await prisma.delegatedAccess.findFirst({ where: { staffUserId: dbUser.id, status: 'ACTIVE' } });
    if (!activeGrant) return null;
    delegatedDoctorId = activeGrant.doctorId;
    try { permissions = JSON.parse(activeGrant.permissions); } catch { permissions = []; }
  }
  return { userId: dbUser.id, email: dbUser.email, fullName: dbUser.fullName, role: dbUser.role, organizationId: dbUser.organizationId, delegatedDoctorId, permissions };
}

async function getSessionFromCookie(cookieName: string): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName)?.value;
    if (!token) return null;
    const payload = await verifySession(token);
    return validatePayload(payload);
  } catch (e) { console.error('verify ' + cookieName, e); return null; }
}

export const getDoctorSession = cache(async function getDoctorSession(): Promise<SessionPayload | null> {
  const s = await getSessionFromCookie(DOCTOR_COOKIE);
  if (s && (s.role === 'DOCTOR' || s.role === 'DELEGATED_STAFF')) return s;
  return null;
});

export const getAdminSession = cache(async function getAdminSession(): Promise<SessionPayload | null> {
  const s = await getSessionFromCookie(ADMIN_COOKIE);
  if (s && (s.role === 'ADMIN' || s.role === 'SUPER_ADMIN')) return s;
  if (!s) {
    const leg = await getSessionFromCookie(LEGACY_COOKIE);
    if (leg && (leg.role === 'ADMIN' || leg.role === 'SUPER_ADMIN')) return leg;
  }
  return s && (s.role === 'ADMIN' || s.role === 'SUPER_ADMIN') ? s : null;
});

export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const doctorToken = cookieStore.get(DOCTOR_COOKIE)?.value;
    if (doctorToken) { const p = await verifySession(doctorToken); const v = await validatePayload(p); if (v) return v; }
    const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
    if (adminToken) { const p = await verifySession(adminToken); const v = await validatePayload(p); if (v) return v; }
    return null;
  } catch (error) { console.error('Error verifying current user:', error); return null; }
});

export function cookieNameForRole(role: UserRole): string {
  if (role === 'DOCTOR' || role === 'DELEGATED_STAFF') return DOCTOR_COOKIE;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return ADMIN_COOKIE;
  return DOCTOR_COOKIE;
}
