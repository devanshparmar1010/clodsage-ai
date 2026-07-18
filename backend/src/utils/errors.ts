/**
 * CloudSight AI — Custom Error Classes
 *
 * Structured error hierarchy for centralized error handling.
 * All errors serialize to the ErrorResponse schema from API-Specification.yaml.
 */

/**
 * Base application error with HTTP status code and error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation error (400) — invalid request data.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404) — requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Analytics error (502) — Python analytics pipeline failure.
 */
export class AnalyticsError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 502, 'ANALYTICS_ERROR', details);
    this.name = 'AnalyticsError';
  }
}

/**
 * No data error (409) — analytics have not been run yet.
 */
export class NoDataError extends AppError {
  constructor() {
    super(
      'No analytics data available. Please upload datasets first via POST /api/v1/upload.',
      409,
      'NO_DATA'
    );
    this.name = 'NoDataError';
  }
}
