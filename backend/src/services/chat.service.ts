/**
 * CloudSight AI — Chat Service
 * Generates conversational answers for user questions based on live AWS data.
 */

import { getCachedResults, getLocalResults } from './analytics.service';
import type { Recommendation, DashboardResponse, ScoreResponse, ForecastResponse } from '../types';

export interface ChatRequest {
  message: string;
  isLive?: boolean;
}

export interface ChatResponse {
  answer: string;
  context?: {
    dashboard?: DashboardResponse;
    topRecommendations?: Pick<Recommendation, 'title' | 'resourceType' | 'monthlySavings'>[];
    score?: ScoreResponse;
    forecast?: ForecastResponse;
  };
}

export async function getChatResponse(request: ChatRequest): Promise<ChatResponse> {
  let rawResults;
  const isLive = !!request.isLive;

  try {
    rawResults = isLive ? getCachedResults() : getLocalResults();
  } catch (err: any) {
    let errMsg = 'I could not access your data. Please make sure your datasets are uploaded or AWS credentials are configured.';
    if (err.message && err.message.includes('not configured')) {
      errMsg = 'It looks like your AWS credentials are not configured in the backend .env file. Please define AWS_ACCESS_KEY and AWS_SECRET_KEY.';
    } else if (err.message && err.message.includes('invalid')) {
      errMsg = 'Your AWS credentials were configured but the connection was rejected. Please check your access key and secret key.';
    } else if (err.message && err.message.includes('No analytics results found')) {
      errMsg = 'No manual upload data was found. Please upload your CSV datasets on the Landing Page first.';
    }
    return {
      answer: errMsg
    };
  }

  const db = rawResults.dashboard as any;
  const counts = rawResults.metadata.resources_analyzed || {};
  const ec2Count = counts.ec2 !== undefined ? counts.ec2 : 0;
  const s3Count = counts.s3 !== undefined ? counts.s3 : 0;
  const rdsCount = counts.rds !== undefined ? counts.rds : 0;
  const ebsCount = counts.ebs !== undefined ? counts.ebs : 0;
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const lower = request.message.trim().toLowerCase();
  let answer = '';

  // 1. EC2 Instance Count & Status
  if (lower.includes('ec2') && (lower.includes('count') || lower.includes('how many') || lower.includes('instance') || lower.includes('total'))) {
    answer = `You currently have ${ec2Count} EC2 instances configured in your account.`;
  }
  // 2. S3 Bucket Questions
  else if (lower.includes('s3') || lower.includes('bucket')) {
    answer = `You currently have ${s3Count} S3 buckets configured in your account.`;
  }
  // 3. RDS Database Questions
  else if (lower.includes('rds') || lower.includes('database') || lower.includes('db')) {
    answer = `You currently have ${rdsCount} RDS database instances in your account.`;
  }
  // 4. EBS Volume Questions
  else if (lower.includes('ebs') || lower.includes('volume')) {
    answer = `You currently have ${ebsCount} EBS volumes in your account.`;
  }
  // 5. Why Spend / Forecast is Zero
  else if (lower.includes('why') && (lower.includes('zero') || lower.includes('0'))) {
    if (isLive && db.monthlySpend === 0) {
      answer = `Your monthly spend and forecast show $0.00 because AWS Cost Explorer has no active cost history for this connected account. However, you still have potential savings of $${db.potentialSavings.toFixed(2)} from active idle resources.`;
    } else {
      answer = `The spend shows zero because there is no recorded historical cost data in the active dataset. If you want to see non-zero forecast trends, try uploading the sample datasets in CSV mode.`;
    }
  }
  // 6. Cost / Spend Queries
  else if ((lower.includes('how much') && (lower.includes('cost') || lower.includes('spend'))) || lower.includes('monthly cost') || lower.includes('monthly spend') || lower.includes('aws cost')) {
    answer = `Your current month's monthly spend is $${db.monthlySpend.toFixed(2)}.`;
  }
  // 7. Idle EC2 Instances Checks
  else if (lower.includes('idle') && (lower.includes('ec2') || lower.includes('instance'))) {
    const idleEc2 = rawResults.recommendations.filter(r => r.resourceType === 'EC2' && r.title.toLowerCase().includes('idle'));
    if (idleEc2.length > 0) {
      const ids = idleEc2.map(r => r.resourceId).join(', ');
      answer = `Yes. Based on CloudWatch metrics, you have idle EC2 instances: ${ids}.`;
    } else {
      answer = `No. Based on CloudWatch metrics, there are no idle EC2 instances in this account.`;
    }
  }
  // 8. Why is Score Low
  else if (lower.includes('why') && lower.includes('score') && (lower.includes('low') || lower.includes('why is my'))) {
    const recs = rawResults.recommendations;
    if (recs.length > 0) {
      const findings = recs.map(r => r.title).slice(0, 3).join('; ');
      answer = `Your FinOps score is ${db.finOpsScore}/100. It is affected by findings such as: ${findings} (and ${recs.length - 3} others).`;
    } else {
      answer = `Your FinOps score is ${db.finOpsScore}/100. There are no critical recommendations affecting your score currently.`;
    }
  }
  // 9. Savings & Recommendations Summary
  else if (lower.includes('recommend') || lower.includes('saving')) {
    const topRecs = rawResults.recommendations
      .slice()
      .sort((a, b) => b.monthlySavings - a.monthlySavings)
      .slice(0, 3);
    if (topRecs.length > 0) {
      answer = `Your top savings opportunities are: ${topRecs
        .map((rec) => `${rec.title} (${rec.resourceType}, $${rec.monthlySavings.toFixed(2)}/mo)`).join('; ')}.`;
    } else {
      answer = 'No optimization recommendations found for your AWS account.';
    }
  }
  // 10. General Score Query
  else if (lower.includes('score')) {
    const category = db.finOpsScore >= 90 ? 'Excellent' : db.finOpsScore >= 75 ? 'Healthy' : db.finOpsScore >= 50 ? 'Needs Optimization' : 'Critical';
    answer = `Your FinOps score is ${db.finOpsScore}/100 (${category}).`;
  }
  // 11. General Forecast Query
  else if (lower.includes('forecast') || lower.includes('predict')) {
    const forecastVal = rawResults.forecast;
    if (forecastVal) {
      answer = `The forecast model predicts $${forecastVal.nextMonth.toFixed(2)} for next month. The trend is ${forecastVal.trendDirection || 'stable'} with a ${forecastVal.growthRate.toFixed(1)}% growth rate.`;
    } else {
      answer = `Forecast data is currently not available. Please verify that prophet is installed.`;
    }
  }
  // 12. General Dashboard / Cost Overview
  else if (lower.includes('dashboard') || lower.includes('overview') || lower.includes('summary')) {
    answer = `Current monthly spend is $${db.monthlySpend.toFixed(2)}. Potential savings are $${db.potentialSavings.toFixed(2)}, which is ${db.savingsPercentage.toFixed(1)}% of current spend.`;
  }
  // Fallback
  else {
    answer = `I could not find a specific answer for your question. You can ask about: \n- Monthly spend ("how much is my monthly spend?")\n- Optimization recommendations ("where can I save money?")\n- Forecast ("show my cost forecast")\n- Resource counts ("how many EC2/S3/RDS/EBS resources do I have?")\n- FinOps Score ("what is my score and why?")`;
  }

  // Build top recommendations for context payload
  const topRecommendations = rawResults.recommendations
    .slice()
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 3)
    .map((rec) => ({
      title: rec.title,
      resourceType: rec.resourceType,
      monthlySavings: rec.monthlySavings,
    }));

  return {
    answer,
    context: {
      dashboard: db,
      score: rawResults.score,
      forecast: rawResults.forecast,
      topRecommendations
    }
  };
}
