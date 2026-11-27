import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import ZoomImage from './ZoomImage';
import './ScanSlip.css';
import { readImageText, parseSlip, scoreFields } from '../utils/scan';
import { itemFromTemplate, newId, todayISO } from '../utils/invoice';

const isImage = (f) => f && f.type && f.type.startsWith('image/');

const fileDateISO = (file) => {
  if (!file.lastModified) return '';
  const d = new Date(file.lastModified);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

const FIELD_KEYS = ['truckNo', 'date', 'net', 'deliveredTo', 'fromLocation', 'toLocation'];

/**
 * Flow: upload photo(s) → each photo opens big & zoomable next to the boxes →
 * the reader fills what it can in the background (never overwriting what you typed) →
 * you check / type the values while zooming into the slip → Add to invoice.
 */
const ScanSlip = ({ initialFiles, clients, settings, itemTemplates, suggestions, currentClientId, lastItem, onAdd, onClose }) => {
  const [scans, setScans] = useState([]); // {id, file, url, rotate, status, progress, text, fields, found, touched}
  const [activeId, setActiveId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const netRef = useRef(null);
  const addBtnRef = useRef(null);
  const busyRef = useRef(false);
  const scansRef = useRef(scans);
  scansRef.current = scans;

  const defaultTpl = itemTemplates.find((t) => t.qtyFromWeight) || itemTemplates[0];
  const [chosen, setChosen] = useState(() => (defaultTpl ? { [defaultTpl.id]: true } : {}));
  const [useDetectedClient, setUseDetectedClient] = useState(true);

  const patch = (id, p) => setScans((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));

  // Typing in a box marks it as "yours" — the reader will not overwrite it.
  const setField = (id, key, value) =>
    setScans((list) =>
      list.map((s) =>
        s.id === id ? { ...s, fields: { ...s.fields, [key]: value }, touched: { ...s.touched, [key]: true } } : s
      )
    );

  const defaultsFor = useCallback(
    (file) => ({
      truckNo: settings.defaultTruckNo || '',
      date: fileDateISO(file) || todayISO(),
      net: '',
      deliveredTo: (lastItem && lastItem.deliveredTo) || '',
      fromLocation: (lastItem && lastItem.fromLocation) || '',
      toLocation: (lastItem && lastItem.toLocation) || '',
      gross: null,
      tare: null,
      clientId: '',
    }),
    [settings.defaultTruckNo, lastItem]
  );

  // ---- background reading, one photo at a time ---------------------------
  const runQueue = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      for (;;) {
        const next = scansRef.current.find((s) => s.status === 'queued');
        if (!next) break;
        patch(next.id, { status: 'reading', progress: 0.02 });
        try {
          const parse = (t) => parseSlip(t, { clients, places: suggestions.places, deliveredTo: suggestions.deliveredTo });
          const texts = await readImageText(next.file, (p) => patch(next.id, { progress: p }), {
            rotate: next.rotate || 0,
            isGoodEnough: (t) => {
              const f = parse(t);
              return !!(f.net && f.date);
            },
          });
          let best = { text: texts[0] || '', fields: parse(texts[0] || '') };
          texts.slice(1).forEach((t) => {
            const f = parse(t);
            if (scoreFields(f) > scoreFields(best.fields)) best = { text: t, fields: f };
          });
          const f = best.fields;
          setScans((list) =>
            list.map((s) => {
              if (s.id !== next.id) return s;
              const fields = { ...s.fields, gross: f.gross, tare: f.tare, weightMismatch: f.weightMismatch, clientId: f.clientId };
              const found = {};
              FIELD_KEYS.forEach((k) => {
                if (f[k] && !s.touched[k]) {
                  fields[k] = f[k];
                  found[k] = true;
                }
              });
              return { ...s, status: 'done', progress: 1, text: best.text, fields, found, nothingFound: scoreFields(f) < 2 };
            })
          );
        } catch (e) {
          patch(next.id, { status: 'error', error: e.message || 'Could not read this image.' });
        }
        await new Promise((r) => setTimeout(r, 30));
      }
    } finally {
      busyRef.current = false;
    }
  }, [clients, suggestions.places, suggestions.deliveredTo]);

  const addFiles = useCallback(
    (files) => {
      const imgs = Array.from(files || []).filter(isImage);
      if (!imgs.length) return;
      const added = imgs.map((file) => ({
        id: newId(),
        file,
        url: URL.createObjectURL(file),
        rotate: 0,
        status: 'queued',
        progress: 0,
        text: '',
        fields: defaultsFor(file),
        found: {},
        touched: {},
      }));
      setScans((list) => [...list, ...added]);
      setActiveId((cur) => cur || added[0].id);
    },
    [defaultsFor]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length) addFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    if (scans.some((s) => s.status === 'queued')) runQueue();
  }, [scans, runQueue]);

  useEffect(() => {
    const onPaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.some(isImage)) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  useEffect(() => () => scansRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);

  // ---- actions ------------------------------------------------------------
  const remove = (id) => {
    const i = scans.findIndex((x) => x.id === id);
    if (i < 0) return;
    URL.revokeObjectURL(scans[i].url);
    const rest = scans.filter((x) => x.id !== id);
    setScans(rest);
    if (activeId === id) setActiveId(rest.length ? rest[Math.min(i, rest.length - 1)].id : null);
  };

  const rotateAndRetry = (id) =>
    setScans((list) => list.map((s) => (s.id === id ? { ...s, rotate: ((s.rotate || 0) + 90) % 360, status: 'queued', progress: 0 } : s)));

  const activeIndex = scans.findIndex((s) => s.id === activeId);
  const active = scans[activeIndex];

  const goTo = (i) => {
    if (i >= 0 && i < scans.length) setActiveId(scans[i].id);
  };

  // Enter in the weight box → next slip (or the Add button on the last one)
  const onFieldKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (activeIndex < scans.length - 1) goTo(activeIndex + 1);
    else addBtnRef.current && addBtnRef.current.focus();
  };

  useEffect(() => {
    // focus the weight box whenever a slip is opened
    const t = setTimeout(() => netRef.current && netRef.current.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [activeId]);

  const selectedTemplates = itemTemplates.filter((t) => chosen[t.id]);
  const detectedClientId = scans.map((s) => s.fields.clientId).find(Boolean);
  const detectedClient = clients.find((c) => c.id === detectedClientId);
  const missingWeight = selectedTemplates.some((t) => t.qtyFromWeight)
    ? scans.filter((s) => !(parseFloat(s.fields.net) > 0)).length
    : 0;
  const itemCount = scans.length * selectedTemplates.length;

  const addToInvoice = () => {
    if (missingWeight && !window.confirm(`${missingWeight} slip(s) have no net weight yet. Add anyway?`)) return;
    const items = [];
    scans.forEach((s) => {
      const f = s.fields;
      const net = parseFloat(String(f.net).replace(/,/g, '')) || 0;
      selectedTemplates.forEach((t) => {
        const base = itemFromTemplate(t, settings, null);
        const item = {
          ...base,
          deliveredTo: f.deliveredTo || '',
          deliveryDate: f.date || base.deliveryDate,
          fromLocation: f.fromLocation || '',
          toLocation: f.toLocation || '',
          truckNo: f.truckNo || base.truckNo,
        };
        if (t.qtyFromWeight && net) {
          item.weight = `${Math.round(net)}kg`;
          item.quantity = Math.round(net) / 1000;
        }
        items.push(item);
      });
    });
    onAdd({
      items,
      clientId: detectedClient && useDetectedClient && detectedClient.id !== currentClientId ? detectedClient.id : null,
    });
    onClose();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const cls = (s, key) => (s.found[key] ? 'found' : s.touched[key] ? 'typed' : s.fields[key] ? 'default' : 'missing');

  const statusLabel = (s) =>
    s.status === 'queued'
      ? 'Waiting to read…'
      : s.status === 'reading'
      ? `Reading… ${Math.round(s.progress * 100)}%`
      : s.status === 'error'
      ? 'Could not read'
      : s.nothingFound
      ? 'Read — please type the values'
      : 'Read ✓';

  return (
    <Modal
      title="📷 Scan slips / bills"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="muted grow-left">
            {scans.length > 0 && `${scans.length} slip${scans.length === 1 ? '' : 's'}`}
            {missingWeight > 0 && <span className="warn"> · {missingWeight} without weight</span>}
          </span>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button ref={addBtnRef} className="btn btn-success" disabled={!itemCount} onClick={addToInvoice}>
            Add {itemCount || ''} item{itemCount === 1 ? '' : 's'} to invoice
          </button>
        </>
      }
    >
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''} ${scans.length ? 'compact' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {!scans.length && <div className="dropzone-icon">🧾</div>}
        <div>
          <strong>
            {scans.length ? 'Add more slips' : 'Add photos of weighbridge slips, challans or bills'}
          </strong>
          <div className="muted">
            Select many at once, drag &amp; drop, or paste (Ctrl+V). Each photo opens big so you can zoom in and type the values.
          </div>
        </div>
        <div className="dropzone-buttons">
          <button className="btn" onClick={() => fileRef.current.click()}>
            {scans.length ? '＋ Add photos' : '🖼 Choose photos'}
          </button>
          <button className="btn btn-light camera-btn" onClick={() => cameraRef.current.click()}>
            {scans.length ? '📷 Take another' : '📷 Take photo'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {scans.length > 0 && (
        <>
          <div className="scan-options">
            <span className="muted">For each slip add:</span>
            {itemTemplates.map((t) => (
              <label key={t.id} className={`chip ${chosen[t.id] ? 'chip-on' : ''}`}>
                <input type="checkbox" checked={!!chosen[t.id]} onChange={(e) => setChosen((c) => ({ ...c, [t.id]: e.target.checked }))} />
                {t.title}
              </label>
            ))}
            {detectedClient && detectedClient.id !== currentClientId && (
              <label className={`chip ${useDetectedClient ? 'chip-on' : ''}`}>
                <input type="checkbox" checked={useDetectedClient} onChange={(e) => setUseDetectedClient(e.target.checked)} />
                Bill to {detectedClient.name}
              </label>
            )}
          </div>

          {scans.length > 1 && (
            <div className="scan-thumbs">
              {scans.map((s, i) => (
                <button
                  key={s.id}
                  className={`scan-thumb-btn ${s.id === activeId ? 'active' : ''} ${parseFloat(s.fields.net) > 0 ? 'ok' : 'todo'}`}
                  onClick={() => setActiveId(s.id)}
                  title={`Slip ${i + 1}`}
                >
                  <img src={s.url} alt="" style={{ transform: `rotate(${s.rotate}deg)` }} />
                  <span className="num">{i + 1}</span>
                  <span className="dot" />
                </button>
              ))}
            </div>
          )}

          {active && (
            <div className="scan-panel" key={active.id}>
              <div className="scan-viewer">
                <ZoomImage src={active.url} rotate={active.rotate} onRotate={() => rotateAndRetry(active.id)} />
              </div>

              <div className="scan-form">
                <div className="scan-form-head">
                  <strong>Slip {activeIndex + 1} of {scans.length}</strong>
                  <span className={`scan-status status-${active.status}`}>{statusLabel(active)}</span>
                </div>
                {(active.status === 'queued' || active.status === 'reading') && (
                  <div className="progress thin"><div style={{ width: `${Math.round(active.progress * 100)}%` }} /></div>
                )}
                {active.status === 'error' && <div className="scan-error">⚠ {active.error} — you can still type the values.</div>}
                {active.status === 'done' && active.nothingFound && (
                  <div className="scan-hint">
                    Couldn't read the values (handwritten slips can't be read reliably). Zoom into the photo and type the
                    <strong> net weight</strong> — truck, date and places are pre-filled.
                  </div>
                )}

                <div className="scan-grid">
                  <label className="span-2 big">Net weight (kg)
                    <input
                      ref={netRef}
                      inputMode="decimal"
                      placeholder="e.g. 29065"
                      className={cls(active, 'net')}
                      value={active.fields.net ?? ''}
                      onChange={(e) => setField(active.id, 'net', e.target.value.replace(/[^\d.,]/g, ''))}
                      onKeyDown={onFieldKeyDown}
                    />
                  </label>
                  <label>Truck no
                    <input list="dl-trucks" className={cls(active, 'truckNo')} value={active.fields.truckNo} onChange={(e) => setField(active.id, 'truckNo', e.target.value.toUpperCase())} onKeyDown={onFieldKeyDown} />
                  </label>
                  <label>Date
                    <input type="date" className={cls(active, 'date')} value={active.fields.date} onChange={(e) => setField(active.id, 'date', e.target.value)} />
                  </label>
                  <label className="span-2">Delivered to
                    <input list="dl-delivered" className={cls(active, 'deliveredTo')} value={active.fields.deliveredTo} onChange={(e) => setField(active.id, 'deliveredTo', e.target.value)} onKeyDown={onFieldKeyDown} />
                  </label>
                  <label>From
                    <input list="dl-places" className={cls(active, 'fromLocation')} value={active.fields.fromLocation} onChange={(e) => setField(active.id, 'fromLocation', e.target.value)} onKeyDown={onFieldKeyDown} />
                  </label>
                  <label>To
                    <input list="dl-places" className={cls(active, 'toLocation')} value={active.fields.toLocation} onChange={(e) => setField(active.id, 'toLocation', e.target.value)} onKeyDown={onFieldKeyDown} />
                  </label>
                </div>

                {(active.fields.gross || active.fields.tare) && (
                  <div className="muted">
                    Gross {active.fields.gross ?? '—'} kg · Tare {active.fields.tare ?? '—'} kg
                    {active.fields.weightMismatch && <span className="warn"> · Net doesn't match gross − tare, please check</span>}
                  </div>
                )}

                <p className="muted legend-row">
                  <span className="legend found">Read from photo</span>
                  <span className="legend default">Pre-filled</span>
                  <span className="legend typed">Typed by you</span>
                  <span className="legend missing">To fill</span>
                </p>

                {active.text && (
                  <details className="scan-text">
                    <summary>Show text read from image</summary>
                    <pre>{active.text.trim() || '(no text found)'}</pre>
                  </details>
                )}

                <div className="scan-nav">
                  <button className="btn btn-sm btn-light" disabled={activeIndex <= 0} onClick={() => goTo(activeIndex - 1)}>← Previous</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(active.id)}>Remove slip</button>
                  <button className="btn btn-sm" disabled={activeIndex >= scans.length - 1} onClick={() => goTo(activeIndex + 1)}>Next →</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ScanSlip;
