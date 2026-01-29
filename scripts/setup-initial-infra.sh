#!/bin/bash
set -e

# Configuration
REGION="us-east-1"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_CIDR="10.0.1.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.3.0/24"
PROJECT_NAME="sandbox-todo"
DB_NAME="todoapp"
DB_USER="todouser"
DB_PASSWORD="TodoPass123!"

echo "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block $VPC_CIDR \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc}]" \
    --query 'Vpc.VpcId' \
    --output text \
    --region $REGION)
echo "VPC created: $VPC_ID"

aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames '{"Value":true}' --region $REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support '{"Value":true}' --region $REGION

echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw}]" \
    --query 'InternetGateway.InternetGatewayId' \
    --output text \
    --region $REGION)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION
echo "Internet Gateway created and attached: $IGW_ID"

echo "Creating Public Subnet..."
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $PUBLIC_SUBNET_CIDR \
    --availability-zone ${REGION}a \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet}]" \
    --query 'Subnet.SubnetId' \
    --output text \
    --region $REGION)
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_ID --map-public-ip-on-launch --region $REGION
echo "Public Subnet created: $PUBLIC_SUBNET_ID"

echo "Creating Private Subnets for RDS..."
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $PRIVATE_SUBNET_1_CIDR \
    --availability-zone ${REGION}a \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1}]" \
    --query 'Subnet.SubnetId' \
    --output text \
    --region $REGION)
echo "Private Subnet 1 created: $PRIVATE_SUBNET_1_ID"

PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $PRIVATE_SUBNET_2_CIDR \
    --availability-zone ${REGION}b \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-2}]" \
    --query 'Subnet.SubnetId' \
    --output text \
    --region $REGION)
echo "Private Subnet 2 created: $PRIVATE_SUBNET_2_ID"

echo "Creating Route Table..."
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt}]" \
    --query 'RouteTable.RouteTableId' \
    --output text \
    --region $REGION)
aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $REGION
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_ID --route-table-id $ROUTE_TABLE_ID --region $REGION
echo "Route Table created and associated: $ROUTE_TABLE_ID"

echo "Creating Security Group for EC2..."
EC2_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-ec2-sg" \
    --description "Security group for todo app EC2" \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-ec2-sg}]" \
    --query 'GroupId' \
    --output text \
    --region $REGION)

aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $REGION
echo "EC2 Security Group created: $EC2_SG_ID"

echo "Creating Security Group for RDS..."
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-rds-sg" \
    --description "Security group for todo app RDS" \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-rds-sg}]" \
    --query 'GroupId' \
    --output text \
    --region $REGION)

aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $EC2_SG_ID --region $REGION
echo "RDS Security Group created: $RDS_SG_ID"

echo "Creating DB Subnet Group..."
aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --db-subnet-group-description "Subnet group for todo app RDS" \
    --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID \
    --tags "Key=Name,Value=${PROJECT_NAME}-db-subnet-group" \
    --region $REGION
echo "DB Subnet Group created"

echo "Creating RDS PostgreSQL instance..."
aws rds create-db-instance \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username $DB_USER \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --db-name $DB_NAME \
    --vpc-security-group-ids $RDS_SG_ID \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --no-publicly-accessible \
    --backup-retention-period 1 \
    --tags "Key=Name,Value=${PROJECT_NAME}-db" \
    --region $REGION
echo "RDS instance creation initiated (this will take several minutes)..."

echo "Creating Key Pair..."
aws ec2 create-key-pair \
    --key-name "${PROJECT_NAME}-key" \
    --query 'KeyMaterial' \
    --output text \
    --region $REGION > /home/ubuntu/repos/sandbox-infrastructure/${PROJECT_NAME}-key.pem
chmod 400 /home/ubuntu/repos/sandbox-infrastructure/${PROJECT_NAME}-key.pem
echo "Key Pair created and saved"

echo "Getting latest Amazon Linux 2023 AMI..."
BASE_AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text \
    --region $REGION)
echo "Base AMI: $BASE_AMI_ID"

echo "Creating EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $BASE_AMI_ID \
    --instance-type t3.micro \
    --key-name "${PROJECT_NAME}-key" \
    --security-group-ids $EC2_SG_ID \
    --subnet-id $PUBLIC_SUBNET_ID \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-ec2}]" \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $REGION)
echo "EC2 instance created: $INSTANCE_ID"

echo ""
echo "=========================================="
echo "Infrastructure creation initiated!"
echo "=========================================="
echo "VPC ID: $VPC_ID"
echo "Public Subnet ID: $PUBLIC_SUBNET_ID"
echo "Private Subnet 1 ID: $PRIVATE_SUBNET_1_ID"
echo "Private Subnet 2 ID: $PRIVATE_SUBNET_2_ID"
echo "EC2 Security Group ID: $EC2_SG_ID"
echo "RDS Security Group ID: $RDS_SG_ID"
echo "EC2 Instance ID: $INSTANCE_ID"
echo "RDS Instance: ${PROJECT_NAME}-db (creating...)"
echo ""
echo "Wait for RDS to be available before proceeding:"
echo "aws rds wait db-instance-available --db-instance-identifier ${PROJECT_NAME}-db --region $REGION"

cat > /home/ubuntu/repos/sandbox-infrastructure/infra-ids.env << EOF
VPC_ID=$VPC_ID
PUBLIC_SUBNET_ID=$PUBLIC_SUBNET_ID
PRIVATE_SUBNET_1_ID=$PRIVATE_SUBNET_1_ID
PRIVATE_SUBNET_2_ID=$PRIVATE_SUBNET_2_ID
EC2_SG_ID=$EC2_SG_ID
RDS_SG_ID=$RDS_SG_ID
INSTANCE_ID=$INSTANCE_ID
IGW_ID=$IGW_ID
ROUTE_TABLE_ID=$ROUTE_TABLE_ID
PROJECT_NAME=$PROJECT_NAME
REGION=$REGION
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF
echo "Infrastructure IDs saved to infra-ids.env"
