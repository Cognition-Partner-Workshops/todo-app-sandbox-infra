#!/bin/bash
set -e

usage() {
    echo "Usage: $0 --stack-name STACK_NAME [--region REGION]"
    echo ""
    echo "Delete a sandbox environment CloudFormation stack."
    echo ""
    echo "Options:"
    echo "  --stack-name NAME    Name of the CloudFormation stack to delete"
    echo "  --region REGION      AWS region (default: us-east-1)"
    echo "  --help               Show this help message"
    exit 1
}

STACK_NAME=""
REGION="us-east-1"

while [[ $# -gt 0 ]]; do
    case $1 in
        --stack-name)
            STACK_NAME="$2"
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

if [[ -z "$STACK_NAME" ]]; then
    echo "Error: --stack-name is required"
    usage
fi

echo "Deleting stack: $STACK_NAME in region: $REGION"

aws cloudformation delete-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

echo "Stack deletion initiated. Waiting for completion..."

aws cloudformation wait stack-delete-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

echo "Stack deleted successfully!"
