/** Confidence tier thresholds */
export const TIER_THRESHOLDS = {
  high: 0.85,
  medium: 0.60,
} as const;

/** Maximum file size for classification (10 MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Accepted image MIME types */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum images for multi-photo fusion */
export const MAX_MULTI_PHOTOS = 3;

/** Maximum dimension for re-encoding before storage upload */
export const MAX_UPLOAD_DIMENSION = 1024;

/** Content width for app pages */
export const CONTENT_MAX_WIDTH = 'max-w-[1200px]';

/** Number of history items per page */
export const HISTORY_PAGE_SIZE = 50;
