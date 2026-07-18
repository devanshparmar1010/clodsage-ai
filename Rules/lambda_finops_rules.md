# AWS Lambda FinOps Dataset and Rules

## Lambda Dataset (`lambda_dataset.csv`)

```csv
function_name,environment,runtime,memory_allocated_mb,memory_used_mb,avg_duration_ms,timeout_ms,monthly_invocations,error_rate_percent,cold_start_ms,provisioned_concurrency,reserved_concurrency,last_invocation_days,monthly_cost,vpc_enabled,log_retention_days,owner_tag,cost_center
image-resizer,prod,python3.12,1024,320,450,3000,500000,0.2,120,true,100,1,85,true,90,team-a,CC101
notification-service,prod,nodejs20.x,512,180,80,1000,120000,0.1,80,false,50,2,20,false,30,team-b,CC102
report-generator,dev,python3.10,2048,200,2500,5000,300,1.5,500,false,10,20,35,true,365,team-c,CC103
legacy-cleanup,test,python3.8,512,50,120,3000,0,0,0,false,0,180,5,false,0,,CC104
analytics-processor,prod,java17,4096,3900,8000,10000,1000000,2.5,1500,true,200,1,450,true,365,team-d,CC105
```

## Enterprise Lambda FinOps Rules

```python
LAMBDA_RULES = [
    {
        "id": "LAMBDA_UNUSED",
        "name": "Unused Lambda Function",
        "severity": "CRITICAL",
        "condition": "monthly_invocations == 0",
        "recommendation": "Delete unused Lambda functions",
        "estimated_savings": "100%",
        "category": "Waste Elimination"
    },
    {
        "id": "LAMBDA_INACTIVE",
        "name": "Inactive Function",
        "severity": "HIGH",
        "condition": "last_invocation_days > 90",
        "recommendation": "Archive or remove inactive functions",
        "estimated_savings": "80-100%",
        "category": "Resource Cleanup"
    },
    {
        "id": "LAMBDA_MEMORY_RIGHTSIZE",
        "name": "Memory Rightsizing",
        "severity": "HIGH",
        "condition": "memory_used_mb < memory_allocated_mb * 0.5",
        "recommendation": "Reduce allocated memory",
        "estimated_savings": "20-40%",
        "category": "Rightsizing"
    },
    {
        "id": "LAMBDA_MEMORY_INCREASE",
        "name": "Under-provisioned Memory",
        "severity": "HIGH",
        "condition": "memory_used_mb > memory_allocated_mb * 0.9",
        "recommendation": "Increase memory allocation",
        "estimated_savings": "Performance Improvement",
        "category": "Performance"
    },
    {
        "id": "LAMBDA_TIMEOUT_RISK",
        "name": "Timeout Risk",
        "severity": "CRITICAL",
        "condition": "avg_duration_ms > timeout_ms * 0.8",
        "recommendation": "Increase timeout or optimize code",
        "estimated_savings": "Avoid service failures",
        "category": "Reliability"
    },
    {
        "id": "LAMBDA_PROVISIONED_CONCURRENCY",
        "name": "Unused Provisioned Concurrency",
        "severity": "MEDIUM",
        "condition": "provisioned_concurrency == true and monthly_invocations < 1000",
        "recommendation": "Disable Provisioned Concurrency",
        "estimated_savings": "30-50%",
        "category": "Cost Optimization"
    },
    {
        "id": "LAMBDA_RESERVED_CONCURRENCY",
        "name": "Excess Reserved Concurrency",
        "severity": "MEDIUM",
        "condition": "reserved_concurrency > monthly_invocations / 1000",
        "recommendation": "Reduce reserved concurrency limits",
        "estimated_savings": "10-20%",
        "category": "Capacity Planning"
    },
    {
        "id": "LAMBDA_HIGH_ERROR_RATE",
        "name": "Error Rate Detection",
        "severity": "CRITICAL",
        "condition": "error_rate_percent > 2",
        "recommendation": "Investigate failing invocations immediately",
        "estimated_savings": "Prevent business impact",
        "category": "Reliability"
    },
    {
        "id": "LAMBDA_COLD_START",
        "name": "High Cold Start Latency",
        "severity": "MEDIUM",
        "condition": "cold_start_ms > 1000",
        "recommendation": "Use provisioned concurrency or optimize package size",
        "estimated_savings": "User Experience Improvement",
        "category": "Performance"
    },
    {
        "id": "LAMBDA_LOG_RETENTION",
        "name": "CloudWatch Log Retention",
        "severity": "HIGH",
        "condition": "log_retention_days == 0",
        "recommendation": "Set log retention to 30 or 90 days",
        "estimated_savings": "20-60%",
        "category": "Storage Optimization"
    },
    {
        "id": "LAMBDA_VPC_CHECK",
        "name": "Unnecessary VPC Attachment",
        "severity": "LOW",
        "condition": "vpc_enabled == true and environment == 'dev'",
        "recommendation": "Remove VPC attachment if not required",
        "estimated_savings": "Latency and operational improvement",
        "category": "Architecture"
    },
    {
        "id": "LAMBDA_RUNTIME_EOL",
        "name": "Deprecated Runtime",
        "severity": "CRITICAL",
        "condition": "runtime in ['python3.8','nodejs14.x']",
        "recommendation": "Upgrade to supported runtime versions",
        "estimated_savings": "Security & compliance",
        "category": "Governance"
    },
    {
        "id": "LAMBDA_MISSING_OWNER",
        "name": "Missing Owner Tag",
        "severity": "HIGH",
        "condition": "owner_tag == ''",
        "recommendation": "Add owner tag for accountability",
        "estimated_savings": "Governance",
        "category": "Tagging"
    },
    {
        "id": "LAMBDA_MISSING_COST_CENTER",
        "name": "Missing Cost Center",
        "severity": "HIGH",
        "condition": "cost_center == ''",
        "recommendation": "Assign cost center tag",
        "estimated_savings": "Financial Visibility",
        "category": "Governance"
    },
    {
        "id": "LAMBDA_COST_ANOMALY",
        "name": "Lambda Cost Spike",
        "severity": "CRITICAL",
        "condition": "monthly_cost > historical_average_cost * 1.5",
        "recommendation": "Investigate unusual cost increase",
        "estimated_savings": "Potentially thousands of dollars",
        "category": "Anomaly Detection"
    }
]
```

## Additional Fields for Future Enhancements

```csv
avg_payload_size_mb
deployment_package_size_mb
xray_enabled
dead_letter_queue_enabled
retry_attempts
api_gateway_trigger
sqs_trigger
eventbridge_trigger
step_function_trigger
concurrent_executions_peak
throttles_per_month
```
