/**
 * CloudSight AI — Phase 2 API Contract Tests
 *
 * Validates all 7 endpoints against the OpenAPI specification.
 * Tests response structure, status codes, filtering, pagination,
 * and error handling.
 *
 * Run: npx tsx src/__tests__/api.test.ts
 */

const BASE = 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string = ''): void {
  results.push({ name, passed: condition, details: condition ? 'OK' : details });
}

async function fetchJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

async function fetchRaw(path: string): Promise<{ status: number; contentType: string; size: number }> {
  const res = await fetch(`${BASE}${path}`);
  const buf = await res.arrayBuffer();
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    size: buf.byteLength,
  };
}

// =========================================================================
// TEST 1: Health Check
// =========================================================================
async function testHealth(): Promise<void> {
  const { status, body } = await fetchJson('/health');
  assert(status === 200, 'Health: status 200', `Got ${status}`);
  assert(body.status === 'ok', 'Health: status field', `Got ${body.status}`);
  assert(body.service === 'cloudsight-ai-api', 'Health: service field', `Got ${body.service}`);
}

// =========================================================================
// TEST 2: Dashboard API — GET /api/v1/dashboard
// =========================================================================
async function testDashboard(): Promise<void> {
  const { status, body } = await fetchJson('/api/v1/dashboard');
  assert(status === 200, 'Dashboard: status 200', `Got ${status}`);

  // Validate DashboardResponse schema fields
  assert(typeof body.monthlySpend === 'number', 'Dashboard: monthlySpend is number', `Got ${typeof body.monthlySpend}`);
  assert(typeof body.potentialSavings === 'number', 'Dashboard: potentialSavings is number', `Got ${typeof body.potentialSavings}`);
  assert(typeof body.savingsPercentage === 'number', 'Dashboard: savingsPercentage is number', `Got ${typeof body.savingsPercentage}`);
  assert(typeof body.finOpsScore === 'number', 'Dashboard: finOpsScore is number', `Got ${typeof body.finOpsScore}`);
  assert(typeof body.forecastedSpend === 'number', 'Dashboard: forecastedSpend is number', `Got ${typeof body.forecastedSpend}`);

  // Business validation
  assert(body.monthlySpend > 0, 'Dashboard: monthlySpend > 0', `Got ${body.monthlySpend}`);
  assert(body.potentialSavings > 0, 'Dashboard: potentialSavings > 0', `Got ${body.potentialSavings}`);
  assert(body.finOpsScore >= 0 && body.finOpsScore <= 100, 'Dashboard: finOpsScore 0-100', `Got ${body.finOpsScore}`);
}

// =========================================================================
// TEST 3: Recommendations API — GET /api/v1/recommendations
// =========================================================================
async function testRecommendations(): Promise<void> {
  // 3a: Unfiltered
  const { status, body } = await fetchJson('/api/v1/recommendations');
  assert(status === 200, 'Recommendations: status 200', `Got ${status}`);
  assert(Array.isArray(body), 'Recommendations: is array', `Got ${typeof body}`);
  assert(body.length > 0, 'Recommendations: has items', `Got ${body.length}`);

  // Validate Recommendation schema on first item
  const rec = body[0];
  assert(typeof rec.id === 'string', 'Recommendation[0]: id is string', `Got ${typeof rec.id}`);
  assert(typeof rec.resourceId === 'string', 'Recommendation[0]: resourceId is string', `Got ${typeof rec.resourceId}`);
  assert(typeof rec.resourceType === 'string', 'Recommendation[0]: resourceType is string', `Got ${typeof rec.resourceType}`);
  assert(typeof rec.title === 'string', 'Recommendation[0]: title is string', `Got ${typeof rec.title}`);
  assert(typeof rec.reason === 'string', 'Recommendation[0]: reason is string', `Got ${typeof rec.reason}`);
  assert(['LOW', 'MEDIUM', 'HIGH'].includes(rec.risk), 'Recommendation[0]: risk is valid enum', `Got ${rec.risk}`);
  assert(typeof rec.confidence === 'number', 'Recommendation[0]: confidence is number', `Got ${typeof rec.confidence}`);
  assert(typeof rec.monthlySavings === 'number', 'Recommendation[0]: monthlySavings is number', `Got ${typeof rec.monthlySavings}`);
  assert(typeof rec.annualSavings === 'number', 'Recommendation[0]: annualSavings is number', `Got ${typeof rec.annualSavings}`);
  assert(Array.isArray(rec.implementationSteps), 'Recommendation[0]: implementationSteps is array', `Got ${typeof rec.implementationSteps}`);

  // 3b: Filter by category=EC2
  const ec2 = await fetchJson('/api/v1/recommendations?category=EC2');
  assert(ec2.status === 200, 'Recommendations: EC2 filter status 200');
  assert(ec2.body.every((r: any) => r.resourceType === 'EC2'), 'Recommendations: EC2 filter correct',
    `Found types: ${[...new Set(ec2.body.map((r: any) => r.resourceType))]}`);

  // 3c: Filter by category=S3
  const s3 = await fetchJson('/api/v1/recommendations?category=S3');
  assert(s3.body.every((r: any) => r.resourceType === 'S3'), 'Recommendations: S3 filter correct');

  // 3d: Filter by risk=LOW
  const low = await fetchJson('/api/v1/recommendations?risk=LOW');
  assert(low.body.every((r: any) => r.risk === 'LOW'), 'Recommendations: risk=LOW filter correct',
    `Found risks: ${[...new Set(low.body.map((r: any) => r.risk))]}`);

  // 3e: Combined filter
  const combined = await fetchJson('/api/v1/recommendations?category=EC2&risk=LOW');
  assert(combined.body.every((r: any) => r.resourceType === 'EC2' && r.risk === 'LOW'),
    'Recommendations: combined filter EC2+LOW correct');

  // 3f: Filter by impact=HIGH
  const highImpact = await fetchJson('/api/v1/recommendations?impact=HIGH');
  assert(highImpact.body.every((r: any) => r.annualSavings > 10000),
    'Recommendations: impact=HIGH correct (annualSavings > $10k)',
    `Found: ${highImpact.body.map((r: any) => r.annualSavings)}`);

  // 3g: Counts consistency
  const total = body.length;
  const ec2Count = ec2.body.length;
  const s3Count = s3.body.length;
  const ebsRes = await fetchJson('/api/v1/recommendations?category=EBS');
  const rdsRes = await fetchJson('/api/v1/recommendations?category=RDS');
  const serviceSum = ec2Count + s3Count + ebsRes.body.length + rdsRes.body.length;
  assert(serviceSum === total, 'Recommendations: service filter sum equals total',
    `Sum=${serviceSum}, Total=${total}`);
}

// =========================================================================
// TEST 4: Resources API — GET /api/v1/resources
// =========================================================================
async function testResources(): Promise<void> {
  // 4a: Default (all resources)
  const { status, body } = await fetchJson('/api/v1/resources');
  assert(status === 200, 'Resources: status 200', `Got ${status}`);

  // Validate ResourceCollection schema
  assert(typeof body.total === 'number', 'Resources: total is number', `Got ${typeof body.total}`);
  assert(typeof body.page === 'number', 'Resources: page is number', `Got ${typeof body.page}`);
  assert(typeof body.pageSize === 'number', 'Resources: pageSize is number', `Got ${typeof body.pageSize}`);
  assert(Array.isArray(body.items), 'Resources: items is array', `Got ${typeof body.items}`);

  // Validate Resource schema on first item
  if (body.items.length > 0) {
    const res = body.items[0];
    assert(typeof res.id === 'string', 'Resource[0]: id is string', `Got ${typeof res.id}`);
    assert(typeof res.type === 'string', 'Resource[0]: type is string', `Got ${typeof res.type}`);
    assert(typeof res.utilization === 'number', 'Resource[0]: utilization is number', `Got ${typeof res.utilization}`);
    assert(typeof res.monthlyCost === 'number', 'Resource[0]: monthlyCost is number', `Got ${typeof res.monthlyCost}`);
    assert(typeof res.status === 'string', 'Resource[0]: status is string', `Got ${typeof res.status}`);
  }

  // 4b: Filter by type=EC2
  const ec2 = await fetchJson('/api/v1/resources?type=EC2');
  assert(ec2.body.items.every((r: any) => r.type === 'EC2'), 'Resources: EC2 type filter correct');
  assert(ec2.body.total === ec2.body.items.length || ec2.body.items.length <= ec2.body.pageSize,
    'Resources: EC2 total consistent');

  // 4c: Pagination
  const page1 = await fetchJson('/api/v1/resources?pageSize=3&page=1');
  assert(page1.body.items.length <= 3, 'Resources: pageSize=3 respected', `Got ${page1.body.items.length}`);
  assert(page1.body.page === 1, 'Resources: page=1 returned', `Got ${page1.body.page}`);
  assert(page1.body.pageSize === 3, 'Resources: pageSize=3 returned', `Got ${page1.body.pageSize}`);

  const page2 = await fetchJson('/api/v1/resources?pageSize=3&page=2');
  assert(page2.body.page === 2, 'Resources: page=2 returned', `Got ${page2.body.page}`);

  // Ensure different items on different pages
  if (page1.body.items.length > 0 && page2.body.items.length > 0) {
    assert(page1.body.items[0].id !== page2.body.items[0].id,
      'Resources: page1 and page2 have different items');
  }

  // 4d: Total resource count matches expectations (15 EC2 + 10 S3 + 10 EBS + 8 RDS = 43)
  assert(body.total === 43, 'Resources: total=43 (15+10+10+8)', `Got ${body.total}`);
}

// =========================================================================
// TEST 5: Forecast API — GET /api/v1/forecast
// =========================================================================
async function testForecast(): Promise<void> {
  const { status, body } = await fetchJson('/api/v1/forecast');
  assert(status === 200, 'Forecast: status 200', `Got ${status}`);

  // Validate ForecastResponse schema
  assert(body.model === 'Prophet', 'Forecast: model is Prophet', `Got ${body.model}`);
  assert(typeof body.nextMonth === 'number', 'Forecast: nextMonth is number', `Got ${typeof body.nextMonth}`);
  assert(Array.isArray(body.threeMonthForecast), 'Forecast: threeMonthForecast is array');
  assert(body.threeMonthForecast.length === 3, 'Forecast: threeMonthForecast has 3 items', `Got ${body.threeMonthForecast.length}`);
  assert(typeof body.growthRate === 'number', 'Forecast: growthRate is number', `Got ${typeof body.growthRate}`);
  assert(typeof body.confidenceInterval === 'object', 'Forecast: confidenceInterval is object');
  assert(typeof body.confidenceInterval.lower === 'number', 'Forecast: confidenceInterval.lower is number');
  assert(typeof body.confidenceInterval.upper === 'number', 'Forecast: confidenceInterval.upper is number');
  assert(body.confidenceInterval.lower <= body.confidenceInterval.upper,
    'Forecast: lower <= upper', `${body.confidenceInterval.lower} vs ${body.confidenceInterval.upper}`);
  assert(typeof body.seasonalityDetected === 'boolean', 'Forecast: seasonalityDetected is boolean');
  assert(typeof body.executiveSummary === 'string', 'Forecast: executiveSummary is string');
  assert(body.executiveSummary.length > 50, 'Forecast: executiveSummary is substantial', `Length: ${body.executiveSummary.length}`);
}

// =========================================================================
// TEST 6: Score API — GET /api/v1/score
// =========================================================================
async function testScore(): Promise<void> {
  const { status, body } = await fetchJson('/api/v1/score');
  assert(status === 200, 'Score: status 200', `Got ${status}`);

  // Validate ScoreResponse schema
  assert(typeof body.score === 'number', 'Score: score is number', `Got ${typeof body.score}`);
  assert(body.score >= 0 && body.score <= 100, 'Score: score is 0-100', `Got ${body.score}`);
  assert(typeof body.category === 'string', 'Score: category is string', `Got ${body.category}`);
  assert(['Excellent', 'Healthy', 'Needs Optimization', 'Critical'].includes(body.category),
    'Score: category is valid', `Got ${body.category}`);

  // Breakdown
  assert(typeof body.breakdown === 'object', 'Score: breakdown is object');
  assert(typeof body.breakdown.compute === 'number', 'Score: breakdown.compute is number');
  assert(typeof body.breakdown.storage === 'number', 'Score: breakdown.storage is number');
  assert(typeof body.breakdown.reservedCapacity === 'number', 'Score: breakdown.reservedCapacity is number');

  // Recommendations
  assert(Array.isArray(body.recommendations), 'Score: recommendations is array');
  assert(body.recommendations.length > 0, 'Score: has improvement recommendations');
  assert(body.recommendations.every((r: any) => typeof r === 'string'),
    'Score: recommendations are strings');
}

// =========================================================================
// TEST 7: Report API — GET /api/v1/report
// =========================================================================
async function testReport(): Promise<void> {
  const { status, contentType, size } = await fetchRaw('/api/v1/report');
  assert(status === 200, 'Report: status 200', `Got ${status}`);
  assert(contentType.includes('application/pdf'), 'Report: Content-Type is PDF', `Got ${contentType}`);
  assert(size > 1000, 'Report: PDF has substantial content', `Size: ${size} bytes`);
}

// =========================================================================
// TEST 8: Swagger UI — GET /api-docs
// =========================================================================
async function testSwagger(): Promise<void> {
  const res = await fetch(`${BASE}/api-docs/`);
  assert(res.status === 200 || res.status === 301 || res.status === 304,
    'Swagger: /api-docs accessible', `Got ${res.status}`);

  const html = await res.text();
  assert(html.includes('swagger') || html.includes('Swagger'),
    'Swagger: HTML contains swagger reference', `Length: ${html.length}`);
}

// =========================================================================
// TEST 9: Error Handling — invalid endpoints and params
// =========================================================================
async function testErrors(): Promise<void> {
  // 9a: Invalid endpoint
  const notFound = await fetch(`${BASE}/api/v1/nonexistent`);
  assert(notFound.status === 404, 'Error: 404 for unknown endpoint', `Got ${notFound.status}`);

  // 9b: Invalid query param value for recommendations
  const badCategory = await fetchJson('/api/v1/recommendations?category=INVALID');
  assert(badCategory.status === 400, 'Error: 400 for invalid category', `Got ${badCategory.status}`);
  assert(badCategory.body.error !== undefined, 'Error: has error object in response');

  // 9c: Invalid risk param
  const badRisk = await fetchJson('/api/v1/recommendations?risk=EXTREME');
  assert(badRisk.status === 400, 'Error: 400 for invalid risk', `Got ${badRisk.status}`);
}

// =========================================================================
// TEST 10: Cross-endpoint data consistency
// =========================================================================
async function testConsistency(): Promise<void> {
  const dashboard = (await fetchJson('/api/v1/dashboard')).body;
  const score = (await fetchJson('/api/v1/score')).body;
  const forecast = (await fetchJson('/api/v1/forecast')).body;
  const recs = (await fetchJson('/api/v1/recommendations')).body;

  // Dashboard finOpsScore should match score endpoint
  assert(dashboard.finOpsScore === score.score,
    'Consistency: dashboard.finOpsScore === score.score',
    `${dashboard.finOpsScore} vs ${score.score}`);

  // Dashboard forecastedSpend should match forecast.nextMonth
  assert(dashboard.forecastedSpend === forecast.nextMonth,
    'Consistency: dashboard.forecastedSpend === forecast.nextMonth',
    `${dashboard.forecastedSpend} vs ${forecast.nextMonth}`);

  // Dashboard potentialSavings should be sum of recommendation monthlySavings
  const recSum = recs.reduce((s: number, r: any) => s + r.monthlySavings, 0);
  assert(Math.abs(dashboard.potentialSavings - recSum) < 0.1,
    'Consistency: dashboard.potentialSavings matches sum of rec.monthlySavings',
    `Dashboard: ${dashboard.potentialSavings}, Sum: ${recSum.toFixed(2)}`);
}

// =========================================================================
// Runner
// =========================================================================
async function runTests(): Promise<void> {
  console.log('='.repeat(70));
  console.log('CloudSight AI - Phase 2 API Contract Tests');
  console.log('='.repeat(70));
  console.log('');

  const suites: [string, () => Promise<void>][] = [
    ['Health Check', testHealth],
    ['Dashboard API', testDashboard],
    ['Recommendations API', testRecommendations],
    ['Resources API', testResources],
    ['Forecast API', testForecast],
    ['Score API', testScore],
    ['Report API', testReport],
    ['Swagger UI', testSwagger],
    ['Error Handling', testErrors],
    ['Cross-Endpoint Consistency', testConsistency],
  ];

  for (const [name, fn] of suites) {
    console.log(`--- ${name} ---`);
    try {
      await fn();
    } catch (err: any) {
      results.push({ name: `${name}: SUITE ERROR`, passed: false, details: err.message });
    }
  }

  // Print results
  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    const detail = r.passed ? '' : ` -- ${r.details}`;
    console.log(`  [${icon}] ${r.name}${detail}`);
  }

  console.log('');
  console.log('-'.repeat(70));
  console.log(`  Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length}`);
  console.log('-'.repeat(70));

  if (failed.length > 0) {
    console.log('');
    console.log('FAILED TESTS:');
    for (const f of failed) {
      console.log(`  [FAIL] ${f.name}: ${f.details}`);
    }
    process.exit(1);
  } else {
    console.log('  ALL TESTS PASSED');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
