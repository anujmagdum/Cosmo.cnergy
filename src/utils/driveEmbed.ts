/**
 * Google Drive Zero-Storage Link Parser & CDN Thumbnail Utility
 * Converts standard sharing and preview links into direct image render endpoints
 */

/**
 * Extracts Google Drive File ID from any standard link format
 */
export const extractDriveFileId = (input?: string | null): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: /file/d/{FILE_ID}/view or /file/d/{FILE_ID}
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Pattern 2: id={FILE_ID} query parameter (e.g. open?id=... or uc?id=...)
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) {
    return idQueryMatch[1];
  }

  // Pattern 3: Direct alphanumeric ID with standard length (25-45 characters)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};

/**
 * Generates direct high-resolution Google thumbnail CDN endpoint
 * @param urlOrId Full Google Drive URL or File ID
 * @param width Max width in pixels (defaults to 1000px)
 */
export const getDriveThumbnailUrl = (urlOrId?: string | null, width: number = 1000): string | null => {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return null;

  // Google's high-speed content delivery network for Drive public files
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
};

/**
 * Generates secondary fallback Google Drive thumbnail endpoint
 */
export const getDriveThumbnailFallbackUrl = (urlOrId?: string | null, size: number = 1000): string | null => {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return null;

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
};

/**
 * Generates direct canonical Google Drive preview link to view in Google Drive UI
 */
export const getDriveDirectViewUrl = (urlOrId?: string | null): string => {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId || '#';

  return `https://drive.google.com/file/d/${fileId}/view`;
};

/**
 * Verifies if a given string has a valid Google Drive format
 */
export const isValidDriveUrl = (input?: string | null): boolean => {
  return extractDriveFileId(input) !== null;
};
