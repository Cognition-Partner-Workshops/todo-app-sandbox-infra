#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy an ephemeral sandbox environment for the Todo application."
    echo ""
    echo "Required Options:"
    echo "  --environment-name NAME    Name for the sandbox environment"
    echo "  --key-pair-name NAME       Name of existing EC2 key pair"
    echo "  --db-password PASSWORD     Database password (min 8 characters)"
    echo ""
    echo "Optional Options:"
    echo "  --ami-id ID                AMI ID (default: ami-073fce3e092c219a2)"
    echo "  --snapshot-id ID           RDS snapshot ID (default: sandbox-todo-snapshot-20260129-234617)"
    echo "  --instance-type TYPE       EC2 instance type (default: t3.micro)"
    echo "  --db-instance-class CLASS  RDS instance class (default: db.t3.micro)"
    echo "  --expiration-minutes MIN   Minutes until auto-termination (default: 480)"
    echo "  --region REGION            AWS region (default: us-east-1)"
    echo "  --help                     Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --environment-name my-sandbox --key-pair-name my-key --db-password MyPass123!"
    exit 1
}

AMI_ID="ami-073fce3e092c219a2"
SNAPSHOT_ID="sandbox-todo-snapshot-20260129-234617"
INSTANCE_TYPE="t3.micro"
DB_INSTANCE_CLASS="db.t3.micro"
EXPIRATION_MINUTES="480"
REGION="us-east-1"
ENVIRONMENT_NAME=""
KEY_PAIR_NAME=""
DB_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment-name)
            ENVIRONMENT_NAME="$2"
            shift 2
            ;;
        --key-pair-name)
            KEY_PAIR_NAME="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --ami-id)
            AMI_ID="$2"
            shift 2
            ;;
        --snapshot-id)
            SNAPSHOT_ID="$2"
            shift 2
            ;;
        --instance-type)
            INSTANCE_TYPE="$2"
            shift 2
            ;;
        --db-instance-class)
            DB_INSTANCE_CLASS="$2"
            shift 2
            ;;
        --expiration-minutes)
            EXPIRATION_MINUTES="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

if [[ -z "$ENVIRONMENT_NAME" || -z "$KEY_PAIR_NAME" || -z "$DB_PASSWORD" ]]; then
    echo "Error: Missing required options"
    usage
fi

if [[ ${#DB_PASSWORD} -lt 8 ]]; then
    echo "Error: Database password must be at least 8 characters"
    exit 1
fi

STACK_NAME="${ENVIRONMENT_NAME}-sandbox-stack"

echo "Deploying sandbox environment: $ENVIRONMENT_NAME"
echo "Stack name: $STACK_NAME"
echo "Region: $REGION"
echo "AMI ID: $AMI_ID"
echo "RDS Snapshot: $SNAPSHOT_ID"
echo "Expiration: $EXPIRATION_MINUTES minutes"
echo ""

aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://${PROJECT_DIR}/cloudformation/sandbox-template.yaml" \
    --parameters \
        ParameterKey=EnvironmentName,ParameterValue="$ENVIRONMENT_NAME" \
        ParameterKey=AmiId,ParameterValue="$AMI_ID" \
        ParameterKey=DBSnapshotIdentifier,ParameterValue="$SNAPSHOT_ID" \
        ParameterKey=InstanceType,ParameterValue="$INSTANCE_TYPE" \
        ParameterKey=DBInstanceClass,ParameterValue="$DB_INSTANCE_CLASS" \
        ParameterKey=KeyPairName,ParameterValue="$KEY_PAIR_NAME" \
        ParameterKey=ExpirationTimeMinutes,ParameterValue="$EXPIRATION_MINUTES" \
        ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"

echo ""
echo "Stack creation initiated. Waiting for completion..."
echo "This may take 10-15 minutes..."

aws cloudformation wait stack-create-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

echo ""
echo "Stack created successfully!"
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --output table \
    --region "$REGION"
