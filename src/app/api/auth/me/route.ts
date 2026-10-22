import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      organization: { select: { id: true, name: true, slug: true } },
      doctorProfile: {
        select: {
          specialization: true,
          registrationNumber: true,
          clinicName: true,
          preferredPharmacy: true,
        },
      },
    },
  });

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      ...profile,
    },
  });
}
