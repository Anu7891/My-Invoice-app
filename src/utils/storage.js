// Small wrapper around localStorage so the app never crashes if storage is
// unavailable (private mode, quota exceeded, etc.).
const PREFIX = 'invoiceApp.';

export const STORAGE_KEYS = {
  settings: 'settings',
  clients: 'clients',
  itemTemplates: 'itemTemplates',
  invoices: 'invoices',
  draft: 'draft',
};

export function loadData(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function saveData(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Could not save', key, e);
    return false;
  }
}

/** Everything in one object, for backup files. */
export function exportAllData() {
  const out = { app: 'my-invoice-app', version: 2, exportedAt: new Date().toISOString() };
  Object.values(STORAGE_KEYS).forEach((k) => {
    out[k] = loadData(k, null);
  });
  return out;
}

export function importAllData(obj) {
  if (!obj || obj.app !== 'my-invoice-app') {
    throw new Error('This file is not a My Invoice App backup.');
  }
  Object.values(STORAGE_KEYS).forEach((k) => {
    if (obj[k] !== undefined && obj[k] !== null) saveData(k, obj[k]);
  });
}
