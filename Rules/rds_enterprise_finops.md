# RDS Enterprise FinOps Dataset & Rules

## Dataset Schema (`rds_dataset.csv`)

``` csv
db_identifier,engine,instance_type,environment,owner_tag,cost_center,region,cpu_utilization,memory_utilization,storage_utilization,multi_az,read_replicas,backup_retention_days,running_days,monthly_cost,reserved_instance,performance_insights_enabled
```

## Sample Data

``` csv
prod-mysql,mysql,db.m5.large,prod,team-a,CC101,us-east-1,22,45,60,true,2,30,400,950,false,true
dev-postgres,postgres,db.t3.medium,dev,team-b,CC102,ap-south-1,4,20,25,true,0,7,90,180,false,false
analytics-db,postgres,db.r6g.xlarge,prod,team-c,CC103,us-east-1,88,90,80,true,3,35,700,1800,true,true
```

## RDS_RULES

``` python
RDS_RULES = [
    {
        "id":"RDS_IDLE",
        "severity":"HIGH",
        "category":"Rightsizing",
        "condition":"cpu_utilization < 10 and memory_utilization < 30",
        "recommendation":"Downsize database instance",
        "estimated_savings":"30-50%"
    },
    {
        "id":"RDS_OVERUTILIZED",
        "severity":"CRITICAL",
        "category":"Performance",
        "condition":"cpu_utilization > 85",
        "recommendation":"Upgrade instance class",
        "estimated_savings":"Avoid outages"
    },
    {
        "id":"RDS_RESERVED",
        "severity":"MEDIUM",
        "category":"Commitment Management",
        "condition":"running_days > 180 and reserved_instance == false",
        "recommendation":"Purchase Reserved DB Instances",
        "estimated_savings":"40-60%"
    },
    {
        "id":"RDS_DEV_MULTI_AZ",
        "severity":"HIGH",
        "category":"Availability Optimization",
        "condition":"environment == 'dev' and multi_az == true",
        "recommendation":"Disable Multi-AZ for development databases",
        "estimated_savings":"50%"
    },
    {
        "id":"RDS_UNUSED_REPLICA",
        "severity":"MEDIUM",
        "category":"Waste Elimination",
        "condition":"read_replicas > 0 and cpu_utilization < 20",
        "recommendation":"Review and remove unused read replicas",
        "estimated_savings":"20-40%"
    },
    {
        "id":"RDS_BACKUP_RETENTION",
        "severity":"LOW",
        "category":"Storage Optimization",
        "condition":"backup_retention_days > 90",
        "recommendation":"Reduce excessive backup retention",
        "estimated_savings":"10-20%"
    },
    {
        "id":"RDS_STORAGE_UNUSED",
        "severity":"MEDIUM",
        "category":"Storage Optimization",
        "condition":"storage_utilization < 30",
        "recommendation":"Reduce allocated storage",
        "estimated_savings":"15-25%"
    },
    {
        "id":"RDS_NO_PERF_INSIGHTS",
        "severity":"LOW",
        "category":"Observability",
        "condition":"performance_insights_enabled == false and environment == 'prod'",
        "recommendation":"Enable Performance Insights",
        "estimated_savings":"Operational Visibility"
    },
    {
        "id":"RDS_COST_ANOMALY",
        "severity":"CRITICAL",
        "category":"Anomaly Detection",
        "condition":"monthly_cost > historical_average * 1.5",
        "recommendation":"Investigate abnormal database spending",
        "estimated_savings":"Potentially thousands of dollars"
    },
    {
        "id":"RDS_MISSING_OWNER",
        "severity":"HIGH",
        "category":"Governance",
        "condition":"owner_tag == ''",
        "recommendation":"Add owner and cost center tags",
        "estimated_savings":"Governance Improvement"
    }
]
```

## Recommended Extra Columns

``` csv
iops_allocated,connection_count,max_connections,engine_version,storage_type,encryption_enabled,deletion_protection
```
