# EC2 Enterprise FinOps Dataset & Rules

## Dataset Schema (`ec2_dataset.csv`)

``` csv
instance_id,instance_name,instance_type,environment,owner_tag,cost_center,region,availability_zone,cpu_utilization,memory_utilization,network_in_gb,network_out_gb,running_days,monthly_cost,ebs_volume_type,ebs_size_gb,reserved_instance,savings_plan,spot_eligible,auto_shutdown_enabled,last_login_days
```

## Sample Data

``` csv
i-001,web-prod,m5.large,prod,team-a,CC101,us-east-1,us-east-1a,12,25,120,90,180,320,gp2,100,false,false,false,false,1
i-002,batch-worker,c5.xlarge,prod,team-b,CC102,us-east-1,us-east-1b,45,55,250,210,120,480,gp3,200,false,false,true,false,2
i-003,dev-server,t3.medium,dev,team-c,CC103,ap-south-1,ap-south-1a,3,8,5,4,40,90,gp2,50,false,false,true,false,30
```

## EC2_RULES

``` python
EC2_RULES = [
    {"id":"EC2_IDLE","severity":"CRITICAL","category":"Waste Elimination","condition":"cpu_utilization < 5 and running_days > 14","recommendation":"Terminate idle instances","estimated_savings":"90-100%"},
    {"id":"EC2_RIGHTSIZE","severity":"HIGH","category":"Rightsizing","condition":"cpu_utilization < 20 and memory_utilization < 30","recommendation":"Move to smaller instance type","estimated_savings":"30-60%"},
    {"id":"EC2_OVERUTILIZED","severity":"HIGH","category":"Performance","condition":"cpu_utilization > 85","recommendation":"Upgrade instance family","estimated_savings":"Avoid outages"},
    {"id":"EC2_RESERVED_INSTANCE","severity":"MEDIUM","category":"Commitment","condition":"running_days > 90 and reserved_instance == false","recommendation":"Purchase Reserved Instances","estimated_savings":"40-72%"},
    {"id":"EC2_SAVINGS_PLAN","severity":"MEDIUM","category":"Commitment","condition":"monthly_cost > 500 and savings_plan == false","recommendation":"Adopt Compute Savings Plans","estimated_savings":"30-66%"},
    {"id":"EC2_SPOT","severity":"LOW","category":"Spot Optimization","condition":"spot_eligible == true","recommendation":"Use Spot Instances","estimated_savings":"70-90%"},
    {"id":"EC2_DEV_SHUTDOWN","severity":"HIGH","category":"Scheduling","condition":"environment == 'dev' and auto_shutdown_enabled == false","recommendation":"Enable nightly shutdown","estimated_savings":"60%"},
    {"id":"EC2_GP2_TO_GP3","severity":"MEDIUM","category":"Storage","condition":"ebs_volume_type == 'gp2'","recommendation":"Migrate to gp3 volumes","estimated_savings":"20%"},
    {"id":"EC2_UNUSED_EBS","severity":"HIGH","category":"Storage","condition":"ebs_size_gb > 500 and cpu_utilization < 10","recommendation":"Review attached storage","estimated_savings":"25%"},
    {"id":"EC2_NETWORK_IDLE","severity":"MEDIUM","category":"Waste Elimination","condition":"network_in_gb < 1 and network_out_gb < 1","recommendation":"Investigate idle workloads","estimated_savings":"50%"},
    {"id":"EC2_MISSING_OWNER","severity":"CRITICAL","category":"Governance","condition":"owner_tag == ''","recommendation":"Add owner tag","estimated_savings":"Governance"},
    {"id":"EC2_MISSING_COST_CENTER","severity":"CRITICAL","category":"Governance","condition":"cost_center == ''","recommendation":"Assign cost center","estimated_savings":"Financial Visibility"},
    {"id":"EC2_COST_ANOMALY","severity":"CRITICAL","category":"Anomaly Detection","condition":"monthly_cost > historical_average * 1.5","recommendation":"Investigate cost spike","estimated_savings":"Potentially thousands of dollars"},
    {"id":"EC2_OLD_INSTANCE","severity":"MEDIUM","category":"Modernization","condition":"instance_type.startswith('m4')","recommendation":"Upgrade to newer generations","estimated_savings":"15-25%"},
    {"id":"EC2_SINGLE_AZ_PROD","severity":"HIGH","category":"Reliability","condition":"environment == 'prod'","recommendation":"Review Multi-AZ strategy","estimated_savings":"Reliability Improvement"},
    {"id":"EC2_CARBON","severity":"LOW","category":"Sustainability","condition":"cpu_utilization < 20","recommendation":"Rightsize to reduce carbon footprint","estimated_savings":"30%"},
    {"id":"EC2_SECURITY_UNUSED","severity":"HIGH","category":"Security","condition":"last_login_days > 90","recommendation":"Review dormant instances","estimated_savings":"Risk Reduction"},
    {"id":"EC2_REGION_OPT","severity":"LOW","category":"Regional Optimization","condition":"region == 'us-east-1'","recommendation":"Evaluate lower-cost regions","estimated_savings":"10-20%"},
    {"id":"EC2_BATCH_SCHEDULING","severity":"MEDIUM","category":"Scheduling","condition":"instance_name.contains('batch')","recommendation":"Run workloads on schedule","estimated_savings":"40%"},
    {"id":"EC2_BUDGET_ALERT","severity":"MEDIUM","category":"Governance","condition":"monthly_cost > 1000","recommendation":"Configure budget alarms","estimated_savings":"Overspend Prevention"}
]
```

## Recommended Extra Columns

``` csv
ami_age_days,patch_level,backup_enabled,cloudwatch_agent_installed,security_group_count,public_ip_attached,carbon_score
```

These fields enable advanced FinOps, governance, sustainability, and
security recommendations.
