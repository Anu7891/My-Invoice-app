import React, { useRef, useState } from 'react';
import Modal from './Modal';
import { formatInvoiceNumber, newId, priceOptions } from '../utils/invoice';
import { exportAllData, importAllData } from '../utils/storage';
import { downloadJSON } from '../utils/exportInvoice';

const TABS = [
  ['business', 'Business'],
  ['payment', 'Bank & Signature'],
  ['invoice', 'Invoice defaults'],
  ['items', 'Item templates'],
  ['backup', 'Backup'],
];

const SettingsPanel = ({ settings, itemTemplates, onSave, onClose, initialTab = 'business' }) => {
  const [tab, setTab] = useState(initialTab);
  const [s, setS] = useState(settings);
  const [templates, setTemplates] = useState(itemTemplates);
  const fileRef = useRef(null);
  const sigRef = useRef(null);

  const setTop = (key, value) => setS((p) => ({ ...p, [key]: value }));
  const setNested = (group, key, value) => setS((p) => ({ ...p, [group]: { ...p[group], [key]: value } }));

  const input = (label, value, onChange, opts = {}) => (
    <div className="form-group">
      <label>{label}</label>
      {opts.multiline ? (
        <textarea rows={opts.rows || 3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={opts.type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {opts.hint && <div className="muted">{opts.hint}</div>}
    </div>
  );

  const updateTemplate = (id, key, value) =>
    setTemplates((list) => list.map((t) => (t.id === id ? { ...t, [key]: value } : t)));

  const moveTemplate = (index, dir) =>
    setTemplates((list) => {
      const next = [...list];
      const j = index + dir;
      if (j < 0 || j >= next.length) return list;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const onSignatureFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('Please choose an image smaller than 1 MB.');
      return;
    }
    const r = new FileReader();
    r.onload = () => setTop('signatureImage', r.result);
    r.readAsDataURL(file);
    e.target.value = '';
  };

  const onImport = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importAllData(JSON.parse(r.result));
        alert('Backup restored. The app will reload now.');
        window.location.reload();
      } catch (err) {
        alert(err.message || 'Could not read that file.');
      }
    };
    r.readAsText(file);
    e.target.value = '';
  };

  const save = () => {
    const cleaned = {
      ...s,
      nextInvoiceNumber: Math.max(1, parseInt(s.nextInvoiceNumber, 10) || 1),
      numberPadding: Math.max(0, parseInt(s.numberPadding, 10) || 0),
      dueDays: Math.max(0, parseInt(s.dueDays, 10) || 0),
      defaultTaxRate: Math.max(0, parseFloat(s.defaultTaxRate) || 0),
      locations: Array.from(new Set((s.locations || []).map((l) => l.trim()).filter(Boolean))),
      priceMin: parseFloat(s.priceMin) || 0,
      priceMax: parseFloat(s.priceMax) || 0,
      priceStep: parseFloat(s.priceStep) || 0,
    };
    onSave(cleaned, templates.filter((t) => t.title.trim()));
    onClose();
  };

  return (
    <Modal
      title="Settings"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={save}>Save settings</button>
        </>
      }
    >
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <>
          <p className="muted">These details appear at the top of every new invoice.</p>
          {input('Business / your name', s.business.companyName, (v) => setNested('business', 'companyName', v))}
          {input('Address', s.business.companyAddress, (v) => setNested('business', 'companyAddress', v), { multiline: true })}
          <div className="form-row">
            {input('PAN number', s.business.panNumber, (v) => setNested('business', 'panNumber', v))}
            {input('Phone', s.business.phoneNumber, (v) => setNested('business', 'phoneNumber', v))}
          </div>
          {input('Email', s.business.email, (v) => setNested('business', 'email', v), { type: 'email' })}
        </>
      )}

      {tab === 'payment' && (
        <>
          {input('Bank name', s.bank.bankName, (v) => setNested('bank', 'bankName', v))}
          <div className="form-row">
            {input('Account number', s.bank.accountNumber, (v) => setNested('bank', 'accountNumber', v))}
            {input('IFSC code', s.bank.ifscCode, (v) => setNested('bank', 'ifscCode', v))}
          </div>
          {input('Signature name', s.signatureName, (v) => setTop('signatureName', v))}
          <div className="form-group">
            <label>Signature image</label>
            <div className="signature-setting">
              <img src={s.signatureImage || '/images/sign.png'} alt="Signature" />
              <div>
                <button className="btn btn-sm" onClick={() => sigRef.current.click()}>Upload new…</button>{' '}
                {s.signatureImage && (
                  <button className="btn btn-sm btn-light" onClick={() => setTop('signatureImage', '')}>Use default</button>
                )}
                <div className="muted">PNG with a transparent background works best.</div>
              </div>
            </div>
            <input ref={sigRef} type="file" accept="image/*" hidden onChange={onSignatureFile} />
          </div>
          {input('Agreement text (above signature)', s.agreementText, (v) => setTop('agreementText', v), { multiline: true, rows: 2 })}
        </>
      )}

      {tab === 'invoice' && (
        <>
          <div className="form-row">
            {input('Invoice number prefix', s.invoicePrefix, (v) => setTop('invoicePrefix', v), { hint: 'e.g. INV-, KS/25-26/' })}
            {input('Next invoice number', s.nextInvoiceNumber, (v) => setTop('nextInvoiceNumber', v), { type: 'number' })}
            {input('Digits (zero padding)', s.numberPadding, (v) => setTop('numberPadding', v), { type: 'number' })}
          </div>
          <p className="muted">Next new invoice will be numbered: <strong>{formatInvoiceNumber({ ...s, numberPadding: parseInt(s.numberPadding, 10) || 0 })}</strong> — it goes up by itself every time you save a new invoice.</p>
          <div className="form-row">
            {input('Payment due after (days)', s.dueDays, (v) => setTop('dueDays', v), { type: 'number' })}
            {input('Default truck no. for new items', s.defaultTruckNo, (v) => setTop('defaultTruckNo', v))}
          </div>
          <div className="form-group">
            <label>From / To places (one per line)</label>
            <textarea
              rows="6"
              value={(s.locations || []).join('\n')}
              onChange={(e) => setTop('locations', e.target.value.split('\n'))}
            />
            <div className="muted">These appear in the From and To dropdowns. "Custom…" is always there to type any other place.</div>
          </div>
          <div className="form-row">
            {input('Price list from (₹)', s.priceMin, (v) => setTop('priceMin', v), { type: 'number' })}
            {input('Price list to (₹)', s.priceMax, (v) => setTop('priceMax', v), { type: 'number' })}
            {input('Step (₹)', s.priceStep, (v) => setTop('priceStep', v), { type: 'number' })}
          </div>
          <p className="muted">
            Price dropdown will show:{' '}
            <strong>{priceOptions(s).length ? priceOptions(s).map((p) => `₹${p}`).join(', ') : '(no list — price is typed)'}</strong>, plus "Custom…" to type any value.
          </p>
          <div className="form-row">
            {input('Default tax rate (%)', s.defaultTaxRate, (v) => setTop('defaultTaxRate', v), { type: 'number', hint: 'Leave 0 for no tax line' })}
            {input('Tax label', s.taxLabel, (v) => setTop('taxLabel', v), { hint: 'e.g. GST, IGST' })}
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={!!s.showAmountInWords} onChange={(e) => setTop('showAmountInWords', e.target.checked)} />
            Show amount in words (e.g. "Rupees Four Thousand … Only")
          </label>
        </>
      )}

      {tab === 'items' && (
        <>
          <p className="muted">Templates become one-click "Add" buttons in the Items section. Delivery details are copied from the previous item automatically.</p>
          {templates.map((t, i) => (
            <div key={t.id} className="template-row">
              <div className="form-group grow">
                <label>Title</label>
                <input type="text" value={t.title} onChange={(e) => updateTemplate(t.id, 'title', e.target.value)} />
              </div>
              <div className="form-group small">
                <label>Price (₹)</label>
                <input type="number" value={t.price} onChange={(e) => updateTemplate(t.id, 'price', e.target.value)} />
              </div>
              <div className="form-group small">
                <label>Default qty</label>
                <input type="text" value={t.quantity} onChange={(e) => updateTemplate(t.id, 'quantity', e.target.value)} />
              </div>
              <div className="template-flags">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!t.isFixedPrice} onChange={(e) => updateTemplate(t.id, 'isFixedPrice', e.target.checked)} />
                  Fixed price
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!t.qtyFromWeight} onChange={(e) => updateTemplate(t.id, 'qtyFromWeight', e.target.checked)} />
                  Qty = weight (tons)
                </label>
              </div>
              <div className="template-actions">
                <button className="btn btn-move" disabled={i === 0} onClick={() => moveTemplate(i, -1)} title="Move up">↑</button>
                <button className="btn btn-move" disabled={i === templates.length - 1} onClick={() => moveTemplate(i, 1)} title="Move down">↓</button>
                <button className="btn btn-sm btn-danger" onClick={() => setTemplates((l) => l.filter((x) => x.id !== t.id))}>✕</button>
              </div>
            </div>
          ))}
          <button
            className="btn"
            onClick={() => setTemplates((l) => [...l, { id: newId(), title: '', price: '', quantity: '', isFixedPrice: false, qtyFromWeight: false }])}
          >
            + Add template
          </button>
        </>
      )}

      {tab === 'backup' && (
        <>
          <p>
            Everything (settings, clients, item templates, saved invoices) is stored in <strong>this browser</strong>.
            Download a backup now and then, or to move your data to another computer/browser.
          </p>
          <div className="button-row">
            <button className="btn btn-success" onClick={() => downloadJSON(exportAllData(), `invoice-backup-${new Date().toISOString().slice(0, 10)}.json`)}>
              Download backup
            </button>
            <button className="btn" onClick={() => fileRef.current.click()}>Restore from backup…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          </div>
          <p className="muted">Restoring replaces the current data with what's in the file.</p>
        </>
      )}
    </Modal>
  );
};

export default SettingsPanel;
