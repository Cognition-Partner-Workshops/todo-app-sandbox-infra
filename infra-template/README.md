# Infrastructure Sandbox Template

This CloudFormation template creates ephemeral sandbox environments for the todo application with automatic self-destruction capabilities.

## Features

- **EC2 App Server**: Launched from a pre-configured AMI with the todo app
- **RDS PostgreSQL**: Restored from a snapshot with seeded data
- **Auto-Termination**: 
  - Scheduled termination via EventBridge (configurable hours)
  - Idle detection: terminates if no network activity for 1 hour

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| SandboxName | (required) | Unique identifier for the sandbox |
| ExpirationHours | 24 | Hours until auto-termination (1-168) |
| InstanceType | t3.micro | EC2 instance size |
| DBInstanceClass | db.t3.micro | RDS instance size |
| VpcId | vpc-07bda6071f14059c1 | Target VPC |
| SubnetId | subnet-0995d81977be00011 | EC2 subnet |
| SubnetIds | (2 subnets) | RDS subnet group |
| AMIId | ami-073fce3e092c219a2 | Todo app AMI |
| DBSnapshotIdentifier | sandbox-todo-snapshot-20260129-234617 | RDS snapshot |

## Usage

### Deploy a sandbox

```bash
aws cloudformation create-stack \
  --stack-name sandbox-test-001 \
  --template-body file://sandbox-template.yaml \
  --parameters ParameterKey=SandboxName,ParameterValue=test-001 \
               ParameterKey=ExpirationHours,ParameterValue=8 \
  --capabilities CAPABILITY_NAMED_IAM
```

### Check deployment status

```bash
aws cloudformation describe-stacks --stack-name sandbox-test-001
```

### Get outputs (app URL, etc.)

```bash
aws cloudformation describe-stacks \
  --stack-name sandbox-test-001 \
  --query 'Stacks[0].Outputs'
```

### Manual termination

```bash
aws cloudformation delete-stack --stack-name sandbox-test-001
```

## Self-Destruct Mechanisms

1. **Scheduled Termination**: EventBridge triggers a Lambda function after the specified `ExpirationHours`

2. **Idle Detection**: A background service on the EC2 instance monitors network traffic. If no significant traffic (>10KB) is detected for 1 hour, it triggers stack deletion.

## API Integration

The dispatch agent can use these AWS CLI commands or SDK calls:

- **Create sandbox**: `cloudformation:CreateStack`
- **Check status**: `cloudformation:DescribeStacks`
- **Get outputs**: `cloudformation:DescribeStacks` (Outputs field)
- **Delete sandbox**: `cloudformation:DeleteStack`
