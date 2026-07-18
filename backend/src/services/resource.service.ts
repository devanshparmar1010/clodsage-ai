/**
 * CloudSight AI — Resource Explorer Service
 *
 * Pulls resource inventory directly from the live AWS query data.
 * Supports pagination and filtering by resource type.
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import type { Resource, ResourceCollection } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('resource-service');

/**
 * Parse a CSV string into an array of records.
 */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

/**
 * Determine resource status based on utilization.
 */
function getStatus(utilization: number): 'Idle' | 'Underutilized' | 'Moderate' | 'Active' {
  if (utilization < 10) return 'Idle';
  if (utilization < 30) return 'Underutilized';
  if (utilization < 70) return 'Moderate';
  return 'Active';
}

/**
 * Load all resources from CSV data, transform to Resource objects.
 */
function loadResources(): Resource[] {
  const dataDir = path.join(config.analyticsPath, 'data');
  const resources: Resource[] = [];

  // EC2 resources
  try {
    const ec2Data = fs.readFileSync(path.join(dataDir, 'ec2.csv'), 'utf-8');
    const ec2Records = parseCSV(ec2Data);
    for (const rec of ec2Records) {
      resources.push({
        id: rec.instance_id,
        type: 'EC2',
        name: rec.instance_name,
        utilization: parseFloat(rec.cpu_avg) || 0,
        monthlyCost: parseFloat(rec.monthly_cost) || 0,
        status: getStatus(parseFloat(rec.cpu_avg) || 0),
        region: rec.region,
        details: {
          instanceType: rec.instance_type,
          cpuAvg: parseFloat(rec.cpu_avg),
          memoryAvg: parseFloat(rec.memory_avg),
          hoursRunning: parseInt(rec.hours_running),
          environment: rec.environment,
        },
      });
    }
  } catch (err) {
    logger.warn('Failed to load EC2 resources', { error: (err as Error).message });
  }

  // S3 resources
  try {
    const s3Data = fs.readFileSync(path.join(dataDir, 's3.csv'), 'utf-8');
    const s3Records = parseCSV(s3Data);
    for (const rec of s3Records) {
      const accessDays = parseInt(rec.last_access_days) || 0;
      resources.push({
        id: rec.bucket_name,
        type: 'S3',
        name: rec.bucket_name,
        utilization: Math.max(0, 100 - (accessDays / 3.65)),  // Rough activity metric
        monthlyCost: parseFloat(rec.monthly_cost) || 0,
        status: accessDays > 90 ? 'Cold' : accessDays > 30 ? 'Warm' : 'Active',
        region: rec.region,
        details: {
          sizeTb: parseFloat(rec.size_tb),
          objectCount: parseInt(rec.object_count),
          lastAccessDays: accessDays,
          storageClass: rec.storage_class,
        },
      });
    }
  } catch (err) {
    logger.warn('Failed to load S3 resources', { error: (err as Error).message });
  }

  // EBS resources
  try {
    const ebsData = fs.readFileSync(path.join(dataDir, 'ebs.csv'), 'utf-8');
    const ebsRecords = parseCSV(ebsData);
    for (const rec of ebsRecords) {
      const attached = rec.attached === 'true';
      resources.push({
        id: rec.volume_id,
        type: 'EBS',
        name: rec.volume_id,
        utilization: parseFloat(rec.utilization_percentage) || 0,
        monthlyCost: parseFloat(rec.monthly_cost) || 0,
        status: !attached ? 'Orphaned' : getStatus(parseFloat(rec.utilization_percentage) || 0),
        details: {
          attached,
          instanceId: rec.instance_id || null,
          sizeGb: parseInt(rec.size_gb),
          lastAccessDays: parseInt(rec.last_access_days),
        },
      });
    }
  } catch (err) {
    logger.warn('Failed to load EBS resources', { error: (err as Error).message });
  }

  // RDS resources
  try {
    const rdsData = fs.readFileSync(path.join(dataDir, 'rds.csv'), 'utf-8');
    const rdsRecords = parseCSV(rdsData);
    for (const rec of rdsRecords) {
      resources.push({
        id: rec.db_id,
        type: 'RDS',
        name: rec.db_id,
        utilization: parseFloat(rec.cpu_avg) || 0,
        monthlyCost: parseFloat(rec.monthly_cost) || 0,
        status: getStatus(parseFloat(rec.cpu_avg) || 0),
        details: {
          instanceClass: rec.instance_class,
          engine: rec.engine,
          cpuAvg: parseFloat(rec.cpu_avg),
          memoryAvg: parseFloat(rec.memory_avg),
          connectionsAvg: parseInt(rec.connections_avg),
        },
      });
    }
  } catch (err) {
    logger.warn('Failed to load RDS resources', { error: (err as Error).message });
  }

  return resources;
}

/**
 * Get paginated, filtered resources.
 *
 * @param type     - Optional resource type filter.
 * @param page     - Page number (1-indexed).
 * @param pageSize - Items per page.
 * @returns ResourceCollection with pagination metadata.
 */
export function getResources(
  type?: string,
  page: number = 1,
  pageSize: number = 20,
): ResourceCollection {
  let resources = loadResources();

  // Filter by type
  if (type) {
    resources = resources.filter((r) => r.type === type);
  }

  // Paginate
  const total = resources.length;
  const startIndex = (page - 1) * pageSize;
  const items = resources.slice(startIndex, startIndex + pageSize);

  return { total, page, pageSize, items };
}
