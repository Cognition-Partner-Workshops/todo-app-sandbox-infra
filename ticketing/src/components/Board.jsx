import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Column from './Column';
import TicketCard from './TicketCard';
import AddTicketForm from './AddTicketForm';
import { v4 as uuidv4 } from 'uuid';

const STATUSES = ['requests', 'provisioning', 'provisioned', 'failed', 'terminated'];

const STATUS_COLORS = {
  requests: '#6366f1',
  provisioning: '#f59e0b',
  provisioned: '#10b981',
  failed: '#ef4444',
  terminated: '#6b7280',
};

const DEVIN_ORG_ID = import.meta.env.VITE_DEVIN_ORG_ID || '';
const DEFAULT_API_KEY = import.meta.env.VITE_COGNITION_API_KEY || '';

export default function Board() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [apiLogs, setApiLogs] = useState([]);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [orgId, setOrgId] = useState(DEVIN_ORG_ID);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addTicket = (title, description) => {
    const newTicket = {
      id: uuidv4(),
      title,
      description,
      status: 'requests',
      createdAt: new Date().toISOString(),
    };
    setTickets([...tickets, newTicket]);
    logApiCall('POST', '/api/tickets', newTicket, 201);
  };

  const logApiCall = (method, endpoint, payload, status) => {
    const log = {
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      method,
      endpoint,
      payload,
      status,
    };
    setApiLogs((prev) => [log, ...prev].slice(0, 10));
  };

  const callStatusChangeApi = async (ticketId, oldStatus, newStatus) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const payload = {
      ticketId,
      title: ticket?.title,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    };

    logApiCall('PATCH', `/api/tickets/${ticketId}/status`, payload, 200);

    // If moving to provisioning, call Devin API
    if (newStatus === 'provisioning' && apiKey && orgId) {
      await callDevinApi(ticket);
    }
  };

  const callDevinApi = async (ticket) => {
    const prompt = `You are to fulfil an infra provisioning request in AWS to respond to this ticket:

Ticket ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description || 'No description provided'}
Created: ${ticket.createdAt}

Create the sandbox infrastructure, then respond with a status update as your final response. Use the infra template from https://github.com/Cognition-Partner-Workshops/todo-app-sandbox-infra in the \`infra-template\` subdirectory and the aws cli to deploy with your environment variable AWS credentials.`;

    const requestPayload = {
      prompt,
    };

    const apiUrl = `/api/devin/v3beta1/organizations/${orgId}/sessions`;
    logApiCall('POST', apiUrl, requestPayload, 'pending');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();
      
      if (response.ok) {
        logApiCall('POST', apiUrl, { response: data }, response.status);
        console.log('Devin session created:', data);
      } else {
        logApiCall('POST', apiUrl, { error: data }, response.status);
        console.error('Devin API error:', data);
      }
    } catch (err) {
      logApiCall('POST', apiUrl, { error: err.message }, 'error');
      console.error('Devin API request failed:', err);
    }
  };

  const findColumn = (id) => {
    if (STATUSES.includes(id)) return id;
    const ticket = tickets.find((t) => t.id === id);
    return ticket?.status;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === active.id);
    setActiveTicket(ticket);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeColumn = findColumn(active.id);
    const overColumn = findColumn(over.id);

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setTickets((prev) => {
      return prev.map((ticket) => {
        if (ticket.id === active.id) {
          return { ...ticket, status: overColumn };
        }
        return ticket;
      });
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTicket(null);
      return;
    }

    const activeColumn = findColumn(active.id);

    if (activeTicket && activeColumn !== activeTicket.status) {
      callStatusChangeApi(active.id, activeTicket.status, activeColumn);
    }

    setActiveTicket(null);
  };

  const getTicketsByStatus = (status) => {
    return tickets.filter((ticket) => ticket.status === status);
  };

  return (
    <div className="board-container">
      <header className="board-header">
        <h1>🏗️ Infrastructure Sandbox Board</h1>
        <p>Drag tickets between columns to change their provisioning status</p>
      </header>

      <div className="settings-section">
        <button 
          className="settings-toggle" 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          ⚙️ API Settings {isSettingsOpen ? '▲' : '▼'}
        </button>
        {isSettingsOpen && (
          <div className="settings-form">
            <div className="settings-field">
              <label>Cognition API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="cog_xyz..."
              />
            </div>
            <div className="settings-field">
              <label>Organization ID</label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="your-org-id"
              />
            </div>
            <p className="settings-hint">
              {apiKey ? '✓ API key configured' : '⚠ No API key - Devin calls disabled'}
            </p>
          </div>
        )}
      </div>

      <AddTicketForm onAdd={addTicket} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {STATUSES.map((status) => (
            <Column
              key={status}
              id={status}
              title={status.charAt(0).toUpperCase() + status.slice(1)}
              tickets={getTicketsByStatus(status)}
              color={STATUS_COLORS[status]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <TicketCard ticket={activeTicket} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="api-log">
        <h3>📡 API Call Log</h3>
        {apiLogs.length === 0 ? (
          <p className="no-logs">No API calls yet. Add a ticket or drag one to a new column.</p>
        ) : (
          <ul>
            {apiLogs.map((log) => (
              <li key={log.id} className={`log-entry status-${log.status}`}>
                <span className="log-time">{log.timestamp}</span>
                <span className={`log-method ${log.method.toLowerCase()}`}>{log.method}</span>
                <span className="log-endpoint">{log.endpoint}</span>
                <code className="log-payload">{JSON.stringify(log.payload, null, 2)}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
