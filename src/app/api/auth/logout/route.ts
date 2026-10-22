import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, DOCTOR_COOKIE, ADMIN_COOKIE, getCurrentUser, cookieNameForRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

  if (currentUser) {
    await logAuditEvent({
      action: 'LOGOUT',
      resourceType: 'AUTH',
      userId: currentUser.userId,
      organizationId: currentUser.organizationId,
      ipAddress: clientIp,
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  // Delete only the cookie belonging to the current session; keep the other panel alive.
  if (currentUser) {
    const target = cookieNameForRole(currentUser.role as any);
    response.cookies.delete(target);
    // Also clean legacy alias if it differs
    if (target !== COOKIE_NAME) response.cookies.delete(COOKIE_NAME);
  } else {
    // No session resolved - clear both to ensure clean state (e.g. expired token)
    response.cookies.delete(DOCTOR_COOKIE);
    response.cookies.delete(ADMIN_COOKIE);
    response.cookies.delete(COOKIE_NAME);
  }
  return response;
}
