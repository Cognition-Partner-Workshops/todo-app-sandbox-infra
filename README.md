# Infrastructure Sandbox Ticket Board

A Jira-like ticket system for managing infrastructure sandbox provisioning requests, with CloudFormation templates for ephemeral sandbox environments.

## Project Structure

```
├── ticketing/           # React Kanban board for sandbox requests
│   └── src/
│       └── components/  # Board, Column, TicketCard, AddTicketForm
├── infra-template/      # CloudFormation templates for sandbox provisioning
│   ├── sandbox-template.yaml
│   └── README.md
```

## Ticketing Board

A drag-and-drop Kanban board with 5 status columns:
- **Requests** - New sandbox requests
- **Provisioning** - Sandbox being created
- **Provisioned** - Sandbox ready for use
- **Failed** - Provisioning failed
- **Terminated** - Sandbox destroyed

### Running the Board

```bash
cd ticketing
npm install
npm run dev
```

The board calls an API when tickets are dragged to new columns, logging:
- `POST /api/tickets` - Create new ticket
- `PATCH /api/tickets/{id}/status` - Status change

## Infrastructure Template

CloudFormation template that provisions:
- EC2 instance from pre-configured AMI (`ami-073fce3e092c219a2`)
- RDS PostgreSQL from snapshot (`sandbox-todo-snapshot-20260129-234617`)
- Auto-termination via EventBridge (configurable hours)
- Idle detection (terminates after 1 hour of no network activity)

### Deploy a Sandbox

```bash
aws cloudformation create-stack \
  --stack-name sandbox-myenv-001 \
  --template-body file://infra-template/sandbox-template.yaml \
  --parameters ParameterKey=SandboxName,ParameterValue=myenv-001 \
               ParameterKey=ExpirationHours,ParameterValue=8 \
  --capabilities CAPABILITY_NAMED_IAM
```

### Delete a Sandbox

```bash
aws cloudformation delete-stack --stack-name sandbox-myenv-001
```

## AI Dispatch Agent Integration

The dispatch agent responds to ticket board API calls by:
1. **Requests → Provisioning**: Deploy CloudFormation stack
2. **Any → Terminated**: Delete CloudFormation stack
3. **Monitor stack events**: Update ticket status based on CloudFormation events
