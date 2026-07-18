/**
 * CloudSight AI — AWS Controller
 *
 * Exposes controllers for live AWS endpoints.
 * Handles missing credential errors with HTTP 400 and custom flat JSON payload.
 */

import { Request, Response, NextFunction } from 'express';
import { runAWSCommand } from '../services/aws.service';

function handleControllerError(err: any, res: Response, next: NextFunction): void {
  if (err.statusCode === 400 || err.message === 'AWS credentials not configured.' || err.code === 'AWS_CREDENTIALS_MISSING') {
    res.status(400).json({ message: 'AWS credentials not configured.' });
  } else if (err.statusCode === 401 || err.code === 'AWS_CREDENTIALS_INVALID' || err.message.includes('invalid')) {
    res.status(401).json({ message: err.message || 'AWS credentials configured but invalid.' });
  } else if (err.statusCode === 502 || err.code === 'ANALYTICS_ERROR') {
    res.status(502).json({ error: { code: 'ANALYTICS_ERROR', message: err.message } });
  } else {
    next(err);
  }
}


export async function getEC2Handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('ec2');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getS3Handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('s3');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getEBSHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('ebs');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getRDSHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('rds');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getCostHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('cost');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getDashboardHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('dashboard');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getRecommendationsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('recommendations');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

export async function getForecastHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await runAWSCommand('forecast');
    res.status(200).json(result);
  } catch (err) {
    handleControllerError(err, res, next);
  }
}
