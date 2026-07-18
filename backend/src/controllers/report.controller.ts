/**
 * CloudSight AI — Report Controller
 * GET /api/v1/report
 */

import { Request, Response, NextFunction } from 'express';
import { generateReport } from '../services/report.service';

export function reportHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const doc = generateReport();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CloudSight_AI_Report.pdf"');

    doc.pipe(res);
  } catch (err) {
    next(err);
  }
}
