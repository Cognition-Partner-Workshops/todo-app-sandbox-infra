import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TicketCard({ ticket, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ticket-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="ticket-title">{ticket.title}</div>
      {ticket.description && (
        <div className="ticket-description">{ticket.description}</div>
      )}
      <div className="ticket-meta">
        <span className="ticket-id">{ticket.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}
