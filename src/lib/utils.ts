import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitizes CSV cell content to prevent CSV Formula Injection attacks.
 * If a field begins with '=', '+', '-', '@', or tab, prepend a single quote.
 */
export function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  let safeStr = str;
  if (dangerousPrefixes.some((prefix) => safeStr.startsWith(prefix))) {
    safeStr = `'${safeStr}`;
  }
  // Escape inner quotes
  return `"${safeStr.replace(/"/g, '""')}"`;
}
