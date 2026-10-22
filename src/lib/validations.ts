import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  totpCode: z.string().optional(),
});

export const patientSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters').max(100),
  phone: z
    .string()
    .min(10, 'Phone number must have at least 10 digits')
    .regex(/^[+0-9\s-]{10,20}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other', 'Child']).optional().or(z.literal('')),
  address: z.string().max(250).optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
  consentAcknowledged: z.boolean().refine((val) => val === true, {
    message: 'Patient consent and privacy acknowledgment is required',
  }),
  nonClinicalNotes: z.string().max(1000).optional().or(z.literal('')),
  diagnosticLab: z.string().optional().or(z.literal('')),
});

export const prescriptionUploadSchema = z.object({
  patientId: z.string().uuid('Valid patient selection is required'),
  title: z.string().min(2, 'Document title is required').max(150),
  category: z.enum([
    'PRESCRIPTION',
    'LAB_REPORT',
    'REFERRAL_LETTER',
    'DIAGNOSTIC_IMAGING',
    'DISCHARGE_SUMMARY',
  ]),
  documentDate: z.string().optional(),
  diagnosticLab: z.string().optional().or(z.literal('')),
});

export const addendumSchema = z.object({
  documentId: z.string().uuid(),
  reasonForCorrection: z
    .string()
    .min(5, 'A clinical justification/reason for correction is required (min 5 characters)'),
});

export const inviteDelegateSchema = z.object({
  email: z.string().email('Please enter a valid email for the team member'),
  name: z.string().min(2, 'Team member name is required').max(100),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission must be granted to the delegated member'),
});

export const pharmacyPreferenceSchema = z.object({
  providerId: z.string().min(1, 'Please select a pharmacy provider'),
  notes: z.string().max(500).optional().or(z.literal('')),
});
