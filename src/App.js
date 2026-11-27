import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import InvoiceEditor from './components/InvoiceEditor';
import InvoicePreview from './components/InvoicePreview';
import ClientManager from './components/ClientManager';
import SettingsPanel from './components/SettingsPanel';
import InvoiceHistory from './components/InvoiceHistory';
import usePersistentState from './hooks/usePersistentState';
import { STORAGE_KEYS } from './utils/storage';
import { downloadInvoiceHTML, printInvoice } from './utils/exportInvoice';
import {
  DEFAULT_CLIENTS,
  DEFAULT_ITEM_TEMPLATES,
  DEFAULT_SETTINGS,
  createInvoice,
  formatInvoiceNumber,
  itemFromTemplate,
  newId,
  parseInvoiceSeq,
  todayISO,
  addDaysISO,
} from './utils/invoice';

// Fields compared to decide whether the open invoice has unsaved changes.
const stripMeta = ({ savedAt, status, ...rest }) => rest;

/** Most-used values first, for autocomplete. */
const topValues = (values) => {
  const counts = new Map();
  values.forEach((v) => {
    const s = String(v || '').trim();
    if (s) counts.set(s, (counts.get(s) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v)
    .slice(0, 50);
};

function App() {
  // ---- persisted data ----------------------------------------------------
  const [rawSettings, setSettings] = usePersistentState(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  // Merge with defaults so new settings added in future versions always exist.
  const settings = useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      business: { ...DEFAULT_SETTINGS.business, ...(rawSettings.business || {}) },
      bank: { ...DEFAULT_SETTINGS.bank, ...(rawSettings.bank || {}) },
    }),
    [rawSettings]
  );
  const [clients, setClients] = usePersistentState(STORAGE_KEYS.clients, DEFAULT_CLIENTS);
  const [itemTemplates, setItemTemplates] = usePersistentState(STORAGE_KEYS.itemTemplates, DEFAULT_ITEM_TEMPLATES);
  const [invoices, setInvoices] = usePersistentState(STORAGE_KEYS.invoices, []);
  const [invoice, setInvoice] = usePersistentState(STORAGE_KEYS.draft, () => {
    // First run: a fresh invoice with the first client and the quick-add items.
    const inv = createInvoice(settings, clients[0]);
    inv.items = itemTemplates.map((t) => itemFromTemplate(t, settings));
    return inv;
  });

  const [modal, setModal] = useState(null); // 'clients' | 'settings' | 'history'
  const [settingsTab, setSettingsTab] = useState('business');
  const [toast, setToast] = useState('');
  const previewRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(showToast.t);
    showToast.t = window.setTimeout(() => setToast(''), 2500);
  }, []);

  // ---- derived -----------------------------------------------------------
  const savedVersion = invoice.id ? invoices.find((i) => i.id === invoice.id) : null;
  const isDirty = !savedVersion || JSON.stringify(stripMeta(savedVersion)) !== JSON.stringify(stripMeta(invoice));
  const hasContent = invoice.items.length > 0 || invoice.clientName.trim();

  const suggestions = useMemo(() => {
    const allItems = [...invoices.flatMap((i) => i.items), ...invoice.items];
    return {
      titles: topValues([...itemTemplates.map((t) => t.title), ...allItems.map((i) => i.title)]),
      places: topValues(allItems.flatMap((i) => [i.fromLocation, i.toLocation])),
      deliveredTo: topValues(allItems.map((i) => i.deliveredTo)),
      trucks: topValues([settings.defaultTruckNo, ...allItems.map((i) => i.truckNo)]),
      extraLabels: topValues(allItems.flatMap((i) => (i.extraDetails || []).map((d) => d.label))),
    };
  }, [invoices, invoice.items, itemTemplates, settings.defaultTruckNo]);

  // ---- invoice actions ---------------------------------------------------
  const confirmDiscard = () =>
    !isDirty || !hasContent || window.confirm('This invoice has unsaved changes. Continue without saving?');

  const newInvoice = () => {
    if (!confirmDiscard()) return;
    const client = clients.find((c) => c.id === invoice.clientId) || clients[0];
    setInvoice(createInvoice(settings, client));
    showToast(`New invoice ${formatInvoiceNumber(settings)}`);
  };

  const saveInvoice = useCallback(() => {
    if (!invoice.invoiceNumber.trim()) {
      alert('Please enter an invoice number before saving.');
      return;
    }
    const clash = invoices.find(
      (i) => i.id !== invoice.id && i.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase()
    );
    if (clash && !window.confirm(`Invoice number ${invoice.invoiceNumber} is already used by another saved invoice. Save anyway?`)) {
      return;
    }

    const isNew = !invoice.id;
    const saved = {
      ...invoice,
      id: invoice.id || newId(),
      status: savedVersion ? savedVersion.status : 'unpaid',
      savedAt: new Date().toISOString(),
    };
    setInvoices((list) => (isNew ? [...list, saved] : list.map((i) => (i.id === saved.id ? saved : i))));
    setInvoice(saved);

    // Auto-increment the invoice counter
    const seq = parseInvoiceSeq(saved.invoiceNumber);
    if (seq !== null && seq >= settings.nextInvoiceNumber) {
      setSettings((s) => ({ ...s, nextInvoiceNumber: seq + 1 }));
    }
    showToast(isNew ? `Saved ${saved.invoiceNumber}` : `Updated ${saved.invoiceNumber}`);
  }, [invoice, invoices, savedVersion, settings.nextInvoiceNumber, setInvoices, setInvoice, setSettings, showToast]);

  const openInvoice = (inv) => {
    if (inv.id !== invoice.id && !confirmDiscard()) return;
    setInvoice({ ...inv });
  };

  const duplicateInvoice = (inv) => {
    if (!confirmDiscard()) return;
    const date = todayISO();
    setInvoice({
      ...inv,
      id: null,
      status: 'draft',
      savedAt: undefined,
      invoiceNumber: formatInvoiceNumber(settings),
      invoiceDate: date,
      dueDate: addDaysISO(date, settings.dueDays),
      signatureDate: date,
      items: inv.items.map((it) => ({ ...it, id: newId() })),
    });
    showToast('Copied — edit and Save as a new invoice');
  };

  const deleteInvoice = (inv) => {
    setInvoices((list) => list.filter((i) => i.id !== inv.id));
    if (inv.id === invoice.id) setInvoice((cur) => ({ ...cur, id: null, status: 'draft' }));
  };

  const togglePaid = (inv) => {
    const status = inv.status === 'paid' ? 'unpaid' : 'paid';
    setInvoices((list) => list.map((i) => (i.id === inv.id ? { ...i, status } : i)));
    if (inv.id === invoice.id) setInvoice((cur) => ({ ...cur, status }));
  };

  // ---- clients / templates / settings ------------------------------------
  const applyClient = (c) =>
    setInvoice((prev) => ({
      ...prev,
      clientId: c.id,
      clientName: c.name,
      clientAddress: c.address,
      gstNumber: c.gstNumber,
      clientPhone: c.phone,
      clientEmail: c.email,
    }));

  const saveClientFromInvoice = (updateExisting) => {
    const data = {
      name: invoice.clientName.trim(),
      address: invoice.clientAddress,
      gstNumber: invoice.gstNumber,
      phone: invoice.clientPhone,
      email: invoice.clientEmail,
    };
    if (updateExisting && invoice.clientId) {
      setClients((list) => list.map((c) => (c.id === invoice.clientId ? { ...c, ...data } : c)));
      showToast(`Updated client ${data.name}`);
    } else {
      const id = newId();
      setClients((list) => [...list, { id, ...data }]);
      setInvoice((prev) => ({ ...prev, clientId: id }));
      showToast(`Added ${data.name} to clients`);
    }
  };

  const saveTemplateFromItem = (item) => {
    setItemTemplates((list) => [
      ...list,
      {
        id: newId(),
        title: item.title.trim(),
        price: item.price,
        quantity: item.qtyFromWeight ? '' : item.quantity,
        isFixedPrice: !!item.isFixedPrice,
        qtyFromWeight: !!item.qtyFromWeight,
      },
    ]);
    showToast(`"${item.title.trim()}" added to quick-add buttons`);
  };

  const saveSettings = (newSettings, newTemplates) => {
    setSettings(newSettings);
    setItemTemplates(newTemplates);
    // An invoice that hasn't been saved yet picks up the new details straight away.
    if (!invoice.id) {
      setInvoice((prev) => ({
        ...prev,
        ...newSettings.business,
        ...newSettings.bank,
        signatureName: newSettings.signatureName,
        invoiceNumber:
          prev.invoiceNumber === formatInvoiceNumber(settings) ? formatInvoiceNumber(newSettings) : prev.invoiceNumber,
      }));
    }
    showToast('Settings saved');
  };

  const openSettings = (tab = 'business') => {
    setSettingsTab(tab);
    setModal('settings');
  };

  // ---- export ------------------------------------------------------------
  const title = `Invoice ${invoice.invoiceNumber} - ${invoice.clientName || invoice.companyName}`;
  const fileName = `invoice-${(invoice.invoiceNumber || 'draft').replace(/[\\/:*?"<>|\s]+/g, '-')}.html`;

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveInvoice();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveInvoice]);

  return (
    <div className="App">
      <div className="toolbar">
        <div className="toolbar-status">
          <strong>{invoice.invoiceNumber || 'Untitled'}</strong>
          {invoice.id ? (
            isDirty ? <span className="status unsaved">Unsaved changes</span> : <span className="status saved">Saved</span>
          ) : (
            <span className="status unsaved">Not saved yet</span>
          )}
        </div>
        <div className="toolbar-buttons">
          <button className="btn btn-light" onClick={newInvoice}>New</button>
          <button className="btn btn-success" onClick={saveInvoice} title="Ctrl+S">Save</button>
          <button className="btn btn-light" onClick={() => setModal('history')}>
            Invoices{invoices.length ? ` (${invoices.length})` : ''}
          </button>
          <button className="btn btn-light" onClick={() => setModal('clients')}>Clients</button>
          <button className="btn btn-light" onClick={() => openSettings('business')}>Settings</button>
          <span className="toolbar-sep" />
          <button className="btn" onClick={() => downloadInvoiceHTML(previewRef.current, title, fileName)}>Export HTML</button>
          <button className="btn" onClick={() => printInvoice(previewRef.current, title)} title="Choose 'Save as PDF' in the print dialog for a PDF">
            Print / PDF
          </button>
        </div>
      </div>

      <div className="container">
        <InvoiceEditor
          invoice={invoice}
          setInvoice={setInvoice}
          settings={settings}
          clients={clients}
          itemTemplates={itemTemplates}
          suggestions={suggestions}
          onManageClients={() => setModal('clients')}
          onSaveClient={saveClientFromInvoice}
          onSaveTemplate={saveTemplateFromItem}
          onOpenSettings={openSettings}
        />
        <InvoicePreview ref={previewRef} invoiceData={invoice} settings={settings} />
      </div>

      {modal === 'clients' && (
        <ClientManager clients={clients} setClients={setClients} onUseClient={applyClient} onClose={() => setModal(null)} />
      )}
      {modal === 'settings' && (
        <SettingsPanel
          settings={settings}
          itemTemplates={itemTemplates}
          initialTab={settingsTab}
          onSave={saveSettings}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'history' && (
        <InvoiceHistory
          invoices={invoices}
          currentId={invoice.id}
          onOpen={openInvoice}
          onDuplicate={duplicateInvoice}
          onDelete={deleteInvoice}
          onTogglePaid={togglePaid}
          onClose={() => setModal(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
