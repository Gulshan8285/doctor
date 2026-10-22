import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { patientSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    // Build role-scoped where clause
    const where: any = {};

    if (user.role === 'DOCTOR') {
      where.doctorId = user.userId;
    } else if (user.role === 'DELEGATED_STAFF') {
      if (!user.permissions?.includes('VIEW_PATIENTS') && !user.permissions?.includes('SEARCH_PATIENTS')) {
        return NextResponse.json({ error: 'Lacks patient access permission' }, { status: 403 });
      }
      where.doctorId = user.delegatedDoctorId;
    } else if (user.role === 'ADMIN') {
      where.organizationId = user.organizationId;
    } else if (user.role === 'SUPER_ADMIN') {
      // Super admin can filter by org if passed
      const orgFilter = searchParams.get('organizationId');
      if (orgFilter) where.organizationId = orgFilter;
    }

    // Search query filtering
    if (search) {
      const normalizedDigits = search.replace(/[^0-9]/g, '');
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { patientCode: { contains: search, mode: 'insensitive' } },
        ...(normalizedDigits.length >= 3
          ? [{ normalizedPhone: { contains: normalizedDigits } }]
          : []),
      ];
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Diagnostic Lab filtering
    const lab = searchParams.get('lab');
    if (lab && lab !== 'ALL') {
      where.diagnosticLab = lab;
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { select: { fullName: true } },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        patientCode: p.patientCode,
        fullName: p.fullName,
        phone: p.phone,
        email: p.email,
        dob: p.dob,
        gender: p.gender,
        createdAt: p.createdAt,
        diagnosticLab: p.diagnosticLab || 'Dr Lal PathLabs',
        doctorName: p.doctor?.fullName,
        documentCount: p._count.documents,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetDoctorId = user.userId;
    let targetOrgId = user.organizationId;

    if (user.role === 'DELEGATED_STAFF') {
      if (!user.permissions?.includes('UPDATE_PATIENT_DETAILS') && !user.permissions?.includes('UPLOAD_DOCUMENTS')) {
        return NextResponse.json({ error: 'Staff lacks permission to register patients' }, { status: 403 });
      }
      targetDoctorId = user.delegatedDoctorId!;
    } else if (user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Only doctors and authorized staff can register patients' }, { status: 403 });
    }

    if (!targetOrgId) {
      // Find doctor organization if missing
      const doc = await prisma.user.findUnique({
        where: { id: targetDoctorId },
        select: { organizationId: true },
      });
      targetOrgId = doc?.organizationId || null;
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Organization context missing for doctor' }, { status: 400 });
    }

    const body = await req.json();
    const parseResult = patientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Invalid patient data' },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const normalizedPhone = data.phone.replace(/[^0-9]/g, '');

    // Duplicate detection check
    const bypassDuplicateWarning = Boolean(body.confirmDuplicate);
    if (!bypassDuplicateWarning) {
      const duplicateMatches = await prisma.patient.findMany({
        where: {
          doctorId: targetDoctorId,
          OR: [
            { normalizedPhone: normalizedPhone },
            ...(data.email ? [{ email: data.email.toLowerCase() }] : []),
          ],
        },
        select: {
          id: true,
          patientCode: true,
          fullName: true,
          phone: true,
          email: true,
          createdAt: true,
        },
      });

      if (duplicateMatches.length > 0) {
        return NextResponse.json(
          {
            isDuplicateWarning: true,
            warning: 'Possible duplicate patient records detected with matching phone number or email address.',
            matches: duplicateMatches,
          },
          { status: 409 }
        );
      }
    }

    // Generate unique Patient ID (PAT-YYYYMM-XXXX)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const patientCode = `PAT-${yearMonth}-${randomSuffix}`;

    const newPatient = await prisma.patient.create({
      data: {
        patientCode,
        organizationId: targetOrgId,
        doctorId: targetDoctorId,
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        normalizedPhone,
        email: data.email ? data.email.toLowerCase().trim() : null,
        dob: data.dob ? new Date(data.dob) : null,
        gender: data.gender || null,
        address: data.address || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        consentAcknowledged: true,
        nonClinicalNotes: data.nonClinicalNotes || null,
        diagnosticLab: data.diagnosticLab || 'Dr Lal PathLabs',
      },
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'PATIENT_CREATE',
      resourceType: 'PATIENT',
      resourceId: newPatient.id,
      organizationId: targetOrgId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        patientCode: newPatient.patientCode,
        fullName: newPatient.fullName,
        registeredByRole: user.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Patient registered successfully',
      patient: newPatient,
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient record' }, { status: 500 });
  }
}
