import React, { useState } from 'react';
import Modal from './Modal';
import { newId } from '../utils/invoice';

const EMPTY = { name: '', address: '', gstNumber: '', phone: '', email: '', defaultFrom: '' };

const ClientManager = ({ clients, setClients, onUseClient, onClose, initialDraft, locations = [] }) => {
  // editing: null = list view, {} = form (id present = edit, absent = new)
  const [editing, setEditing] = useState(initialDraft || null);
  const [search, setSearch] = useState('');

  const save = () => {
    if (!editing.name.trim()) {
      alert('Client name is required.');
      return;
    }
    if (editing.id) {
      setClients((list) => list.map((c) => (c.id === editing.id ? { ...editing } : c)));
    } else {
      const client = { ...editing, id: newId() };
      setClients((list) => [...list, client]);
    }
    setEditing(null);
  };

  const remove = (client) => {
    if (window.confirm(`Delete client "${client.name}"? Saved invoices keep their copy of the details.`)) {
      setClients((list) => list.filter((c) => c.id !== client.id));
    }
  };

  const field = (key, label, multiline) => (
    <div className="form-group">
      <label>{label}</label>
      {multiline ? (
        <textarea rows="4" value={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} />
      ) : (
        <input type="text" value={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} />
      )}
    </div>
  );

  if (editing) {
    return (
      <Modal
        title={editing.id ? 'Edit client' : 'Add client'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-success" onClick={save}>Save client</button>
          </>
        }
      >
        {field('name', 'Client name *')}
        {field('address', 'Address', true)}
        {field('gstNumber', 'GST number (e.g. GSTIN: 24ABCDE1234F1Z5)')}
        <div className="form-row">
          {field('phone', 'Phone')}
          {field('email', 'Email')}
        </div>
        <div className="form-group">
          <label>Default "From" location for this client's trips</label>
          <input
            type="text"
            list="dl-client-from"
            value={editing.defaultFrom || ''}
            onChange={(e) => setEditing({ ...editing, defaultFrom: e.target.value })}
            placeholder="e.g. Ichchapore (leave empty if it changes every time)"
          />
          <datalist id="dl-client-from">{locations.map((l) => <option key={l} value={l} />)}</datalist>
        </div>
      </Modal>
    );
  }

  const q = search.trim().toLowerCase();
  const shown = clients.filter((c) => !q || `${c.name} ${c.address} ${c.gstNumber}`.toLowerCase().includes(q));

  return (
    <Modal
      title={`Clients (${clients.length})`}
      onClose={onClose}
      footer={<button className="btn btn-success" onClick={() => setEditing({ ...EMPTY })}>+ Add new client</button>}
    >
      {clients.length > 5 && (
        <input className="search-input" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
      )}
      {shown.length === 0 && <p className="muted">No clients yet. Add your first one below.</p>}
      <ul className="list">
        {shown.map((c) => (
          <li key={c.id} className="list-row">
            <div className="grow">
              <strong>{c.name}</strong>
              <div className="sub">
                {[c.defaultFrom ? `From: ${c.defaultFrom}` : '', c.gstNumber, c.address.replace(/\n/g, ', ')].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="actions">
              {onUseClient && (
                <button className="btn btn-sm" onClick={() => { onUseClient(c); onClose(); }}>Use</button>
              )}
              <button className="btn btn-sm btn-light" onClick={() => setEditing({ ...c })}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(c)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default ClientManager;
