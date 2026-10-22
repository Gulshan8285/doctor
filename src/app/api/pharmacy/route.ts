import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await prisma.pharmacyProvider.findMany({
      orderBy: { name: 'asc' },
    });

    let currentPreference = null;
    if (user.role === 'DOCTOR') {
      const profile = await prisma.doctorProfile.findUnique({
        where: { userId: user.userId },
        include: { preferredPharmacy: true },
      });
      currentPreference = profile
        ? {
            providerId: profile.preferredPharmacyId,
            providerName: profile.preferredPharmacy?.name || null,
            notes: profile.pharmacyNotes,
          }
        : null;
    }

    return NextResponse.json({
      providers,
      currentPreference,
    });
  } catch (error) {
    console.error('Error fetching pharmacy catalog:', error);
    return NextResponse.json({ error: 'Failed to fetch pharmacy catalog' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Only doctors can configure pharmacy preference' }, { status: 403 });
    }

    const body = await req.json();
    const { providerId, notes } = body;

    if (!providerId) {
      return NextResponse.json({ error: 'Please select a valid pharmacy provider' }, { status: 400 });
    }

    const provider = await prisma.pharmacyProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Pharmacy provider not found' }, { status: 404 });
    }

    const updatedProfile = await prisma.doctorProfile.upsert({
      where: { userId: user.userId },
      update: {
        preferredPharmacyId: providerId,
        pharmacyNotes: notes ? String(notes).trim() : null,
      },
      create: {
        userId: user.userId,
        preferredPharmacyId: providerId,
        pharmacyNotes: notes ? String(notes).trim() : null,
      },
      include: { preferredPharmacy: true },
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'PHARMACY_PREFERENCE_UPDATED',
      resourceType: 'PHARMACY',
      resourceId: providerId,
      organizationId: user.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        providerName: provider.name,
        connectionType: provider.connectionType,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Preferred pharmacy saved: ${provider.name}. (Note: Prescriptions require manual confirmation; selecting a provider does not automatically transmit orders without authorized clinic API credentials.)`,
      preference: {
        providerId: updatedProfile.preferredPharmacyId,
        providerName: updatedProfile.preferredPharmacy?.name,
        notes: updatedProfile.pharmacyNotes,
      },
    });
  } catch (error) {
    console.error('Error saving pharmacy preference:', error);
    return NextResponse.json({ error: 'Failed to update pharmacy preference' }, { status: 500 });
  }
}
