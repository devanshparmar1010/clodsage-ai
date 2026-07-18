# Demo Data — CloudSight AI

Two realistic AWS infrastructure datasets for demonstrating CloudSight AI's optimization capabilities.

---

## Dataset A: "Before Optimization" (`demo-data/before/`)

**Scenario**: A mid-size SaaS company with uncontrolled cloud growth. Classic FinOps waste patterns.

| File | Records | Key Waste Patterns |
|------|---------|-------------------|
| `ec2.csv` | 20 instances | Oversized m5.2xlarge at 12% CPU, idle GPU instances ($2,200/mo each), dev servers running 24/7, unused demo server |
| `s3.csv` | 15 buckets | 12TB of logs in STANDARD ($283/mo), 15TB backups never tiered, old marketing site untouched for 365 days |
| `ebs.csv` | 18 volumes | 4 orphaned unattached volumes, 2TB volumes at 4% utilization, one at 0.4% |
| `rds.csv` | 10 databases | Prototype DB with 0 connections ($730/mo), oversized replicas, dev DB on r5.xlarge with 3 connections |
| `monthly_cost.csv` | 12 months | Steady climb from $18,420 to $23,890 (29.7% annual growth) |

**Expected Results**:
- Monthly spend: ~$23,890
- FinOps Score: ~30-45/100 (Critical)
- Recommendations: 20+ optimization opportunities
- Potential savings: ~$8,000-12,000/month

---

## Dataset B: "After Optimization" (`demo-data/after/`)

**Scenario**: Same company, 2 months later, after implementing CloudSight AI recommendations.

| File | Records | Optimizations Applied |
|------|---------|----------------------|
| `ec2.csv` | 14 instances | Right-sized to xlarge/2xlarge, eliminated 6 idle instances, GPU switched to g4dn with spot hours, dev on t3.medium business-hours only |
| `s3.csv` | 11 buckets | Logs to GLACIER ($283 to $12), backups to DEEP_ARCHIVE ($359 to $6), deleted 4 unused buckets, purged video cache |
| `ebs.csv` | 9 volumes | Deleted 4 orphaned volumes, right-sized all (500 to 200, 2000 to 500), eliminated volumes for terminated instances |
| `rds.csv` | 7 databases | Terminated $730 prototype, eliminated underused replica, right-sized primary, staging/dev to t3.medium |
| `monthly_cost.csv` | 12 months | Same history but May/June drop from $22,680 to $15,800 (30% reduction) |

**Expected Results**:
- Monthly spend: ~$15,800
- FinOps Score: ~75-90/100 (Healthy/Excellent)
- Recommendations: 3-5 remaining (minor tweaks)
- Prophet forecast: Downward trend (cost reduction confirmed)

---

## How to Use

### Demo Flow: "Before then After"

**Act 1 — The Problem** (Upload `before/` dataset):
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`
4. Upload all 5 CSVs from `demo-data/before/`
5. Walk through Dashboard, Recommendations, Resources, Forecast, Reports
6. Key talking points: "Look at this FinOps Score. Look at these idle GPU instances. $23K/month and climbing."

**Act 2 — The Solution** (Upload `after/` dataset):
1. Return to the landing page
2. Upload all 5 CSVs from `demo-data/after/`
3. Walk through the same flow
4. Key talking points: "After acting on CloudSight AI's recommendations — spend dropped 34%, score went from Critical to Healthy, Prophet now forecasts a downward trend."

---

## Metrics Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| EC2 Instances | 20 | 14 | -30% |
| S3 Buckets | 15 | 11 | -27% |
| EBS Volumes | 18 | 9 | -50% |
| RDS Databases | 10 | 7 | -30% |
| Monthly Spend | ~$23,890 | ~$15,800 | **-34%** |
| Annual Projection | ~$286K | ~$190K | **-$96K/yr** |
| Avg EC2 CPU Utilization | ~7% | ~42% | +6x |
| Avg EBS Utilization | ~11% | ~54% | +5x |
| Orphaned Volumes | 4 | 0 | -100% |
| Zero-Connection DBs | 1 | 0 | -100% |
