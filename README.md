# Infrastructure Sandbox Ticket Board

A visual Kanban-style ticketing system that enables teams to request, provision, and manage ephemeral AWS sandbox environments with automatic lifecycle management and cost control.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Ticketing Board](#ticketing-board)
- [Infrastructure Template](#infrastructure-template)
- [AI Dispatch Agent Integration](#ai-dispatch-agent-integration)
- [Configuration](#configuration)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Infrastructure Sandbox Ticket Board streamlines the process of creating temporary AWS infrastructure environments for development, testing, or demonstration purposes. Users create sandbox requests through a drag-and-drop interface, and the system automatically provisions EC2 instances and RDS databases via CloudFormation. Built-in auto-termination mechanisms ensure sandboxes are cleaned up based on configurable time limits or idle detection, helping control cloud costs.

### Key Features

The system provides request management through a drag-and-drop ticketing board, automated provisioning that triggers AWS infrastructure deployment when tickets move to "Provisioning" status, visual lifecycle tracking as sandboxes progress through creation, readiness, and termination, and cost control through automatic termination based on configurable expiration timers (1-168 hours) or idle detection (1 hour of inactivity).

## Quick Start

### Running the Ticketing Board

```bash
cd ticketing
npm install
cp .env.example .env  # Configure your API credentials
npm run dev
```

The development server starts at `http://localhost:5173`.

### Deploying a Sandbox Manually

```bash
aws cloudformation create-stack \
  --stack-name sandbox-myenv-001 \
  --template-body file://infra-template/sandbox-template.yaml \
  --parameters ParameterKey=SandboxName,ParameterValue=myenv-001 \
               ParameterKey=ExpirationHours,ParameterValue=8 \
               ParameterKey=KeyPairName,ParameterValue=your-keypair \
  --capabilities CAPABILITY_NAMED_IAM
```

### Deleting a Sandbox

```bash
aws cloudformation delete-stack --stack-name sandbox-myenv-001
```

## Project Structure

```
todo-app-sandbox-infra/
├── ticketing/                      # React frontend application
│   ├── src/
│   │   └── components/
│   │       ├── Board.jsx           # Main Kanban board with drag-and-drop
│   │       ├── Column.jsx          # Status column component
│   │       ├── TicketCard.jsx      # Individual ticket display
│   │       └── AddTicketForm.jsx   # New ticket creation form
│   ├── .env.example                # API credentials template
│   ├── vite.config.js              # Dev server with API proxy
│   └── package.json                # Dependencies and scripts
│
├── infra-template/                 # Infrastructure-as-Code
│   ├── sandbox-template.yaml       # CloudFormation template
│   └── README.md                   # Infrastructure documentation
│
└── README.md                       # This file
```

## Ticketing Board

The ticketing board is a React application built with Vite that provides a drag-and-drop Kanban interface for managing sandbox requests. It uses `@dnd-kit` for smooth drag interactions and integrates with the Devin API to trigger automated provisioning.

### Status Columns

The board displays five status columns representing the sandbox lifecycle. **Requests** (purple) holds new sandbox requests awaiting processing. **Provisioning** (amber) indicates sandboxes currently being created. **Provisioned** (green) shows sandboxes that are ready for use. **Failed** (red) marks provisioning attempts that encountered errors. **Terminated** (gray) contains sandboxes that have been destroyed.

### Available Scripts

```bash
npm run dev      # Start development server at localhost:5173
npm run build    # Create production build in dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint checks
```

### API Integration

When a ticket is dragged to the "Provisioning" column, the board calls the Devin API to initiate infrastructure deployment. The board logs all API interactions in a visible panel for debugging purposes.

## Infrastructure Template

The CloudFormation template in `infra-template/sandbox-template.yaml` provisions complete sandbox environments with the following resources.

### Provisioned Resources

The template creates an EC2 App Server launched from a pre-configured AMI (`ami-073fce3e092c219a2`) with the todo application pre-installed. It also provisions an RDS PostgreSQL database restored from a snapshot (`sandbox-todo-snapshot-20260129-234617`) with seeded data. Security groups control access, with the App Security Group allowing inbound traffic on ports 22 (SSH), 80 (HTTP), 443 (HTTPS), and 3000 (application), while the DB Security Group restricts PostgreSQL port 5432 to connections from the app server only.

### Auto-Termination Mechanisms

Sandboxes automatically clean themselves up through two mechanisms. Scheduled termination uses EventBridge to trigger a Lambda function after the configured `ExpirationHours` (default 24, range 1-168). Idle detection runs hourly via a separate Lambda that monitors CloudWatch `NetworkPacketsIn` metrics and deletes the stack if no network activity is detected for one hour.

### Template Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| SandboxName | (required) | Unique identifier for the sandbox |
| ExpirationHours | 24 | Hours until auto-termination (1-168) |
| InstanceType | t3.micro | EC2 instance size |
| DBInstanceClass | db.t3.micro | RDS instance size |
| KeyPairName | (required) | EC2 KeyPair for SSH access |
| VpcId | vpc-07bda6071f14059c1 | Target VPC |
| SubnetId | subnet-0995d81977be00011 | EC2 subnet |
| SubnetIds | (2 subnets) | RDS subnet group |

### Checking Deployment Status

```bash
aws cloudformation describe-stacks --stack-name sandbox-myenv-001
```

### Getting Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name sandbox-myenv-001 \
  --query 'Stacks[0].Outputs'
```

The outputs include the app server's public IP, DNS name, application URL (port 3000), and database endpoint.

## AI Dispatch Agent Integration

The system integrates with an external AI Dispatch Agent that monitors the ticketing board API and orchestrates infrastructure operations. When a ticket moves to "Provisioning" status, the agent receives the request and executes `aws cloudformation create-stack` with the sandbox template. The agent monitors CloudFormation events and updates ticket status accordingly: `CREATE_COMPLETE` transitions the ticket to "Provisioned", while `CREATE_FAILED` moves it to "Failed". When a ticket is moved to "Terminated", the agent triggers stack deletion.

### Data Flow

1. User drags ticket to "Provisioning" column
2. Board calls Devin API with provisioning prompt
3. AI Dispatch Agent receives request and deploys CloudFormation stack
4. CloudFormation provisions EC2, RDS, and auto-termination resources
5. Agent monitors stack events and updates ticket status
6. Auto-termination (scheduled or idle) deletes stack and marks ticket "Terminated"

## Configuration

### Environment Variables

Copy `.env.example` to `.env` in the `ticketing/` directory and configure:

```bash
VITE_COGNITION_API_KEY=cog_xyz    # Cognition API key for Devin integration
VITE_DEVIN_ORG_ID=org-abc         # Your organization ID
```

API credentials can also be configured through the Settings panel in the board UI.

### Development Proxy

The Vite development server proxies `/api/devin` requests to `https://api.devin.ai` to handle CORS during local development.

## Requirements

The ticketing board requires Node.js 18+ and npm 9+. Infrastructure deployment requires AWS CLI configured with appropriate credentials and permissions for CloudFormation, EC2, RDS, IAM, Lambda, EventBridge, and CloudWatch operations.

### Technology Stack

The frontend uses React 19 with Vite 7, `@dnd-kit` for drag-and-drop functionality, and UUID for ticket identification. Infrastructure is managed through AWS CloudFormation with Python 3.11 Lambda functions for auto-termination logic.

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## License

See the repository for license information.

---

_Originally written and maintained by contributors and [Devin](https://devin.ai), with updates from the core team._
