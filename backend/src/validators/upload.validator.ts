/**
 * CloudSight AI — Upload Validators
 *
 * Zod schemas for validating uploaded CSV files.
 * Validates file presence, MIME type, and size limits.
 */

import { z } from 'zod';

/** Required CSV file names for upload */
export const REQUIRED_FILES = ['ec2', 's3', 'ebs', 'rds', 'monthlyCost'] as const;

/** Allowed MIME types for CSV uploads */
const CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
];

/** Maximum file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate that all required files are present in the upload.
 */
export function validateUploadFiles(
  files: Record<string, Express.Multer.File[]> | undefined
): { valid: boolean; missing: string[]; errors: string[] } {
  const errors: string[] = [];
  const missing: string[] = [];

  if (!files) {
    return { valid: false, missing: [...REQUIRED_FILES], errors: ['No files uploaded'] };
  }

  for (const fieldName of REQUIRED_FILES) {
    const fileArray = files[fieldName];
    if (!fileArray || fileArray.length === 0) {
      missing.push(fieldName);
      continue;
    }

    const file = fileArray[0];

    // Validate MIME type
    if (!CSV_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`${fieldName}: Invalid file type '${file.mimetype}'. Expected CSV.`);
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${fieldName}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
    }
  }

  if (missing.length > 0) {
    errors.push(`Missing required files: ${missing.join(', ')}`);
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/** Query parameter schema for recommendations endpoint */
export const recommendationsQuerySchema = z.object({
  category: z.enum(['EC2', 'S3', 'EBS', 'RDS']).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

/** Query parameter schema for resources endpoint */
export const resourcesQuerySchema = z.object({
  type: z.enum(['EC2', 'S3', 'EBS', 'RDS']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
