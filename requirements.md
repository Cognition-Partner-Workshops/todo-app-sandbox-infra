# Sandbox Infrastructure Requirements

## Overview
Infrastructure as Code template for ephemeral sandbox environments that teams can use for experimentation.

## Components

### Base Infrastructure
- VPC with public and private subnets
- Security Groups for EC2 and RDS
- EC2 instance (t3.micro) running a simple todo list application
- RDS PostgreSQL database (db.t3.micro) with seeded data

### Artifacts
- AMI ID: ami-073fce3e092c219a2
- RDS Snapshot ID: sandbox-todo-snapshot-20260129-234617

### CloudFormation Template Features
- Dynamic parameters for:
  - AMI ID
  - RDS Snapshot ID
  - Expiration time in minutes (default: 480 = 8 hours)
  - Instance types
  - Environment name
- Self-destruct/expiration features:
  1. EventBridge scheduled trigger after specified minutes to delete CloudFormation stack
  2. Hourly Lambda check for network inactivity - if no network requests to EC2 for 1 hour, triggers stack deletion

## Self-Destruct Features

### Scheduled Termination
- EventBridge rule triggers after user-specified minutes (ExpirationTimeMinutes parameter)
- Lambda function deletes the CloudFormation stack

### Idle Detection
- Lambda function runs hourly via EventBridge
- Checks CloudWatch metrics for EC2 network activity (NetworkPacketsIn)
- If no network activity for 1 hour, triggers stack deletion
- Prevents wasted resources on abandoned sandboxes

## Application
- Simple Node.js todo list application
- REST API endpoints for CRUD operations
- PostgreSQL database backend

## Usage

### Deploy a new sandbox:
```bash
./scripts/deploy-sandbox.sh \
  --environment-name my-sandbox \
  --key-pair-name my-key \
  --db-password MySecurePass123!
```

### Delete a sandbox:
```bash
./scripts/cleanup-sandbox.sh --stack-name my-sandbox-sandbox-stack
```
