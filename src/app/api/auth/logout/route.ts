import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getCurrentUser } from '@/lib/auth';
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
  response.cookies.delete(COOKIE_NAME);
  return response;
}
