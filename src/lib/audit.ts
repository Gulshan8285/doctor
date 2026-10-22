import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

export interface AuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    const metaString = params.metadata ? JSON.stringify(params.metadata) : null;
    await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: metaString,
      },
    });
  } catch (error) {
    console.error('Failed to write audit event:', error);
  }
}
