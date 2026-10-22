import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyDocumentAccess } from '@/lib/permissions';
import { readPrivateFile } from '@/lib/storage';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
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
      return NextResponse.json(
        { error: access.reason || 'Unauthorized access to prescription document' },
        { status: 403 }
      );
    }

    const doc = access.document;
    const { searchParams } = new URL(req.url);
    const versionNum = searchParams.get('version') ? parseInt(searchParams.get('version')!) : null;

    let targetStorageKey = doc.storageKey;
    let targetFilename = doc.originalFilename;
    let targetMime = doc.mimeType;

    if (versionNum && doc.versions) {
      const matchVer = doc.versions.find((v) => v.versionNumber === versionNum);
      if (matchVer) {
        targetStorageKey = matchVer.storageKey;
        targetFilename = matchVer.originalFilename;
        targetMime = matchVer.mimeType;
      }
    }

    const { buffer, exists } = await readPrivateFile(targetStorageKey);
    if (!exists) {
      return NextResponse.json({ error: 'File content not found in private storage vault' }, { status: 404 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      action: 'DOCUMENT_DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      organizationId: doc.organizationId,
      userId: user.userId,
      ipAddress: clientIp,
      metadata: {
        filename: targetFilename,
        version: versionNum || doc.currentVersion,
        userRole: user.role,
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': targetMime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(targetFilename)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download prescription file' }, { status: 500 });
  }
}
