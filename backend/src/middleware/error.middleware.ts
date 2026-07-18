/**
 * CloudSight AI — Error Handling Middleware
 *
 * Centralized error handler that converts all errors into the
 * ErrorResponse format from API-Specification.yaml.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import type { ErrorResponse } from '../types';

const logger = createLogger('error-handler');

/**
 * Express error-handling middleware.
 * Catches all thrown/next(err) errors and returns structured JSON.
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { issues: err.errors },
      },
    };
    logger.warn('Validation error', { issues: err.errors });
    res.status(400).json(response);
    return;
  }

  // Handle custom AppError hierarchy
  const isAppError = err instanceof AppError || (err && typeof err === 'object' && 'statusCode' in err && 'code' in err);
  if (isAppError) {
    const status = (err as any).statusCode || 500;
    const errCode = (err as any).code || 'INTERNAL_ERROR';
    const details = (err as any).details;

    if (status === 400 && (err.message === 'AWS credentials not configured.' || errCode === 'AWS_CREDENTIALS_MISSING')) {
      res.status(400).json({ message: 'AWS credentials not configured.' });
      return;
    }
    if (status === 401 || errCode === 'AWS_CREDENTIALS_INVALID') {
      res.status(401).json({ message: err.message || 'AWS credentials configured but invalid.' });
      return;
    }

    const response: ErrorResponse = {
      error: {
        code: errCode,
        message: err.message,
        details: details,
      },
    };
    logger.error(`${err.name || 'AppError'}: ${err.message}`, { code: errCode, statusCode: status });
    res.status(status).json(response);
    return;
  }


  // Handle unexpected errors
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}
