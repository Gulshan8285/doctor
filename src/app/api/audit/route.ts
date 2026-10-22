import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied: Audit trail restricted to administrators' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user.role === 'ADMIN') {
      where.organizationId = user.organizationId;
    }
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: true } },
          organization: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        userName: e.user?.fullName || 'System',
        userEmail: e.user?.email || 'N/A',
        userRole: e.user?.role || 'N/A',
        orgName: e.organization?.name || 'Platform',
        ipAddress: e.ipAddress,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit records' }, { status: 500 });
  }
}
