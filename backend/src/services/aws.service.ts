/**
 * CloudSight AI — AWS Service
 *
 * Runs the python AWS command line utility and returns the parsed JSON response.
 * Handles credential checks and maps python exceptions.
 */

import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const execFileAsync = promisify(execFile);
const logger = createLogger('aws-service');

/**
 * Execute the AWS Python script command and parse the JSON output.
 *
 * @param command - The AWS service command to execute (e.g., 'ec2', 's3', 'dashboard').
 * @returns Parsed JSON object from Python stdout.
 */
export async function runAWSCommand(command: string): Promise<any> {
  const pythonPath = 'python';
  const analyticsRoot = path.resolve(config.analyticsPath, '..');

  try {
    const { stdout, stderr } = await execFileAsync(
      pythonPath,
      ['-m', 'analytics.aws_service', command],
      {
        cwd: analyticsRoot,
        timeout: 30000, // 30 seconds timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    if (stderr && stderr.trim()) {
      logger.warn(`AWS Python stdout/stderr warning: ${stderr.trim()}`);
    }

    const result = JSON.parse(stdout.trim());

    if (result.error === 'credentials_missing') {
      const err = new Error(result.message || 'AWS credentials not configured.');
      (err as any).statusCode = 400;
      (err as any).code = 'AWS_CREDENTIALS_MISSING';
      throw err;
    }

    if (result.error === 'credentials_invalid') {
      const err = new Error(result.message || 'AWS credentials configured but invalid.');
      (err as any).statusCode = 401;
      (err as any).code = 'AWS_CREDENTIALS_INVALID';
      throw err;
    }

    if (result.error === 'execution_failed') {
      const err = new Error(`AWS command failed: ${result.message}`);
      (err as any).statusCode = 502;
      (err as any).code = 'ANALYTICS_ERROR';
      throw err;
    }

    return result;
  } catch (err: any) {
    if (err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 502) {
      throw err;
    }

    // Try parsing stdout in case it was printed as JSON before exit/crash
    if (err.stdout) {
      try {
        const result = JSON.parse(err.stdout.toString().trim());
        if (result.error === 'credentials_missing') {
          const customErr = new Error(result.message || 'AWS credentials not configured.');
          (customErr as any).statusCode = 400;
          (customErr as any).code = 'AWS_CREDENTIALS_MISSING';
          throw customErr;
        }
        if (result.error === 'credentials_invalid') {
          const customErr = new Error(result.message || 'AWS credentials configured but invalid.');
          (customErr as any).statusCode = 401;
          (customErr as any).code = 'AWS_CREDENTIALS_INVALID';
          throw customErr;
        }
        if (result.error === 'execution_failed') {
          const customErr = new Error(`AWS command failed: ${result.message}`);
          (customErr as any).statusCode = 502;
          (customErr as any).code = 'ANALYTICS_ERROR';
          throw customErr;
        }
      } catch (parseErr) {
        // Continue to standard handler
      }
    }

    logger.error(`Failed to run AWS Python command '${command}': ${err.message}`);
    throw err;
  }
}
