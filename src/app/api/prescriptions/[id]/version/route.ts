import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyDocumentAccess } from '@/lib/permissions';
import { savePrivateFile } from '@/lib/storage';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyDocumentAccess(user, id);

    if (!access.allowed || !access.document) {
      return NextResponse.json({ error: access.reason || 'Document access denied' }, { status: 403 });
    }

    // Only the owning doctor can issue an addendum / version correction
    if (user.role !== 'DOCTOR' || access.document.doctorId !== user.userId) {
      return NextResponse.json(
        { error: 'Only the prescribing physician can issue a version addendum to a finalized document.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const reasonForCorrection = (formData.get('reasonForCorrection') as string)?.trim();
    const file = formData.get('file') as File | null;

    if (!reasonForCorrection || reasonForCorrection.length < 5) {
      return NextResponse.json(
        { error: 'A documented clinical reason for correction (minimum 5 characters) is mandatory.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'Updated prescription file is required.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await savePrivateFile(
      fileBuffer,
      file.name,
      file.type,
      access.document.patientId
    );

    const nextVersionNumber = access.document.currentVersion + 1;

    // Use transaction to atomically record version and advance current version
    const [newVersion, updatedDoc] = await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: access.document.id,
          versionNumber: nextVersionNumber,
          storageKey: uploadResult.storageKey,
          fileHash: uploadResult.fileHash,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          originalFilename: uploadResult.originalFilename,
          reasonForCorrection,
          createdById: user.userId,
        },
      }),
      prisma.prescriptionDocument.update({
        where: { id: access.document.id },
        data: {
          currentVersion: nextVersionNumber,
          storageKey: uploadResult.storageKey,
          fileHash: uploadResult.fileHash,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          originalFilename: uploadResult.originalFilename,
        },
      }),
    ]);

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DOCUMENT_VERSION_ADDENDUM',
      resourceType: 'DOCUMENT',
      resourceId: access.document.id,
      organizationId: access.document.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        nextVersionNumber,
        previousVersion: access.document.currentVersion,
        reasonForCorrection,
        newFileHash: uploadResult.fileHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Prescription version v${nextVersionNumber} issued successfully with preserved audit trail.`,
      version: newVersion,
      document: updatedDoc,
    });
  } catch (error) {
    console.error('Error creating document addendum version:', error);
    return NextResponse.json({ error: 'Failed to create document version' }, { status: 500 });
  }
}
