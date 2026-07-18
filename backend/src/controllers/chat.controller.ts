/**
 * CloudSight AI — Chat Controller
 * POST /api/v1/chat
 */

import { Request, Response, NextFunction } from 'express';
import { getChatResponse } from '../services/chat.service';

export async function chatHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, isLive } = req.body as { message?: string; isLive?: boolean };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Chat request must include a non-empty message.',
        },
      });
      return;
    }

    const response = await getChatResponse({ message: message.trim(), isLive });
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
