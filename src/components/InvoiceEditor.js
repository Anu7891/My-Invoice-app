import React, { useState } from 'react';
import './InvoiceEditor.css';
import SelectOrCustom from './SelectOrCustom';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronDown,
  Copy,
  GripVertical,
  Hash,
  Landmark,
  Package,
  Pencil,
  Plus,
  Save,
  Settings2,
  StickyNote,
  Trash2,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  addDaysISO,
  applyClientToInvoice,
  calcTotals,
  formatCurrency,
  formatDate,
  itemAmount,
  itemFromTemplate,
  makeItem,
  newId,
  priceOptions,
  weightToTons,
} from '../utils/invoice';

const Field = ({ label, hint, children, className = '' }) => (
  <div className={`form-group ${className}`}>
    <label>{label}</label>
    {children}
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

/** Section card with an icon header. collapsible cards start closed when defaultOpen=false. */
const Card = ({ icon: Icon, title, subtitle, actions, children, collapsible, defaultOpen = true, className = '' }) => {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;
  const Head = collapsible ? 'button' : 'div';
  return (
    <section className={`card ${className} ${isOpen ? '' : 'is-closed'}`}>
      <Head className="card-head" {...(collapsible ? { type: 'button', onClick: () => setOpen((o) => !o), 'aria-expanded': open } : {})}>
        <span className="card-icon"><Icon size={16} /></span>
        <span className="card-titles">
          <span className="card-title">{title}</span>
          {subtitle && <span className="card-subtitle">{subtitle}</span>}
        </span>
        {actions && <span className="card-actions" onClick={(e) => e.stopPropagation()}>{actions}</span>}
        {collapsible && <ChevronDown className={`chev ${open ? 'up' : ''}`} size={18} />}
      </Head>
      {isOpen && <div className="card-body">{children}</div>}
    </section>
  );
};

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
  onOpenScan,
  onSave,
  isDirty,
  isSaved,
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [drag, setDrag] = useState({ from: null, over: null, after: false });

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
    setInvoice((prev) => applyClientToInvoice(prev, c, clients));
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

  // The current client's default From location (e.g. Abhishek Ispat → Ichchapore)
  const clientFrom = (clients.find((c) => c.id === invoice.clientId) || {}).defaultFrom || '';
  const withClientFrom = (item) => (item.fromLocation ? item : { ...item, fromLocation: clientFrom });

  const addFromTemplate = (t) =>
    setItems((items) => [...items, withClientFrom(itemFromTemplate(t, settings, items[items.length - 1]))]);
  const addBlank = () =>
    setItems((items) => {
      const prev = items[items.length - 1];
      return [
        ...items,
        withClientFrom(
          makeItem(
            prev
              ? { deliveredTo: prev.deliveredTo, deliveryDate: prev.deliveryDate, fromLocation: prev.fromLocation, toLocation: prev.toLocation, truckNo: prev.truckNo }
              : {},
            settings
          )
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

  // Drag & drop reordering (desktop). Phones use the ↑ ↓ buttons.
  const dropItem = () => {
    const { from, over, after } = drag;
    setDrag({ from: null, over: null, after: false });
    if (from === null || over === null) return;
    setItems((items) => {
      const fromIdx = items.findIndex((it) => it.id === from);
      let toIdx = items.findIndex((it) => it.id === over);
      if (fromIdx < 0 || toIdx < 0 || from === over) return items;
      const next = [...items];
      const [moved] = next.splice(fromIdx, 1);
      toIdx = next.findIndex((it) => it.id === over) + (after ? 1 : 0);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const totals = calcTotals(invoice);
  const prices = priceOptions(settings);
  const locations = Array.isArray(settings.locations) ? settings.locations : [];

  const allCollapsed = invoice.items.length > 0 && invoice.items.every((it) => collapsed[it.id]);
  const toggleAll = () =>
    setCollapsed(allCollapsed ? {} : Object.fromEntries(invoice.items.map((it) => [it.id, true])));


  const [editClient, setEditClient] = useState(false);
  const showClientFields = editClient || !linkedClient;

  return (
    <div className="editor">
      {/* Autocomplete suggestions learned from past invoices */}
      <datalist id="dl-titles">{suggestions.titles.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-places">{suggestions.places.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-delivered">{suggestions.deliveredTo.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-trucks">{suggestions.trucks.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-labels">{suggestions.extraLabels.map((v) => <option key={v} value={v} />)}</datalist>

      {/* ---------- Invoice ---------- */}
      <Card icon={Hash} title="Invoice details" subtitle="Number, dates and tax">
        <div className="grid-2 keep-2">
          <Field label="Invoice number">
            <input type="text" {...bind('invoiceNumber')} />
          </Field>
          <Field label="Invoice date">
            <input type="date" value={invoice.invoiceDate} onChange={(e) => changeInvoiceDate(e.target.value)} />
          </Field>
          <Field label="Due date" hint={settings.dueDays ? `Auto: ${settings.dueDays} days after invoice date` : null}>
            <input type="date" {...bind('dueDate')} />
          </Field>
          <Field label={`${settings.taxLabel || 'Tax'} rate`}>
            <div className="input-affix">
              <input type="number" min="0" step="0.01" inputMode="decimal" {...bind('taxRate')} placeholder="0" />
              <span>%</span>
            </div>
          </Field>
        </div>
      </Card>

      {/* ---------- Bill to ---------- */}
      <Card
        icon={Building2}
        title="Bill to"
        subtitle={linkedClient ? 'Saved client' : 'New client'}
        actions={<button className="btn btn-ghost btn-sm" onClick={onManageClients}>Manage</button>}
      >
        <Field label="Client">
          <select value={invoice.clientId || ''} onChange={(e) => { selectClient(e.target.value); setEditClient(false); }}>
            <option value="">+ New client (type details)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {linkedClient && !editClient && (
          <div className="client-summary">
            <div className="client-avatar">{(invoice.clientName || '?').trim().charAt(0).toUpperCase()}</div>
            <div className="client-info">
              <strong>{invoice.clientName}</strong>
              <span className="pre">{invoice.clientAddress}</span>
              <span className="client-meta">
                {[invoice.gstNumber, invoice.clientPhone, invoice.clientEmail].filter(Boolean).join(' · ')}
              </span>
              {linkedClient.defaultFrom && <span className="badge badge-brand">Trips from {linkedClient.defaultFrom}</span>}
            </div>
            <button className="btn btn-light btn-sm" onClick={() => setEditClient(true)}><Pencil />Edit</button>
          </div>
        )}

        {showClientFields && (
          <div className="client-fields">
            <Field label="Client name">
              <input type="text" {...bind('clientName')} placeholder="Company name" />
            </Field>
            <Field label="Address">
              <textarea rows="3" {...bind('clientAddress')} />
            </Field>
            <div className="grid-2">
              <Field label="GST number">
                <input type="text" {...bind('gstNumber')} />
              </Field>
              <Field label="Phone">
                <input type="text" inputMode="tel" {...bind('clientPhone')} />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" {...bind('clientEmail')} />
            </Field>
            <div className="row-end">
              {linkedClient && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditClient(false)}>Done</button>
              )}
              {clientChanged && (
                <button className="btn btn-light btn-sm" onClick={() => onSaveClient(true)}><Save />Update saved client</button>
              )}
              {!linkedClient && invoice.clientName.trim() && (
                <button className="btn btn-light btn-sm" onClick={() => onSaveClient(false)}><UserPlus />Save to clients</button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ---------- Items ---------- */}
      <Card
        icon={Package}
        title="Items"
        subtitle={`${invoice.items.length} item${invoice.items.length === 1 ? '' : 's'}`}
        actions={
          invoice.items.length > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={toggleAll}>{allCollapsed ? 'Expand all' : 'Collapse all'}</button>
          )
        }
        className="card-items"
      >
        {invoice.items.length === 0 && (
          <div className="empty">
            <div className="empty-icon"><Package size={22} /></div>
            <strong>No items yet</strong>
            <span>Add a trip with one of the buttons below{onOpenScan ? ', or scan a slip' : ''}.</span>
          </div>
        )}

        <div className="item-list">
          {invoice.items.map((item, index) => {
            const isCollapsed = !!collapsed[item.id];
            const dropClass =
              drag.over === item.id && drag.from !== item.id ? (drag.after ? ' drop-after' : ' drop-before') : '';
            const meta = [item.truckNo, item.deliveryDate && formatDate(item.deliveryDate), [item.fromLocation, item.toLocation].filter(Boolean).join(' → ')]
              .filter(Boolean)
              .join(' · ');
            return (
              <article
                key={item.id}
                className={`item${isCollapsed ? ' is-collapsed' : ''}${drag.from === item.id ? ' is-dragging' : ''}${dropClass}`}
                onDragOver={(e) => {
                  if (drag.from === null) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > r.top + r.height / 2;
                  if (drag.over !== item.id || drag.after !== after) setDrag((d) => ({ ...d, over: item.id, after }));
                }}
                onDrop={(e) => {
                  if (drag.from === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  dropItem();
                }}
              >
                <header className="item-head">
                  <span
                    className="drag-handle"
                    draggable
                    title="Drag to reorder"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', item.id);
                      setDrag({ from: item.id, over: null, after: false });
                    }}
                    onDragEnd={() => setDrag({ from: null, over: null, after: false })}
                  >
                    <GripVertical size={16} />
                  </span>
                  <span className="item-index">{index + 1}</span>
                  <button
                    type="button"
                    className="item-summary"
                    onClick={() => setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }))}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="item-name">{item.title || 'Untitled item'}</span>
                    {meta && <span className="item-meta">{meta}</span>}
                  </button>
                  <span className="item-amount tnum">{formatCurrency(itemAmount(item))}</span>
                  <div className="item-tools">
                    <button className="tool" onClick={() => moveItem(item.id, -1)} disabled={index === 0} title="Move up" aria-label="Move up"><ArrowUp size={16} /></button>
                    <button className="tool" onClick={() => moveItem(item.id, 1)} disabled={index === invoice.items.length - 1} title="Move down" aria-label="Move down"><ArrowDown size={16} /></button>
                    <button className="tool" onClick={() => duplicateItem(item.id)} title="Duplicate" aria-label="Duplicate"><Copy size={16} /></button>
                    <button className="tool tool-danger" onClick={() => removeItem(item.id)} title="Remove" aria-label="Remove"><Trash2 size={16} /></button>
                    <button className="tool" onClick={() => setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }))} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label="Toggle">
                      <ChevronDown size={18} className={`chev ${isCollapsed ? '' : 'up'}`} />
                    </button>
                  </div>
                </header>

                {!isCollapsed && (
                  <div className="item-body">
                    <Field label="Item">
                      <input
                        type="text"
                        list="dl-titles"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                        placeholder="e.g. Transport, Weighing Bill"
                      />
                    </Field>

                    <div className="subsection">
                      <div className="subsection-title"><Truck size={14} />Trip details <span>· blank fields are hidden on the invoice</span></div>
                      <div className="grid-2">
                        <Field label="From">
                          <SelectOrCustom value={item.fromLocation} options={locations} emptyLabel="Select place" placeholder="Type a place" onChange={(v) => updateItem(item.id, 'fromLocation', v)} />
                        </Field>
                        <Field label="To">
                          <SelectOrCustom value={item.toLocation} options={locations} emptyLabel="Select place" placeholder="Type a place" onChange={(v) => updateItem(item.id, 'toLocation', v)} />
                        </Field>
                        <Field label="Delivered to">
                          <input type="text" list="dl-delivered" value={item.deliveredTo} onChange={(e) => updateItem(item.id, 'deliveredTo', e.target.value)} placeholder="e.g. Saturn Godown" />
                        </Field>
                        <Field label="Delivery date">
                          <input type="date" value={item.deliveryDate} onChange={(e) => updateItem(item.id, 'deliveryDate', e.target.value)} />
                        </Field>
                        <Field label="Truck no.">
                          <input type="text" list="dl-trucks" value={item.truckNo} onChange={(e) => updateItem(item.id, 'truckNo', e.target.value.toUpperCase())} />
                        </Field>
                        <Field label="Weight">
                          <input type="text" value={item.weight} onChange={(e) => updateItem(item.id, 'weight', e.target.value)} placeholder="e.g. 29065kg" />
                        </Field>
                      </div>

                      {(item.extraDetails || []).map((d) => (
                        <div key={d.id} className="extra-row">
                          <input type="text" list="dl-labels" value={d.label} onChange={(e) => updateExtra(item.id, d.id, 'label', e.target.value)} placeholder="Label (e.g. Challan No)" aria-label="Detail label" />
                          <input type="text" value={d.value} onChange={(e) => updateExtra(item.id, d.id, 'value', e.target.value)} placeholder="Value" aria-label="Detail value" />
                          <button className="tool tool-danger" onClick={() => removeExtra(item.id, d.id)} title="Remove line" aria-label="Remove line"><X size={16} /></button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-sm add-detail" onClick={() => addExtra(item.id)}><Plus />Add detail</button>
                    </div>

                    <div className="pricing">
                      <div className="pricing-switches">
                        <label className="switch">
                          <input type="checkbox" checked={!!item.qtyFromWeight} onChange={(e) => updateItem(item.id, 'qtyFromWeight', e.target.checked)} />
                          <span className="track" />Quantity from weight (tons)
                        </label>
                        <label className="switch">
                          <input type="checkbox" checked={!!item.isFixedPrice} onChange={(e) => updateItem(item.id, 'isFixedPrice', e.target.checked)} />
                          <span className="track" />Fixed price
                        </label>
                      </div>
                      <div className="pricing-grid">
                        <Field label="Quantity">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            placeholder={item.isFixedPrice ? 'Reference only' : '0'}
                          />
                        </Field>
                        <Field label={item.isFixedPrice ? 'Fixed price' : 'Rate (₹)'}>
                          <SelectOrCustom
                            numeric
                            value={item.price}
                            options={prices}
                            format={(o) => `₹${o}`}
                            emptyLabel="Select rate"
                            onChange={(v) => updateItem(item.id, 'price', v)}
                            placeholder={item.isFixedPrice ? 'Amount' : 'Type rate'}
                          />
                        </Field>
                        <div className="form-group amount-cell">
                          <label>Amount</label>
                          <div className="amount-value tnum">{formatCurrency(itemAmount(item))}</div>
                        </div>
                      </div>
                    </div>

                    {item.title.trim() && !itemTemplates.some((t) => t.title.toLowerCase() === item.title.trim().toLowerCase()) && (
                      <div className="row-end">
                        <button className="btn btn-ghost btn-sm" onClick={() => onSaveTemplate(item)}><Plus />Save as quick-add</button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="add-bar">
          <span className="add-label">Add</span>
          {onOpenScan && (
            <button className="btn btn-light btn-sm" onClick={onOpenScan}>📷 From photo</button>
          )}
          {itemTemplates.map((t) => (
            <button key={t.id} className="btn btn-light btn-sm" onClick={() => addFromTemplate(t)} title={`₹${t.price}${t.isFixedPrice ? ' fixed' : ' per unit'}`}>
              <Plus />{t.title}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addBlank}><Plus />Blank</button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onOpenSettings('items')} title="Edit quick-add buttons" aria-label="Edit quick-add buttons">
            <Settings2 />
          </button>
        </div>
      </Card>

      {/* ---------- Notes ---------- */}
      <Card icon={StickyNote} title="Notes" subtitle="Optional — printed below the items" collapsible defaultOpen={!!invoice.notes}>
        <textarea rows="3" {...bind('notes')} placeholder="e.g. Thank you for your business" />
      </Card>

      {/* ---------- Business snapshot ---------- */}
      <Card icon={Landmark} title="Your business, bank & signature" subtitle="Pre-filled from Settings · changes apply to this invoice only" collapsible defaultOpen={false}>
        <Field label="Business name"><input type="text" {...bind('companyName')} /></Field>
        <Field label="Address"><textarea rows="3" {...bind('companyAddress')} /></Field>
        <div className="grid-2">
          <Field label="PAN"><input type="text" {...bind('panNumber')} /></Field>
          <Field label="Phone"><input type="text" inputMode="tel" {...bind('phoneNumber')} /></Field>
        </div>
        <Field label="Email"><input type="email" {...bind('email')} /></Field>
        <Field label="Bank"><input type="text" {...bind('bankName')} /></Field>
        <div className="grid-2">
          <Field label="Account number"><input type="text" {...bind('accountNumber')} /></Field>
          <Field label="IFSC"><input type="text" {...bind('ifscCode')} /></Field>
          <Field label="Signature name"><input type="text" {...bind('signatureName')} /></Field>
          <Field label="Signature date"><input type="date" {...bind('signatureDate')} /></Field>
        </div>
        <button className="link-btn" onClick={() => onOpenSettings('business')}>Change the defaults in Settings →</button>
      </Card>

      {/* ---------- Sticky summary ---------- */}
      <div className="summary-bar">
        <div className="summary-figures">
          <div className="summary-line">
            <span>Subtotal</span>
            <span className="tnum">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.taxRate > 0 && (
            <div className="summary-line">
              <span>{settings.taxLabel || 'Tax'} {totals.taxRate}%</span>
              <span className="tnum">{formatCurrency(totals.tax)}</span>
            </div>
          )}
        </div>
        <div className="summary-total">
          <span>Total</span>
          <strong className="tnum" key={totals.total}>{formatCurrency(totals.total)}</strong>
        </div>
        <button className="btn btn-lg summary-save" onClick={onSave} disabled={isSaved && !isDirty}>
          <Save />{isSaved && !isDirty ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default InvoiceEditor;
