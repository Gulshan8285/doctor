import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin privileges required' }, { status: 403 });
    }

    const [organizations, users, stats] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, patients: true, documents: true },
          },
        },
      }),
      prisma.user.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { name: true } } },
      }),
      Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.patient.count(),
        prisma.prescriptionDocument.count(),
        prisma.auditEvent.count(),
      ]),
    ]);

    return NextResponse.json({
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        licenseNumber: o.licenseNumber,
        city: o.city,
        createdAt: o.createdAt,
        userCount: o._count.users,
        patientCount: o._count.patients,
        docCount: o._count.documents,
      })),
      recentUsers: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        mfaEnabled: u.mfaEnabled,
        orgName: u.organization?.name || 'Platform Level',
        createdAt: u.createdAt,
      })),
      stats: {
        totalOrganizations: stats[0],
        totalUsers: stats[1],
        totalPatients: stats[2],
        totalPrescriptions: stats[3],
        totalAuditEvents: stats[4],
      },
    });
  } catch (error) {
    console.error('Super Admin error:', error);
    return NextResponse.json({ error: 'Failed to retrieve platform data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, licenseNumber, city, adminName, adminEmail } = body;

    if (!name || !slug || !adminEmail || !adminName) {
      return NextResponse.json(
        { error: 'Organization name, slug, administrator name, and email are required.' },
        { status: 400 }
      );
    }

    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existingOrg) {
      return NextResponse.json({ error: 'An organization with this slug already exists.' }, { status: 400 });
    }

    const defaultAdminHash = await hashPassword('ClinicAdmin@2026');

    const created = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: name.trim(),
          slug: normalizedSlug,
          licenseNumber: licenseNumber || null,
          city: city || 'Hyderabad',
          country: 'India',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          organizationId: org.id,
          fullName: adminName.trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash: defaultAdminHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      return { org, adminUser };
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'ORGANIZATION_CREATED',
      resourceType: 'ORGANIZATION',
      resourceId: created.org.id,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        orgName: created.org.name,
        slug: created.org.slug,
        initialAdminEmail: adminEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${name}" created with administrator account "${adminEmail}". Temporary password: ClinicAdmin@2026`,
      organization: created.org,
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
