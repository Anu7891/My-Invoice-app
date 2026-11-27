import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
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

const ScanSlip = ({ initialFiles, clients, settings, itemTemplates, suggestions, currentClientId, lastItem, onAdd, onClose }) => {
  const [scans, setScans] = useState([]); // {id, file, url, status, progress, text, fields, error}
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const busyRef = useRef(false);
  const scansRef = useRef(scans);
  scansRef.current = scans;

  // Which item templates to create for each slip (default: the weight-based one, e.g. Transport)
  const defaultTpl = itemTemplates.find((t) => t.qtyFromWeight) || itemTemplates[0];
  const [chosen, setChosen] = useState(() => (defaultTpl ? { [defaultTpl.id]: true } : {}));

  const patch = (id, p) => setScans((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const patchFields = (id, p) => setScans((list) => list.map((s) => (s.id === id ? { ...s, fields: { ...s.fields, ...p } } : s)));

  // Process the queue one image at a time
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
          // Pick the reading that found the most details
          let best = { text: texts[0] || '', fields: parse(texts[0] || '') };
          texts.slice(1).forEach((t) => {
            const f = parse(t);
            if (scoreFields(f) > scoreFields(best.fields)) best = { text: t, fields: f };
          });
          const f = best.fields;
          const found = { truckNo: !!f.truckNo, date: !!f.date, net: !!f.net, deliveredTo: !!f.deliveredTo, fromLocation: !!f.fromLocation, toLocation: !!f.toLocation };
          // Smart defaults for anything not found (most trips use the same truck & route)
          const fields = {
            ...f,
            truckNo: f.truckNo || settings.defaultTruckNo || '',
            date: f.date || fileDateISO(next.file) || todayISO(),
            deliveredTo: f.deliveredTo || (lastItem && lastItem.deliveredTo) || '',
            fromLocation: f.fromLocation || (lastItem && lastItem.fromLocation) || '',
            toLocation: f.toLocation || (lastItem && lastItem.toLocation) || '',
            net: f.net ?? '',
          };
          patch(next.id, { status: 'done', progress: 1, text: best.text, fields, found, nothingFound: scoreFields(f) < 2 });
        } catch (e) {
          patch(next.id, { status: 'error', error: e.message || 'Could not read this image.' });
        }
        // let React flush state before picking the next one
        await new Promise((r) => setTimeout(r, 30));
      }
    } finally {
      busyRef.current = false;
    }
  }, [clients, suggestions.places, suggestions.deliveredTo, settings.defaultTruckNo, lastItem]);

  const addFiles = useCallback((files) => {
    const imgs = Array.from(files || []).filter(isImage);
    if (!imgs.length) return;
    setScans((list) => [
      ...list,
      ...imgs.map((file) => ({ id: newId(), file, url: URL.createObjectURL(file), status: 'queued', progress: 0, text: '', fields: null })),
    ]);
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length) addFiles(initialFiles);
  }, [initialFiles, addFiles]);

  useEffect(() => {
    if (scans.some((s) => s.status === 'queued')) runQueue();
  }, [scans, runQueue]);

  // Paste screenshots straight into the window
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

  const rotateAndRetry = (id) =>
    setScans((list) =>
      list.map((s) => (s.id === id ? { ...s, rotate: ((s.rotate || 0) + 90) % 360, status: 'queued', progress: 0 } : s))
    );

  const cls = (s, key) => (s.found && s.found[key] ? 'found' : s.fields[key] ? 'default' : 'missing');

  const remove = (id) =>
    setScans((list) => {
      const s = list.find((x) => x.id === id);
      if (s) URL.revokeObjectURL(s.url);
      return list.filter((x) => x.id !== id);
    });

  const ready = scans.filter((s) => s.status === 'done');
  const selectedTemplates = itemTemplates.filter((t) => chosen[t.id]);
  const detectedClientId = ready.map((s) => s.fields.clientId).find(Boolean);
  const detectedClient = clients.find((c) => c.id === detectedClientId);
  const [useDetectedClient, setUseDetectedClient] = useState(true);

  const addToInvoice = () => {
    const items = [];
    ready.forEach((s) => {
      const f = s.fields;
      const net = parseFloat(f.net) || 0;
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

  const itemCount = ready.length * selectedTemplates.length;

  return (
    <Modal
      title="📷 Scan slips / bills"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="muted grow-left">
            {scans.length > 0 && `${ready.length} of ${scans.length} read`}
          </span>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" disabled={!itemCount} onClick={addToInvoice}>
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
        <div className="dropzone-icon">🧾</div>
        <div>
          <strong>
            {scans.length
              ? `${scans.length} photo${scans.length === 1 ? '' : 's'} added — add as many more as you like`
              : 'Add photos of weighbridge slips, challans or bills'}
          </strong>
          <div className="muted">
            Select many at once (Ctrl+click on computer, long-press on phone), drag &amp; drop, or paste (Ctrl+V).
            Each photo becomes its own trip.
          </div>
        </div>
        <div className="dropzone-buttons">
          <button className="btn" onClick={() => fileRef.current.click()}>
            {scans.length ? '＋ Add more photos' : '🖼 Choose photos'}
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

          <div className="scan-list">
            {scans.map((s) => (
              <div key={s.id} className={`scan-card status-${s.status}`}>
                <div className="scan-thumb">
                  <a href={s.url} target="_blank" rel="noreferrer" title="Open full image">
                    <img src={s.url} alt="Uploaded slip" style={{ transform: `rotate(${s.rotate || 0}deg)` }} />
                  </a>
                  <button className="scan-remove" onClick={() => remove(s.id)} title="Remove">✕</button>
                  {(s.status === 'done' || s.status === 'error') && (
                    <button className="scan-rotate" onClick={() => rotateAndRetry(s.id)} title="Rotate the photo 90° and read it again">↻ Rotate &amp; re-read</button>
                  )}
                </div>

                <div className="scan-body">
                  {(s.status === 'queued' || s.status === 'reading') && (
                    <div className="scan-progress">
                      <div className="muted">{s.status === 'queued' ? 'Waiting…' : 'Reading the image…'}</div>
                      <div className="progress"><div style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>
                      <div className="skeleton" /><div className="skeleton short" />
                    </div>
                  )}

                  {s.status === 'error' && <div className="scan-error">⚠ {s.error}</div>}

                  {s.status === 'done' && (
                    <>
                      {s.nothingFound && (
                        <div className="scan-hint">
                          Couldn't read the details from this photo — handwritten slips can't be read reliably.
                          Truck, date and places are pre-filled; just type the <strong>net weight</strong>.
                          For printed slips, try <em>↻ Rotate &amp; re-read</em> or a closer, straighter photo.
                        </div>
                      )}
                      <div className="scan-grid">
                        <label>Truck no
                          <input className={cls(s, 'truckNo')} list="dl-trucks" value={s.fields.truckNo} onChange={(e) => patchFields(s.id, { truckNo: e.target.value.toUpperCase() })} />
                        </label>
                        <label>Date
                          <input type="date" className={cls(s, 'date')} value={s.fields.date} onChange={(e) => patchFields(s.id, { date: e.target.value })} />
                        </label>
                        <label>Net weight (kg)
                          <input inputMode="decimal" autoFocus={!s.found.net && s.nothingFound} placeholder="e.g. 29065" className={cls(s, 'net')} value={s.fields.net ?? ''} onChange={(e) => patchFields(s.id, { net: e.target.value })} />
                        </label>
                        <label>Delivered to
                          <input list="dl-delivered" className={cls(s, 'deliveredTo')} value={s.fields.deliveredTo} onChange={(e) => patchFields(s.id, { deliveredTo: e.target.value })} />
                        </label>
                        <label>From
                          <input list="dl-places" className={cls(s, 'fromLocation')} value={s.fields.fromLocation} onChange={(e) => patchFields(s.id, { fromLocation: e.target.value })} />
                        </label>
                        <label>To
                          <input list="dl-places" className={cls(s, 'toLocation')} value={s.fields.toLocation} onChange={(e) => patchFields(s.id, { toLocation: e.target.value })} />
                        </label>
                      </div>
                      {(s.fields.gross || s.fields.tare) && (
                        <div className="muted">
                          Gross {s.fields.gross ?? '—'} kg · Tare {s.fields.tare ?? '—'} kg
                          {s.fields.weightMismatch && <span className="warn"> · Net doesn't match gross − tare, please check</span>}
                        </div>
                      )}
                      <details className="scan-text">
                        <summary>Show text read from image</summary>
                        <pre>{s.text.trim() || '(no text found — try a sharper, straighter photo)'}</pre>
                      </details>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="muted">
            <span className="legend found">Read from photo</span> <span className="legend default">Pre-filled default</span>{' '}
            <span className="legend missing">Please fill in</span> — give it a quick check before adding.
          </p>
        </>
      )}
    </Modal>
  );
};

export default ScanSlip;
