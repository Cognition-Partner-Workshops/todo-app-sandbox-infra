import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TicketCard from './TicketCard';

export default function Column({ id, title, tickets, color }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`column ${isOver ? 'column-over' : ''}`}
      style={{ '--column-color': color }}
    >
      <div className="column-header">
        <h2>{title}</h2>
        <span className="ticket-count">{tickets.length}</span>
      </div>
      <div ref={setNodeRef} className="column-content">
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div className="empty-column">Drop tickets here</div>
        )}
      </div>
    </div>
  );
}
