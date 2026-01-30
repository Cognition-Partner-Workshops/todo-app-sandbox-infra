import { useState } from 'react';

export default function AddTicketForm({ onAdd }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    setTitle('');
    setDescription('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button className="add-ticket-btn" onClick={() => setIsOpen(true)}>
        + New Sandbox Request
      </button>
    );
  }

  return (
    <form className="add-ticket-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Sandbox name (e.g., dev-sandbox-01)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="form-actions">
        <button type="submit" className="btn-primary">Create Request</button>
        <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
