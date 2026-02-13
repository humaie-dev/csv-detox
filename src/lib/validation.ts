/**
 * File upload validation utilities
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];

/**
 * Sanitizes a filename to prevent directory traversal and other attacks.
 * Removes path separators, null bytes, and control characters.
 */
export function sanitizeFilename(filename: string): string {
  // Handle empty input
  if (!filename || filename.trim() === "") {
    return `upload_${Date.now()}`;
  }

  // Remove any path components - take only the last part
  const basename = filename.split(/[/\\]/).pop();

  // If nothing left after path removal, generate default
  if (!basename) {
    return `upload_${Date.now()}`;
  }

  // Remove null bytes and control characters
  const cleaned = basename.replace(/[\x00-\x1f\x80-\x9f]/g, "");

  // Replace problematic characters with underscores
  const safe = cleaned.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Ensure filename is not empty and not a dot file
  if (!safe || safe.startsWith(".")) {
    return `upload_${Date.now()}`;
  }

  return safe;
}

/**
 * Validates file type based on MIME type and extension.
 */
export function validateFileType(filename: string, mimeType: string): boolean {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return false;
  }

  // Check file extension
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));

  return hasValidExtension;
}

/**
 * Validates file size.
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Gets the maximum allowed file size in bytes.
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}
