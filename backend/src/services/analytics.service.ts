/**
 * CloudSight AI — Analytics Service
 *
 * Core integration layer between the Express backend and the
 * Python analytics engines. In live mode, it executes the Python
 * AWS live query pipeline synchronously and caches the result.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { config } from '../config';
import type { AnalyticsResults } from '../types';
import { AppError, AnalyticsError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('analytics-service');

/** In-memory cache for live AWS data */
let cachedAWSData: { results: AnalyticsResults; resources: any[] } | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // Cache for 60 seconds

/** Path to the analytics data directory */
const analyticsDataDir = path.join(config.analyticsPath, 'data');
const resultsPath = path.join(analyticsDataDir, 'results.json');

/**
 * Execute the AWS Python script command synchronously and parse the JSON.
 */
export function getLiveAWSData(): { results: AnalyticsResults; resources: any[] } {
  const now = Date.now();
  if (cachedAWSData && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedAWSData;
  }

  logger.info('Executing live AWS query via Python CLI...');
  const pythonPath = 'python';
  const analyticsRoot = path.resolve(config.analyticsPath, '..');

  try {
    const stdout = execFileSync(
      pythonPath,
      ['-m', 'analytics.aws_service', 'all'],
      {
        cwd: analyticsRoot,
        timeout: 30000, // 30s timeout
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8'
      }
    );

    const parsed = JSON.parse(stdout.trim());

    if (parsed.error === 'credentials_missing') {
      throw new AppError('AWS credentials not configured.', 400, 'AWS_CREDENTIALS_MISSING');
    }

    if (parsed.error === 'credentials_invalid') {
      throw new AppError('AWS credentials configured but invalid.', 401, 'AWS_CREDENTIALS_INVALID');
    }

    if (parsed.error === 'execution_failed') {
      throw new AppError(`AWS query failed: ${parsed.message}`, 502, 'ANALYTICS_ERROR');
    }

    cachedAWSData = {
      results: parsed.results,
      resources: parsed.resources
    };
    lastFetchTime = now;

    return cachedAWSData;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout.toString().trim());
        if (parsed.error === 'credentials_missing') {
          throw new AppError('AWS credentials not configured.', 400, 'AWS_CREDENTIALS_MISSING');
        }
        if (parsed.error === 'credentials_invalid') {
          throw new AppError('AWS credentials configured but invalid.', 401, 'AWS_CREDENTIALS_INVALID');
        }
        if (parsed.error === 'execution_failed') {
          throw new AppError(`AWS query failed: ${parsed.message}`, 502, 'ANALYTICS_ERROR');
        }
      } catch (e) {
        // Fall through
      }
    }

    logger.error(`Live AWS query subprocess failed: ${err.message}`);
    throw new AppError(`AWS API query failed: ${err.message}`, 502, 'ANALYTICS_ERROR');
  }
}

/**
 * Invalidate in-memory cache to force a fresh pull.
 */
export function invalidateCache(): void {
  cachedAWSData = null;
  lastFetchTime = 0;
  logger.info('AWS cache invalidated.');
}

/**
 * Get cached analytics results.
 * This is the central source of truth for the entire application.
 */
export function getCachedResults(): AnalyticsResults {
  // Pull dynamically from live AWS
  const data = getLiveAWSData();
  return data.results;
}

/**
 * Copy uploaded CSV files (deprecated in live mode).
 */
export async function copyUploadsToAnalytics(
  files: Record<string, Express.Multer.File[]>
): Promise<void> {
  if (!fs.existsSync(analyticsDataDir)) {
    fs.mkdirSync(analyticsDataDir, { recursive: true });
  }

  const fileMapping: Record<string, string> = {
    ec2: 'ec2.csv',
    s3: 's3.csv',
    ebs: 'ebs.csv',
    rds: 'rds.csv',
    monthlyCost: 'monthly_cost.csv',
  };

  for (const [fieldName, targetName] of Object.entries(fileMapping)) {
    const fileArray = files[fieldName];
    if (fileArray && fileArray.length > 0) {
      const source = fileArray[0].path;
      const dest = path.join(analyticsDataDir, targetName);
      fs.copyFileSync(source, dest);
    }
  }
}

/**
 * Load local results.json directly.
 */
export function getLocalResults(): AnalyticsResults {
  try {
    if (!fs.existsSync(resultsPath)) {
      throw new AppError('No analytics results found. Please upload dataset CSVs first.', 404, 'RESULTS_NOT_FOUND');
    }
    const raw = fs.readFileSync(resultsPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to load local results: ${err.message}`, 500, 'LOAD_RESULTS_FAILED');
  }
}

/**
 * Execute the legacy Python pipeline (deprecated in live mode).
 */
export async function runAnalyticsPipeline(): Promise<void> {
  logger.info('Executing local Python pipeline...');
  const pythonPath = 'python';
  const analyticsRoot = path.resolve(config.analyticsPath, '..');

  try {
    execFileSync(
      pythonPath,
      ['-m', 'analytics.main'],
      {
        cwd: analyticsRoot,
        timeout: config.analyticsTimeout,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8'
      }
    );
    logger.info('Local Python pipeline execution complete.');
  } catch (err: any) {
    logger.error(`Local Python pipeline subprocess failed: ${err.message}`);
    throw new AppError(`Local Python pipeline failed: ${err.message}`, 502, 'ANALYTICS_ERROR');
  }
}

/**
 * Load results (deprecated in live mode).
 */
export async function loadResults(): Promise<AnalyticsResults> {
  return getLocalResults();
}

/**
 * Clean up temporary upload files.
 */
export function cleanupUploads(files: Record<string, Express.Multer.File[]>): void {
  for (const fileArray of Object.values(files)) {
    for (const file of fileArray) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // Ignore
      }
    }
  }
}
