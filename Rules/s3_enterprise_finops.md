# S3 Enterprise FinOps Dataset & Rules

## Dataset Schema (`s3_dataset.csv`)

``` csv
bucket_name,environment,owner_tag,cost_center,region,storage_class,total_storage_gb,object_count,last_access_days,lifecycle_enabled,versioning_enabled,intelligent_tiering_enabled,replication_enabled,monthly_cost,public_access_enabled
```

## Sample Data

``` csv
prod-images,prod,team-a,CC101,us-east-1,STANDARD,2500,150000,10,true,true,false,false,65,false
backup-archive,prod,team-b,CC102,us-east-1,STANDARD,12000,500000,250,true,false,false,false,350,false
logs-bucket,dev,team-c,CC103,ap-south-1,STANDARD,800,80000,120,false,true,false,false,25,false
```

## S3_RULES

``` python
S3_RULES = [
    {"id":"S3_GLACIER","severity":"HIGH","category":"Storage Optimization","condition":"last_access_days > 90","recommendation":"Move data to Glacier","estimated_savings":"80%"},
    {"id":"S3_DEEP_ARCHIVE","severity":"CRITICAL","category":"Archival","condition":"last_access_days > 365","recommendation":"Move data to Deep Archive","estimated_savings":"95%"},
    {"id":"S3_LIFECYCLE","severity":"HIGH","category":"Governance","condition":"lifecycle_enabled == false","recommendation":"Enable lifecycle policies","estimated_savings":"20-50%"},
    {"id":"S3_INTELLIGENT","severity":"MEDIUM","category":"Automation","condition":"intelligent_tiering_enabled == false","recommendation":"Enable Intelligent Tiering","estimated_savings":"15-40%"},
    {"id":"S3_EMPTY_BUCKET","severity":"HIGH","category":"Waste Elimination","condition":"object_count == 0","recommendation":"Delete unused buckets","estimated_savings":"100%"},
    {"id":"S3_PUBLIC_ACCESS","severity":"CRITICAL","category":"Security","condition":"public_access_enabled == true","recommendation":"Review public bucket access","estimated_savings":"Risk Reduction"},
    {"id":"S3_NO_VERSIONING","severity":"MEDIUM","category":"Reliability","condition":"versioning_enabled == false and environment == 'prod'","recommendation":"Enable versioning","estimated_savings":"Data Protection"},
    {"id":"S3_REPLICATION","severity":"LOW","category":"Cost Optimization","condition":"replication_enabled == true and environment == 'dev'","recommendation":"Disable unnecessary replication","estimated_savings":"30%"},
    {"id":"S3_COST_ANOMALY","severity":"CRITICAL","category":"Anomaly Detection","condition":"monthly_cost > historical_average * 1.5","recommendation":"Investigate storage cost spike","estimated_savings":"Potentially thousands"},
    {"id":"S3_MISSING_OWNER","severity":"HIGH","category":"Governance","condition":"owner_tag == ''","recommendation":"Add owner tag","estimated_savings":"Governance"}
]
```
