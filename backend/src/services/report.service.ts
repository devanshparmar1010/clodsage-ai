/**
 * CloudSight AI — Report Service
 *
 * Generates executive PDF reports using PDFKit.
 * Report sections per the specification:
 *   - Executive Summary
 *   - Savings Opportunities
 *   - Recommendation Breakdown
 *   - Prophet Forecast
 *   - FinOps Score
 *   - Implementation Roadmap
 */

import PDFDocument from 'pdfkit';
import { getCachedResults } from './analytics.service';
import { createLogger } from '../utils/logger';
import type { AnalyticsResults } from '../types';

const logger = createLogger('report-service');

/** Brand colors */
const COLORS = {
  primary: '#1e40af',
  secondary: '#64748b',
  accent: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  text: '#1e293b',
  muted: '#94a3b8',
  bg: '#f8fafc',
};

/**
 * Draw a section title with a colored bar.
 */
function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.save();
  doc.rect(50, y, 4, 20).fill(COLORS.primary);
  doc.fontSize(16).fillColor(COLORS.primary).text(title, 62, y + 2, { width: 480 });
  doc.restore();
  return y + 35;
}

/**
 * Draw a key-value metric row.
 */
function drawMetric(doc: PDFKit.PDFDocument, label: string, value: string, y: number): number {
  doc.fontSize(10).fillColor(COLORS.secondary).text(label, 62, y, { width: 200 });
  doc.fontSize(11).fillColor(COLORS.text).text(value, 270, y, { width: 270 });
  return y + 20;
}

/**
 * Check remaining page space and add new page if needed.
 */
function checkPage(doc: PDFKit.PDFDocument, y: number, needed: number = 80): number {
  if (y > 700 - needed) {
    doc.addPage();
    return 50;
  }
  return y;
}

/**
 * Generate the executive PDF report.
 *
 * @returns PDFKit document (readable stream).
 */
export function generateReport(): PDFKit.PDFDocument {
  const results = getCachedResults();

  logger.info('Generating executive PDF report');

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'CloudSight AI - Cloud Optimization Report',
      Author: 'CloudSight AI Analytics Engine',
      Subject: 'Cloud Cost Intelligence Report',
    },
  });

  // -----------------------------------------------------------------------
  // Cover / Header
  // -----------------------------------------------------------------------
  doc.rect(0, 0, 612, 120).fill(COLORS.primary);
  doc.fontSize(28).fillColor('#ffffff').text('CloudSight AI', 50, 35);
  doc.fontSize(14).fillColor('#bfdbfe').text('Cloud Optimization Report', 50, 72);
  doc.fontSize(9).fillColor('#93c5fd').text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    50, 95
  );

  let y = 145;

  // -----------------------------------------------------------------------
  // Section 1: Executive Summary
  // -----------------------------------------------------------------------
  y = drawSectionTitle(doc, 'Executive Summary', y);

  y = drawMetric(doc, 'Current Monthly Spend', `$${results.dashboard.monthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y);
  y = drawMetric(doc, 'Potential Monthly Savings', `$${results.dashboard.potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y);
  y = drawMetric(doc, 'Savings Percentage', `${results.dashboard.savingsPercentage.toFixed(1)}%`, y);
  y = drawMetric(doc, 'Annual Savings Opportunity', `$${results.savings.totalAnnualSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y);
  y = drawMetric(doc, 'ROI', `${results.savings.roiPercentage.toFixed(1)}%`, y);
  y = drawMetric(doc, 'FinOps Health Score', `${results.score.score}/100 (${results.score.category})`, y);
  y = drawMetric(doc, 'Resources Analyzed', `${results.metadata.total_resources}`, y);
  y = drawMetric(doc, 'Recommendations Generated', `${results.recommendations.length}`, y);

  y += 15;

  // -----------------------------------------------------------------------
  // Section 2: Savings Opportunities
  // -----------------------------------------------------------------------
  y = checkPage(doc, y, 150);
  y = drawSectionTitle(doc, 'Savings Opportunities', y);

  // By service breakdown
  doc.fontSize(11).fillColor(COLORS.text).text('Savings by Service:', 62, y);
  y += 20;

  for (const [service, count] of Object.entries(results.savings.byService)) {
    const serviceRecs = results.recommendations.filter((r) => r.resourceType === service);
    const serviceSavings = serviceRecs.reduce((sum, r) => sum + r.annualSavings, 0);
    y = drawMetric(doc, `  ${service} (${count} recommendations)`, `$${serviceSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}/year`, y);
  }

  y += 10;

  // By category breakdown
  doc.fontSize(11).fillColor(COLORS.text).text('By Category:', 62, y);
  y += 20;
  for (const [cat, count] of Object.entries(results.savings.byCategory)) {
    y = drawMetric(doc, `  ${cat.replace('_', ' ')}`, `${count} recommendation(s)`, y);
  }

  y += 15;

  // -----------------------------------------------------------------------
  // Section 3: Recommendation Breakdown (Top 10)
  // -----------------------------------------------------------------------
  y = checkPage(doc, y, 200);
  y = drawSectionTitle(doc, 'Top Recommendations', y);

  const topRecs = results.recommendations.slice(0, 10);
  for (const rec of topRecs) {
    y = checkPage(doc, y, 60);

    doc.fontSize(10).fillColor(COLORS.primary).text(`${rec.id}: ${rec.title}`, 62, y, { width: 480 });
    y += 15;
    doc.fontSize(9).fillColor(COLORS.secondary).text(
      `Risk: ${rec.risk} | Confidence: ${(rec.confidence * 100).toFixed(0)}% | Annual Savings: $${rec.annualSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      72, y, { width: 470 }
    );
    y += 20;
  }

  y += 10;

  // -----------------------------------------------------------------------
  // Section 4: Prophet Forecast
  // -----------------------------------------------------------------------
  if (results.forecast) {
    y = checkPage(doc, y, 150);
    y = drawSectionTitle(doc, 'Cost Forecast (Meta Prophet)', y);

    y = drawMetric(doc, 'Forecast Model', results.forecast.model, y);
    y = drawMetric(doc, 'Next Month Projection', `$${results.forecast.nextMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y);
    y = drawMetric(doc, 'Growth Rate', `${results.forecast.growthRate.toFixed(1)}%`, y);
    y = drawMetric(doc, 'Confidence Range', `$${results.forecast.confidenceInterval.lower.toLocaleString()} - $${results.forecast.confidenceInterval.upper.toLocaleString()}`, y);
    y = drawMetric(doc, 'Seasonality Detected', results.forecast.seasonalityDetected ? 'Yes' : 'No', y);

    y += 5;
    doc.fontSize(9).fillColor(COLORS.text).text(results.forecast.executiveSummary, 62, y, { width: 480 });
    y += 50;
  }

  // -----------------------------------------------------------------------
  // Section 5: FinOps Score
  // -----------------------------------------------------------------------
  y = checkPage(doc, y, 150);
  y = drawSectionTitle(doc, 'FinOps Health Score', y);

  const scoreColor = results.score.score >= 70 ? COLORS.accent : results.score.score >= 50 ? COLORS.warning : COLORS.danger;
  doc.fontSize(36).fillColor(scoreColor).text(`${results.score.score}`, 62, y);
  doc.fontSize(14).fillColor(COLORS.secondary).text(`/ 100  (${results.score.category})`, 120, y + 12);
  y += 50;

  y = drawMetric(doc, 'Compute Efficiency', `${results.score.breakdown.compute}/100`, y);
  y = drawMetric(doc, 'Storage Efficiency', `${results.score.breakdown.storage}/100`, y);
  y = drawMetric(doc, 'Reserved Capacity', `${results.score.breakdown.reservedCapacity}/100`, y);

  y += 10;

  // Improvement recommendations
  if (results.score.recommendations.length > 0) {
    doc.fontSize(10).fillColor(COLORS.text).text('Improvement Actions:', 62, y);
    y += 18;
    for (const tip of results.score.recommendations) {
      y = checkPage(doc, y, 20);
      doc.fontSize(9).fillColor(COLORS.secondary).text(`  • ${tip}`, 62, y, { width: 480 });
      y += 15;
    }
  }

  y += 15;

  // -----------------------------------------------------------------------
  // Section 6: Implementation Roadmap
  // -----------------------------------------------------------------------
  y = checkPage(doc, y, 120);
  y = drawSectionTitle(doc, 'Implementation Roadmap', y);

  const roadmapSteps = [
    { phase: 'Week 1', action: 'Quick Wins — Delete orphaned volumes, enable Intelligent Tiering' },
    { phase: 'Week 2', action: 'High Impact — Rightsize underutilized EC2 and RDS instances' },
    { phase: 'Month 2', action: 'Strategic — Purchase Savings Plans for long-running workloads' },
    { phase: 'Month 3', action: 'Lifecycle — Migrate cold S3 data to Glacier / Deep Archive' },
    { phase: 'Ongoing', action: 'Monitor — Track FinOps score and optimize continuously' },
  ];

  for (const step of roadmapSteps) {
    y = checkPage(doc, y, 25);
    doc.fontSize(10).fillColor(COLORS.primary).text(step.phase, 62, y, { width: 80 });
    doc.fontSize(10).fillColor(COLORS.text).text(step.action, 150, y, { width: 390 });
    y += 20;
  }

  // -----------------------------------------------------------------------
  // Footer
  // -----------------------------------------------------------------------
  y = checkPage(doc, y, 40);
  y += 20;
  doc.moveTo(50, y).lineTo(545, y).stroke(COLORS.muted);
  y += 10;
  doc.fontSize(8).fillColor(COLORS.muted).text(
    'This report was generated by CloudSight AI. All recommendations are advisory and require human approval before implementation.',
    50, y, { width: 495, align: 'center' }
  );

  doc.end();

  logger.info('PDF report generated');
  return doc;
}
