import { prisma } from './prisma';
import { SessionPayload } from './auth';

export const DELEGATE_PERMISSIONS = {
  VIEW_PATIENTS: 'VIEW_PATIENTS',
  SEARCH_PATIENTS: 'SEARCH_PATIENTS',
  UPDATE_PATIENT_DETAILS: 'UPDATE_PATIENT_DETAILS',
  ADD_NOTES: 'ADD_NOTES',
  UPLOAD_DOCUMENTS: 'UPLOAD_DOCUMENTS',
  VIEW_PRESCRIPTIONS: 'VIEW_PRESCRIPTIONS',
  DOWNLOAD_PRESCRIPTIONS: 'DOWNLOAD_PRESCRIPTIONS',
  VIEW_REPORTS: 'VIEW_REPORTS',
} as const;

export type PermissionKey = keyof typeof DELEGATE_PERMISSIONS;

/**
 * Enforces the strict maximum of 3 active delegates per doctor.
 * Counts active and pending invitations.
 */
export async function checkDoctorDelegateLimit(doctorId: string): Promise<{
  allowed: boolean;
  activeCount: number;
  maxAllowed: number;
  message?: string;
}> {
  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: doctorId },
    select: { maxDelegates: true },
  });

  const maxAllowed = doctorProfile?.maxDelegates ?? 3;

  const currentCount = await prisma.delegatedAccess.count({
    where: {
      doctorId,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      activeCount: currentCount,
      maxAllowed,
      message: `You have reached the maximum limit of ${maxAllowed} active/pending team members. Revoke an existing member to invite someone new.`,
    };
  }

  return {
    allowed: true,
    activeCount: currentCount,
    maxAllowed,
  };
}

/**
 * Verifies if the caller has permission to view/interact with a specific patient.
 * Prevents cross-doctor or unauthorized cross-organization leakage.
 */
export async function verifyPatientAccess(
  user: SessionPayload,
  patientId: string
) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      doctor: { select: { fullName: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  if (!patient) {
    return { allowed: false, reason: 'Patient not found' };
  }

  // Doctor access: must be the assigned doctor
  if (user.role === 'DOCTOR') {
    if (patient.doctorId === user.userId) {
      return { allowed: true, patient };
    }
    return { allowed: false, reason: 'Unauthorized: Patient belongs to another physician' };
  }

  // Delegated staff access: must belong to the patient's doctor and have VIEW_PATIENTS permission
  if (user.role === 'DELEGATED_STAFF') {
    if (patient.doctorId === user.delegatedDoctorId) {
      if (user.permissions?.includes(DELEGATE_PERMISSIONS.VIEW_PATIENTS)) {
        return { allowed: true, patient };
      }
      return { allowed: false, reason: 'Staff lacks VIEW_PATIENTS permission' };
    }
    return { allowed: false, reason: 'Unauthorized: Patient not assigned to your supervising doctor' };
  }

  // Admin access: within the same clinic organization
  if (user.role === 'ADMIN') {
    if (patient.organizationId === user.organizationId) {
      return { allowed: true, patient };
    }
    return { allowed: false, reason: 'Cross-organization access prohibited' };
  }

  // Super Admin: platform overview (read-only for administrative governance)
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, patient };
  }

  return { allowed: false, reason: 'Access denied' };
}

/**
 * Verifies if the caller can upload prescriptions/documents for this patient.
 */
export async function verifyUploadPermission(
  user: SessionPayload,
  patientId: string
) {
  const access = await verifyPatientAccess(user, patientId);
  if (!access.allowed || !access.patient) {
    return { allowed: false, reason: access.reason };
  }

  if (user.role === 'DOCTOR') {
    return { allowed: true, patient: access.patient };
  }

  if (user.role === 'DELEGATED_STAFF') {
    if (user.permissions?.includes(DELEGATE_PERMISSIONS.UPLOAD_DOCUMENTS)) {
      return { allowed: true, patient: access.patient };
    }
    return { allowed: false, reason: 'Delegated staff lacks UPLOAD_DOCUMENTS permission' };
  }

  if (user.role === 'ADMIN') {
    return { allowed: true, patient: access.patient };
  }

  return { allowed: false, reason: 'Upload not authorized for this role' };
}

/**
 * Verifies document download/preview authorization.
 */
export async function verifyDocumentAccess(
  user: SessionPayload,
  documentId: string
) {
  const doc = await prisma.prescriptionDocument.findUnique({
    where: { id: documentId },
    include: {
      patient: true,
      versions: { orderBy: { versionNumber: 'desc' } },
    },
  });

  if (!doc) {
    return { allowed: false, reason: 'Document not found' };
  }

  // Doctor check
  if (user.role === 'DOCTOR') {
    if (doc.doctorId === user.userId) {
      return { allowed: true, document: doc };
    }
    return { allowed: false, reason: 'Document belongs to another doctor' };
  }

  // Delegated staff check
  if (user.role === 'DELEGATED_STAFF') {
    if (doc.doctorId === user.delegatedDoctorId) {
      const canDownload = user.permissions?.includes(DELEGATE_PERMISSIONS.DOWNLOAD_PRESCRIPTIONS);
      const canView = user.permissions?.includes(DELEGATE_PERMISSIONS.VIEW_PRESCRIPTIONS);
      if (canDownload || canView) {
        return { allowed: true, document: doc };
      }
      return { allowed: false, reason: 'Staff lacks VIEW_PRESCRIPTIONS or DOWNLOAD_PRESCRIPTIONS permission' };
    }
    return { allowed: false, reason: 'Document does not belong to your supervising physician' };
  }

  // Admin check
  if (user.role === 'ADMIN') {
    if (doc.organizationId === user.organizationId) {
      return { allowed: true, document: doc };
    }
    return { allowed: false, reason: 'Cross-organization document access denied' };
  }

  // Super Admin check
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, document: doc };
  }

  return { allowed: false, reason: 'Access denied' };
}
