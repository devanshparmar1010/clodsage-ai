/**
 * CloudSight AI — Upload Service
 *
 * Orchestrates the upload flow:
 *   1. Validate files
 *   2. Copy to analytics directory
 *   3. Run Python analytics pipeline
 *   4. Load results
 *   5. Return upload response
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { validateUploadFiles } from '../validators/upload.validator';
import {
  copyUploadsToAnalytics,
  runAnalyticsPipeline,
  loadResults,
  cleanupUploads,
} from './analytics.service';
import type { UploadResponse } from '../types';

const logger = createLogger('upload-service');

/**
 * Process an upload request end-to-end.
 *
 * @param files - Multer files from the request.
 * @returns UploadResponse with upload ID, status, and resource count.
 */
export async function processUpload(
  files: Record<string, Express.Multer.File[]> | undefined
): Promise<UploadResponse> {
  const uploadId = `upl_${uuidv4().slice(0, 8)}`;
  logger.info(`Processing upload ${uploadId}`);

  // Step 1: Validate files
  const validation = validateUploadFiles(files);
  if (!validation.valid) {
    throw new ValidationError('File validation failed', {
      missing: validation.missing,
      errors: validation.errors,
    });
  }

  try {
    // Step 2: Copy files to analytics directory
    await copyUploadsToAnalytics(files!);

    // Step 3: Run analytics pipeline
    await runAnalyticsPipeline();

    // Step 4: Load results
    const results = await loadResults();

    // Step 5: Build response
    const response: UploadResponse = {
      uploadId,
      status: 'completed',
      resourcesDetected: results.metadata.total_resources,
    };

    logger.info(`Upload ${uploadId} completed`, {
      resources: response.resourcesDetected,
    });

    return response;
  } finally {
    // Clean up temp upload files
    if (files) {
      cleanupUploads(files);
    }
  }
}
