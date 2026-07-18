/**
 * CloudSight AI — Upload Controller
 * POST /api/v1/upload
 */

import { Request, Response, NextFunction } from 'express';
import { processUpload } from '../services/upload.service';

export async function uploadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const result = await processUpload(files);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
