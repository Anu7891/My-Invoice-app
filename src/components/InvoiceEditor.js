import React, { useState } from 'react';
import './InvoiceEditor.css';
import {
  addDaysISO,
  formatCurrency,
  itemAmount,
  itemFromTemplate,
  makeItem,
  newId,
  weightToTons,
} from '../utils/invoice';

const Field = ({ label, children, className = '' }) => (
  <div className={`form-group ${className}`}>
    <label>{label}</label>
    {children}
  </div>
);

const InvoiceEditor = ({
  invoice,
  setInvoice,
  settings,
  clients,
  itemTemplates,
  suggestions,
  onManageClients,
  onSaveClient,
  onSaveTemplate,
  onOpenSettings,
}) => {
  const [collapsed, setCollapsed] = useState({});

  const update = (field, value) => setInvoice((prev) => ({ ...prev, [field]: value }));
  const bind = (field) => ({ value: invoice[field] ?? '', onChange: (e) => update(field, e.target.value) });

  // ---- dates -------------------------------------------------------------
  const changeInvoiceDate = (value) =>
    setInvoice((prev) => ({
      ...prev,
      invoiceDate: value,
      dueDate: value ? addDaysISO(value, settings.dueDays) : prev.dueDate,
      signatureDate: value || prev.signatureDate,
    }));

  // ---- client ------------------------------------------------------------
  const selectClient = (id) => {
    const c = clients.find((x) => x.id === id);
    setInvoice((prev) => ({
      ...prev,
      clientId: id,
      clientName: c ? c.name : '',
      clientAddress: c ? c.address : '',
      gstNumber: c ? c.gstNumber : '',
      clientPhone: c ? c.phone : '',
      clientEmail: c ? c.email : '',
    }));
  };
  const linkedClient = clients.find((c) => c.id === invoice.clientId);
  const clientChanged =
    linkedClient &&
    (linkedClient.name !== invoice.clientName ||
      linkedClient.address !== invoice.clientAddress ||
      linkedClient.gstNumber !== invoice.gstNumber ||
      linkedClient.phone !== invoice.clientPhone ||
      linkedClient.email !== invoice.clientEmail);

  // ---- items -------------------------------------------------------------
  const setItems = (fn) => setInvoice((prev) => ({ ...prev, items: fn(prev.items) }));
  const lastItem = invoice.items[invoice.items.length - 1];

  const addFromTemplate = (t) => setItems((items) => [...items, itemFromTemplate(t, settings, items[items.length - 1])]);
  const addBlank = () =>
    setItems((items) => {
      const prev = items[items.length - 1];
      return [
        ...items,
        makeItem(
          prev
            ? { deliveredTo: prev.deliveredTo, deliveryDate: prev.deliveryDate, fromLocation: prev.fromLocation, toLocation: prev.toLocation, truckNo: prev.truckNo }
            : {},
          settings
        ),
      ];
    });

  const updateItem = (id, field, value) =>
    setItems((items) =>
      items.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, [field]: value };
        // Auto quantity from weight (e.g. 29065kg -> 29.065)
        if ((field === 'weight' || field === 'qtyFromWeight') && next.qtyFromWeight) {
          const tons = weightToTons(next.weight);
          if (tons !== null) next.quantity = tons;
        }
        return next;
      })
    );

  const removeItem = (id) => setItems((items) => items.filter((it) => it.id !== id));
  const duplicateItem = (id) =>
    setItems((items) => {
      const i = items.findIndex((it) => it.id === id);
      const copy = { ...items[i], id: newId(), extraDetails: (items[i].extraDetails || []).map((d) => ({ ...d, id: newId() })) };
      return [...items.slice(0, i + 1), copy, ...items.slice(i + 1)];
    });
  const moveItem = (id, dir) =>
    setItems((items) => {
      const i = items.findIndex((it) => it.id === id);
      const j = i + dir;
      if (j < 0 || j >= items.length) return items;
      const next = [...items];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addExtra = (id) =>
    setItems((items) =>
      items.map((it) => (it.id === id ? { ...it, extraDetails: [...(it.extraDetails || []), { id: newId(), label: '', value: '' }] } : it))
    );
  const updateExtra = (id, extraId, key, value) =>
    setItems((items) =>
      items.map((it) =>
        it.id === id ? { ...it, extraDetails: it.extraDetails.map((d) => (d.id === extraId ? { ...d, [key]: value } : d)) } : it
      )
    );
  const removeExtra = (id, extraId) =>
    setItems((items) => items.map((it) => (it.id === id ? { ...it, extraDetails: it.extraDetails.filter((d) => d.id !== extraId) } : it)));

  const allCollapsed = invoice.items.length > 0 && invoice.items.every((it) => collapsed[it.id]);
  const toggleAll = () =>
    setCollapsed(allCollapsed ? {} : Object.fromEntries(invoice.items.map((it) => [it.id, true])));

  return (
    <div className="editor-panel">
      <h2>Invoice Editor</h2>

      {/* Datalists = autocomplete suggestions learned from your past invoices */}
      <datalist id="dl-titles">{suggestions.titles.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-places">{suggestions.places.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-delivered">{suggestions.deliveredTo.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-trucks">{suggestions.trucks.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-labels">{suggestions.extraLabels.map((v) => <option key={v} value={v} />)}</datalist>

      {/* Invoice Details */}
      <div className="section">
        <h3>Invoice Details</h3>
        <div className="form-row">
          <Field label="Invoice Number:">
            <input type="text" {...bind('invoiceNumber')} />
          </Field>
          <Field label="Invoice Date:">
            <input type="date" value={invoice.invoiceDate} onChange={(e) => changeInvoiceDate(e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Due Date:">
            <input type="date" {...bind('dueDate')} />
          </Field>
          <Field label={`${settings.taxLabel || 'Tax'} rate (%):`}>
            <input type="number" min="0" step="0.01" {...bind('taxRate')} placeholder="0 = no tax" />
          </Field>
        </div>
      </div>

      {/* Bill To */}
      <div className="section">
        <div className="section-title-row">
          <h3>Bill To</h3>
          <button className="btn btn-sm btn-light" onClick={onManageClients}>Manage clients</button>
        </div>
        <Field label="Select Client:">
          <select className="client-select" value={invoice.clientId || ''} onChange={(e) => selectClient(e.target.value)}>
            <option value="">— Type a new client below —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Client Name:">
          <input type="text" {...bind('clientName')} />
        </Field>
        <Field label="Client Address:">
          <textarea rows="4" {...bind('clientAddress')} />
        </Field>
        <div className="form-row">
          <Field label="GST Number:">
            <input type="text" {...bind('gstNumber')} />
          </Field>
          <Field label="Client Phone:">
            <input type="text" {...bind('clientPhone')} />
          </Field>
        </div>
        <Field label="Client Email:">
          <input type="email" {...bind('clientEmail')} />
        </Field>
        {!linkedClient && invoice.clientName.trim() && (
          <button className="btn btn-sm btn-success" onClick={() => onSaveClient(false)}>
            + Save "{invoice.clientName.trim()}" to client list
          </button>
        )}
        {clientChanged && (
          <div className="hint-row">
            <span className="muted">You changed this client's details.</span>
            <button className="btn btn-sm" onClick={() => onSaveClient(true)}>Update saved client</button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="section">
        <div className="section-title-row">
          <h3>Items ({invoice.items.length})</h3>
          {invoice.items.length > 1 && (
            <button className="btn btn-sm btn-light" onClick={toggleAll}>{allCollapsed ? 'Expand all' : 'Collapse all'}</button>
          )}
        </div>

        <div className="items-container">
          {invoice.items.length === 0 && <p className="muted">No items yet — use the buttons below to add one.</p>}
          {invoice.items.map((item, index) => {
            const isCollapsed = !!collapsed[item.id];
            return (
              <div key={item.id} className="item-row">
                <div className="item-header">
                  <button
                    className="item-toggle"
                    onClick={() => setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }))}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    <span>{isCollapsed ? '▸' : '▾'}</span>
                    <h4>
                      {index + 1}. {item.title || 'Untitled item'}
                      <span className="item-amount">{formatCurrency(itemAmount(item))}</span>
                    </h4>
                  </button>
                  <div className="item-controls">
                    <button className="btn btn-move" onClick={() => moveItem(item.id, -1)} disabled={index === 0} title="Move Up">↑</button>
                    <button className="btn btn-move" onClick={() => moveItem(item.id, 1)} disabled={index === invoice.items.length - 1} title="Move Down">↓</button>
                    <button className="btn btn-move" onClick={() => duplicateItem(item.id)} title="Duplicate">⧉</button>
                    <button className="btn btn-move btn-move-danger" onClick={() => removeItem(item.id)} title="Remove">✕</button>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    <Field label="Item Title:">
                      <input
                        type="text"
                        list="dl-titles"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                        placeholder="e.g., Transport, Weighing Bill"
                      />
                    </Field>

                    <div className="item-details-section">
                      <h5>Item Details <span className="muted">(leave blank to hide on invoice)</span></h5>
                      <div className="form-row">
                        <Field label="Delivered To:">
                          <input type="text" list="dl-delivered" value={item.deliveredTo} onChange={(e) => updateItem(item.id, 'deliveredTo', e.target.value)} />
                        </Field>
                        <Field label="Delivery Date:">
                          <input type="date" value={item.deliveryDate} onChange={(e) => updateItem(item.id, 'deliveryDate', e.target.value)} />
                        </Field>
                      </div>
                      <div className="form-row">
                        <Field label="From Location:">
                          <input type="text" list="dl-places" value={item.fromLocation} onChange={(e) => updateItem(item.id, 'fromLocation', e.target.value)} />
                        </Field>
                        <Field label="To Location:">
                          <input type="text" list="dl-places" value={item.toLocation} onChange={(e) => updateItem(item.id, 'toLocation', e.target.value)} />
                        </Field>
                      </div>
                      <div className="form-row">
                        <Field label="Truck No:">
                          <input type="text" list="dl-trucks" value={item.truckNo} onChange={(e) => updateItem(item.id, 'truckNo', e.target.value.toUpperCase())} />
                        </Field>
                        <Field label="Weight:">
                          <input type="text" value={item.weight} onChange={(e) => updateItem(item.id, 'weight', e.target.value)} placeholder="e.g., 29065kg" />
                        </Field>
                      </div>

                      {(item.extraDetails || []).map((d) => (
                        <div key={d.id} className="form-row extra-row">
                          <Field label="Label:">
                            <input type="text" list="dl-labels" value={d.label} onChange={(e) => updateExtra(item.id, d.id, 'label', e.target.value)} placeholder="e.g., Challan No" />
                          </Field>
                          <Field label="Value:">
                            <input type="text" value={d.value} onChange={(e) => updateExtra(item.id, d.id, 'value', e.target.value)} />
                          </Field>
                          <button className="btn btn-move btn-move-danger" onClick={() => removeExtra(item.id, d.id)} title="Remove line">✕</button>
                        </div>
                      ))}
                      <button className="btn btn-sm btn-light" onClick={() => addExtra(item.id)}>+ Add custom detail</button>
                    </div>

                    <div className="checkbox-row">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={!!item.isFixedPrice} onChange={(e) => updateItem(item.id, 'isFixedPrice', e.target.checked)} />
                        Fixed Price (not per unit)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={!!item.qtyFromWeight} onChange={(e) => updateItem(item.id, 'qtyFromWeight', e.target.checked)} />
                        Quantity = weight in tons
                      </label>
                    </div>

                    <div className="form-row">
                      <Field label="Quantity:">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          placeholder={item.isFixedPrice ? 'For reference only' : ''}
                        />
                      </Field>
                      <Field label={item.isFixedPrice ? 'Fixed Price (₹):' : 'Price (₹):'}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          placeholder={item.isFixedPrice ? 'Enter fixed amount' : 'Price per unit'}
                        />
                      </Field>
                    </div>
                    <div className="item-footer">
                      <span>Amount: <strong>{formatCurrency(itemAmount(item))}</strong></span>
                      {item.title.trim() && !itemTemplates.some((t) => t.title.toLowerCase() === item.title.trim().toLowerCase()) && (
                        <button className="btn btn-sm btn-light" onClick={() => onSaveTemplate(item)}>Save as quick-add template</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="quick-add">
          <span className="muted">Add:</span>
          {itemTemplates.map((t) => (
            <button key={t.id} className="btn btn-sm" onClick={() => addFromTemplate(t)} title={`₹${t.price}${t.isFixedPrice ? ' fixed' : ' per unit'}`}>
              + {t.title}
            </button>
          ))}
          <button className="btn btn-sm btn-light" onClick={addBlank}>+ Blank item</button>
          <button className="btn btn-sm btn-light" onClick={() => onOpenSettings('items')} title="Edit quick-add buttons">⚙</button>
        </div>
        {lastItem && <p className="muted small-note">New items copy the delivery details of the last item.</p>}
      </div>

      {/* Notes */}
      <div className="section">
        <h3>Notes</h3>
        <Field label="Optional — printed under the items:">
          <textarea rows="2" {...bind('notes')} placeholder="e.g., Thank you for your business" />
        </Field>
      </div>

      {/* Business & payment snapshot for this invoice */}
      <details className="section details-section">
        <summary>
          <h3>Your details, bank &amp; signature (this invoice)</h3>
        </summary>
        <p className="muted">
          Pre-filled from <button className="link-btn" onClick={() => onOpenSettings('business')}>Settings</button>. Changes here only
          affect this invoice.
        </p>
        <Field label="Company Name:"><input type="text" {...bind('companyName')} /></Field>
        <Field label="Address:"><textarea rows="3" {...bind('companyAddress')} /></Field>
        <div className="form-row">
          <Field label="PAN Number:"><input type="text" {...bind('panNumber')} /></Field>
          <Field label="Phone:"><input type="text" {...bind('phoneNumber')} /></Field>
        </div>
        <Field label="Email:"><input type="email" {...bind('email')} /></Field>
        <Field label="Bank Name:"><input type="text" {...bind('bankName')} /></Field>
        <div className="form-row">
          <Field label="Account Number:"><input type="text" {...bind('accountNumber')} /></Field>
          <Field label="IFSC Code:"><input type="text" {...bind('ifscCode')} /></Field>
        </div>
        <div className="form-row">
          <Field label="Signature Name:"><input type="text" {...bind('signatureName')} /></Field>
          <Field label="Signature Date:"><input type="date" {...bind('signatureDate')} /></Field>
        </div>
      </details>
    </div>
  );
};

export default InvoiceEditor;
