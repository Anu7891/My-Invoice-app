import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { calcTotals, formatCurrency, formatDate } from '../utils/invoice';

const InvoiceHistory = ({ invoices, currentId, onOpen, onDuplicate, onDelete, onTogglePaid, onClose }) => {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const clientNames = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.clientName).filter(Boolean))).sort(),
    [invoices]
  );

  const q = search.trim().toLowerCase();
  const shown = invoices
    .filter((inv) => !clientFilter || inv.clientName === clientFilter)
    .filter((inv) => {
      if (!q) return true;
      const hay = [inv.invoiceNumber, inv.clientName, ...inv.items.map((i) => `${i.title} ${i.truckNo} ${i.deliveredTo}`)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || '') || (b.savedAt || '').localeCompare(a.savedAt || ''));

  const totalShown = shown.reduce((s, inv) => s + calcTotals(inv).total, 0);
  const unpaidShown = shown.filter((i) => i.status !== 'paid').reduce((s, inv) => s + calcTotals(inv).total, 0);

  return (
    <Modal title={`Saved invoices (${invoices.length})`} wide onClose={onClose}>
      {invoices.length === 0 ? (
        <p className="muted">No saved invoices yet. Click <strong>Save</strong> in the toolbar to keep an invoice here.</p>
      ) : (
        <>
          <div className="form-row">
            <input className="search-input" placeholder="Search by number, client, item, truck…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="search-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="">All clients</option>
              {clientNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <p className="muted">
            Showing {shown.length} · Total {formatCurrency(totalShown)} · Unpaid {formatCurrency(unpaidShown)}
          </p>
          <ul className="list">
            {shown.map((inv) => (
              <li key={inv.id} className="list-row">
                <div className="grow">
                  <strong>{inv.invoiceNumber || '(no number)'}</strong>{' '}
                  {inv.id === currentId && <span className="badge">open</span>}{' '}
                  <span className={`badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                    {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                  <div className="sub">
                    {formatDate(inv.invoiceDate)} · {inv.clientName || 'No client'} · {inv.items.length} item(s) ·{' '}
                    <strong>{formatCurrency(calcTotals(inv).total)}</strong>
                  </div>
                </div>
                <div className="actions">
                  <button className="btn btn-sm" onClick={() => { onOpen(inv); onClose(); }}>Open</button>
                  <button className="btn btn-sm btn-light" onClick={() => { onDuplicate(inv); onClose(); }} title="New invoice with the same client & items">
                    Duplicate
                  </button>
                  <button className="btn btn-sm btn-light" onClick={() => onTogglePaid(inv)}>
                    Mark {inv.status === 'paid' ? 'unpaid' : 'paid'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => window.confirm(`Delete invoice ${inv.invoiceNumber}?`) && onDelete(inv)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
};

export default InvoiceHistory;
