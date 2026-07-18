/**
 * CloudSight AI — Centralized Configuration
 *
 * Loads environment variables and provides typed configuration
 * for all backend services.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  /** Server port */
  port: parseInt(process.env.PORT || '3001', 10),

  /** Node environment */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Path to analytics Python package (relative to backend root) */
  analyticsPath: path.resolve(__dirname, '../../', process.env.ANALYTICS_PATH || '../analytics'),

  /** Analytics execution timeout in milliseconds */
  analyticsTimeout: parseInt(process.env.ANALYTICS_TIMEOUT || '120000', 10),

  /** Logging level */
  logLevel: process.env.LOG_LEVEL || 'info',

  /** Upload file size limit (10MB) */
  maxFileSize: 10 * 1024 * 1024,

  /** Temporary upload directory */
  uploadDir: path.resolve(__dirname, '../../uploads'),

  /** Path to the docs directory containing API spec */
  docsPath: path.resolve(__dirname, '../../../Docs'),
} as const;
