/**
 * CloudSight AI — Validation Middleware
 *
 * Generic middleware that validates request query parameters
 * against Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Creates middleware that validates req.query against a Zod schema.
 * Parsed values replace req.query for downstream handlers.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
