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
  // Delete ONLY the cookie belonging to the current session — never cross-delete the other panel.
  if (currentUser) {
    const target = cookieNameForRole(currentUser.role as any);
    response.cookies.delete(target);
    // Do NOT delete COOKIE_NAME when it equals DOCTOR_COOKIE — that would kill doctor session on admin logout.
    // Only clear legacy alias if it is a *different* cookie name and belongs to same role.
  } else {
    // No active session — could be expired. Try to clear cookies the browser actually sent.
    const reqDoctor = req.cookies.get(DOCTOR_COOKIE)?.value;
    const reqAdmin = req.cookies.get(ADMIN_COOKIE)?.value;
    if (reqDoctor) response.cookies.delete(DOCTOR_COOKIE);
    if (reqAdmin) response.cookies.delete(ADMIN_COOKIE);
    // If neither cookie was sent, clear both for clean state (expired/invalid token)
    if (!reqDoctor && !reqAdmin) {
      response.cookies.delete(DOCTOR_COOKIE);
      response.cookies.delete(ADMIN_COOKIE);
    }
  }
  return response;
}
