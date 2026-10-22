import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Statistically scoped storage path to avoid Turbopack tracing warnings
const ABSOLUTE_STORAGE_DIR = path.join(process.cwd(), 'storage', 'prescriptions');

export function ensureStorageDirectoryExists() {
  if (!fs.existsSync(ABSOLUTE_STORAGE_DIR)) {
    fs.mkdirSync(ABSOLUTE_STORAGE_DIR, { recursive: true });
  }
}

export interface UploadResult {
  storageKey: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
}

/**
 * Saves uploaded file to private non-public storage and computes SHA-256 hash.
 */
export async function savePrivateFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  patientId: string
): Promise<UploadResult> {
  ensureStorageDirectoryExists();

  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const safeFilename = `${patientId}-${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(ABSOLUTE_STORAGE_DIR, safeFilename);

  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    storageKey: safeFilename,
    fileHash,
    fileSize: fileBuffer.length,
    mimeType,
    originalFilename,
  };
}

/**
 * Retrieves file buffer from private storage.
 */
export async function readPrivateFile(storageKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
  // Prevent directory traversal attacks
  const safeKey = path.basename(storageKey);
  const filePath = path.join(ABSOLUTE_STORAGE_DIR, safeKey);

  if (!fs.existsSync(filePath)) {
    return { buffer: Buffer.alloc(0), exists: false };
  }

  const buffer = await fs.promises.readFile(filePath);
  return { buffer, exists: true };
}

/**
 * Verifies that a file on disk matches its recorded SHA-256 hash.
 */
export async function verifyFileIntegrity(storageKey: string, expectedHash: string): Promise<boolean> {
  const { buffer, exists } = await readPrivateFile(storageKey);
  if (!exists) return false;
  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
  return actualHash === expectedHash;
}
