import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyUploadPermission } from '@/lib/permissions';
import { savePrivateFile } from '@/lib/storage';
import { logAuditEvent } from '@/lib/audit';
import { DocumentCategory } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const patientId = formData.get('patientId') as string;
    const title = (formData.get('title') as string)?.trim();
    const category = (formData.get('category') as DocumentCategory) || 'PRESCRIPTION';
    const documentDateStr = formData.get('documentDate') as string;
    const file = formData.get('file') as File | null;

    if (!patientId || !title || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, title, and file are required.' },
        { status: 400 }
      );
    }

    // Verify upload permission
    const access = await verifyUploadPermission(user, patientId);
    if (!access.allowed || !access.patient) {
      return NextResponse.json(
        { error: access.reason || 'Not authorized to upload documents for this patient' },
        { status: 403 }
      );
    }

    // Validate file size (max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted limit of 25MB' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Permitted formats: PDF, JPEG, PNG, and TXT.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Save to private vault and compute SHA-256 hash
    const uploadResult = await savePrivateFile(
      fileBuffer,
      file.name,
      file.type,
      patientId
    );

    const docDate = documentDateStr ? new Date(documentDateStr) : new Date();
    const diagnosticLab = (formData.get('diagnosticLab') as string)?.trim() || access.patient.diagnosticLab || 'Dr Lal PathLabs';

    // Create PrescriptionDocument and initial DocumentVersion (v1)
    const document = await prisma.prescriptionDocument.create({
      data: {
        patientId,
        doctorId: access.patient.doctorId,
        organizationId: access.patient.organizationId,
        uploadedById: user.userId,
        title,
        category,
        diagnosticLab,
        documentDate: isNaN(docDate.getTime()) ? new Date() : docDate,
        storageKey: uploadResult.storageKey,
        fileHash: uploadResult.fileHash,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        originalFilename: uploadResult.originalFilename,
        isFinalized: true,
        currentVersion: 1,
        versions: {
          create: {
            versionNumber: 1,
            storageKey: uploadResult.storageKey,
            fileHash: uploadResult.fileHash,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            originalFilename: uploadResult.originalFilename,
            reasonForCorrection: 'Initial finalized document upload.',
            createdById: user.userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Write audit event
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      organizationId: access.patient.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        patientCode: access.patient.patientCode,
        title: document.title,
        category: document.category,
        fileHash: uploadResult.fileHash,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded and finalized with cryptographic integrity verification.',
      document,
    });
  } catch (error) {
    console.error('Prescription upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred while storing the prescription document' },
      { status: 500 }
    );
  }
}
