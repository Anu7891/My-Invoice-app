// ---------------------------------------------------------------------------
// Default data. This is only used the very first time the app opens (or after
// "Reset"). After that, everything is edited from the app itself and saved in
// the browser — no need to change this file to add clients, items, etc.
// ---------------------------------------------------------------------------

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const DEFAULT_SETTINGS = {
  business: {
    companyName: 'KAILASH SINGH',
    companyAddress: 'Plot No: 88\nNear Bapasitaram Mill\nSachin',
    panNumber: 'AYUPS4946H',
    phoneNumber: '8487854692',
    email: 'singhanubhav8783@gmail.com',
  },
  bank: {
    bankName: 'INDIAN BANK(SACHIN BRANCH)',
    accountNumber: '524314207',
    ifscCode: 'IDIB000S095',
  },
  signatureName: 'KAILASH SINGH',
  signatureImage: '', // empty = use public/images/sign.png
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1,
  numberPadding: 3,
  dueDays: 7,
  defaultTaxRate: 0,
  taxLabel: 'GST',
  showAmountInWords: false,
  agreementText:
    'By signing this document, the customer agrees to the services and conditions described in this document.',
  defaultTruckNo: 'GJ21T5475',
};

export const DEFAULT_CLIENTS = [
  {
    id: 'saturn',
    name: 'Saturn Industries',
    address:
      'Plot No. 74, Hojiwala Ind. Estate, Opp.\nGate No.2, National Highway 53, Vanz, Choryasi\nSurat Gujarat\nIN',
    gstNumber: 'GSTIN: 24ABXFM0127A1ZL',
    phone: '9879954421, 9879964421',
    email: 'saturn@hareshpipes.in',
  },
  {
    id: 'abhishek',
    name: 'Abhishek Inspat Pvt. Ltd.',
    address: 'Plot No. A-25/1, A-24/2\nGIDC, Ichchapore\nSurat, Gujarat\nIN',
    gstNumber: 'GSTIN: 24AABCA9858J1ZC',
    phone: '',
    email: '',
  },
  {
    id: 'giriraj',
    name: 'Shree Giriraj Metals & Minerals',
    address:
      'Plot No. C 5/6, Road No.8, Gate No.1, Hojiwala Industrial Estate,\nSachin-Palsana Highway, Surat - 394230',
    gstNumber: 'GSTIN: 24GLUPS8523M1Z1',
    phone: '',
    email: 'sgmm.surat@gmail.com',
  },
];

// Item templates = the "quick add" buttons (e.g. Transport, Weighing Bill).
export const DEFAULT_ITEM_TEMPLATES = [
  { id: 'transport', title: 'Transport', price: 150, quantity: '', isFixedPrice: false, qtyFromWeight: true },
  { id: 'weighing', title: 'Weighing Bill', price: 130, quantity: 1, isFixedPrice: false, qtyFromWeight: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const todayISO = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

export const addDaysISO = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

export const formatInvoiceNumber = (settings, n = settings.nextInvoiceNumber) =>
  `${settings.invoicePrefix || ''}${String(n).padStart(Number(settings.numberPadding) || 0, '0')}`;

/** Pulls the trailing number out of "INV-012" -> 12. */
export const parseInvoiceSeq = (invoiceNumber) => {
  const m = String(invoiceNumber || '').match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
};

export const makeItem = (overrides = {}, settings = DEFAULT_SETTINGS) => ({
  id: newId(),
  title: '',
  deliveredTo: '',
  deliveryDate: todayISO(),
  fromLocation: '',
  toLocation: '',
  truckNo: settings.defaultTruckNo || '',
  weight: '',
  quantity: '',
  price: '',
  isFixedPrice: false,
  qtyFromWeight: false,
  extraDetails: [], // [{ id, label, value }] — any extra line you want on the item
  ...overrides,
});

export const itemFromTemplate = (template, settings, previousItem) =>
  makeItem(
    {
      title: template.title,
      price: template.price,
      quantity: template.quantity ?? '',
      isFixedPrice: !!template.isFixedPrice,
      qtyFromWeight: !!template.qtyFromWeight,
      // Carry delivery details from the previous item — they're usually the same trip.
      ...(previousItem
        ? {
            deliveredTo: previousItem.deliveredTo,
            deliveryDate: previousItem.deliveryDate,
            fromLocation: previousItem.fromLocation,
            toLocation: previousItem.toLocation,
            truckNo: previousItem.truckNo,
          }
        : {}),
    },
    settings
  );

export const createInvoice = (settings, client) => {
  const date = todayISO();
  return {
    id: null, // set when saved to history
    status: 'draft',
    invoiceNumber: formatInvoiceNumber(settings),
    invoiceDate: date,
    dueDate: addDaysISO(date, settings.dueDays),
    ...settings.business,
    ...settings.bank,
    signatureName: settings.signatureName,
    signatureDate: date,
    clientId: client ? client.id : '',
    clientName: client ? client.name : '',
    clientAddress: client ? client.address : '',
    gstNumber: client ? client.gstNumber : '',
    clientPhone: client ? client.phone : '',
    clientEmail: client ? client.email : '',
    taxRate: settings.defaultTaxRate || 0,
    notes: '',
    items: [],
  };
};

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const itemAmount = (item) => (item.isFixedPrice ? num(item.price) : num(item.quantity) * num(item.price));

export const calcTotals = (invoice) => {
  const subtotal = invoice.items.reduce((s, it) => s + itemAmount(it), 0);
  const taxRate = num(invoice.taxRate);
  const tax = Math.round(subtotal * taxRate) / 100;
  return { subtotal, taxRate, tax, total: subtotal + tax };
};

/** "29065kg" / "29,065 kg" -> 29.065 (tons). Returns null if not a number. */
export const weightToTons = (weight) => {
  const s = String(weight || '').toLowerCase().replace(/,/g, '').trim();
  const m = s.match(/^([\d.]+)\s*(kg|kgs|t|ton|tons|mt)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = m[2] || 'kg';
  return unit.startsWith('k') ? Math.round(n) / 1000 : n;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatCurrency = (amount) =>
  '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Indian-system amount in words (Lakh / Crore).
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`);
const threeDigits = (n) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
};
const intToWords = (n) => {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${intToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
};
export const amountInWords = (amount) => {
  const rounded = Math.round(Number(amount || 0) * 100);
  const rupees = Math.floor(rounded / 100);
  const paise = rounded % 100;
  return `Rupees ${intToWords(rupees)}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
};
