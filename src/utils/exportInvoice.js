// Styles used for the exported / printed invoice (kept separate from the
// on-screen editor styles so the printed page looks exactly the same every time).
const PRINT_CSS = `
    body { font-family: Arial, sans-serif; margin: 40px; color: #000; line-height: 1.4; }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .left-header { font-size: 24px; font-weight: bold; }
    .right-header { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .company-details { font-size: 14px; line-height: 1.3; }
    .bill-to-container { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .bill-to { flex: 1; background-color: #f5f5f5; padding: 15px; margin-right: 0px; }
    .bill-to h3 { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; }
    .invoice-details { flex: 0 0 200px; text-align: right; background-color: #f5f5f5; padding: 15px; }
    .invoice-details div { margin-bottom: 8px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .details-table th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; }
    .details-table td { border: 1px solid #ddd; padding: 12px; vertical-align: top; }
    .details-table .quantity-col, .details-table .price-col, .details-table .amount-col { text-align: right; width: 100px; }
    .item-details { line-height: 1.3; }
    .item-title { font-weight: bold; margin-bottom: 5px; }
    .bottom-section { display: flex; justify-content: space-between; margin-top: 30px; }
    .payment-instructions { flex: 1; margin-right: 20px; }
    .payment-instructions h3 { margin: 0 0 15px 0; font-size: 16px; font-weight: bold; }
    .bank-details div { margin-bottom: 5px; color: #666; }
    .totals-section { flex: 0 0 300px; text-align: right; }
    .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .totals-table td { padding: 8px 0; border-bottom: 1px solid #ddd; }
    .totals-table td:first-child { text-align: left; padding-right: 40px; }
    .totals-table td:last-child { text-align: right; font-weight: bold; }
    .amount-due { background-color: #f5f5f5; padding: 15px; margin-top: 10px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
    .amount-due-label { font-weight: bold; }
    .amount-due-value { font-size: 20px; font-weight: bold; color: #000; }
    .signature-section { margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; }
    .agreement-text { font-size: 14px; color: #333; text-align: left; }
    .signature-area { display: flex; justify-content: flex-start; }
    .signature-line { width: 300px; text-align: left; }
    .signature-space { border-bottom: 2px solid #000; margin-bottom: 10px; position: relative; display: flex; align-items: flex-end; padding-bottom: 5px; min-height: 40px; }
    .actual-signature { max-height: 100px; max-width: 300px; height: auto; width: auto; object-fit: contain; }
    .signature-name { font-weight: bold; font-size: 16px; color: #000; margin-top: 10px; }
  
    .totals-table .tax-row td { font-weight: normal; }
    .amount-words { margin-top: 10px; font-size: 13px; font-style: italic; text-align: left; }
    .invoice-notes { margin-top: 20px; font-size: 14px; white-space: pre-line; }
    .table-scroll-wrapper { overflow: visible; }
    @page { margin: 12mm; }
    @media print { body { margin: 0; } }
`;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Turns an image URL into a data: URL so the exported file works on its own. */
const toDataURL = async (src) => {
  if (!src || src.startsWith('data:')) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(src);
      r.readAsDataURL(blob);
    });
  } catch (e) {
    return src;
  }
};

/** Builds a complete standalone HTML document from the live preview element. */
export async function buildInvoiceHTML(previewEl, title) {
  const clone = previewEl.cloneNode(true);
  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      img.setAttribute('src', await toDataURL(img.getAttribute('src')));
    })
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${clone.innerHTML}
</body>
</html>`;
}

export async function downloadInvoiceHTML(previewEl, title, filename) {
  const html = await buildInvoiceHTML(previewEl, title);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function printInvoice(previewEl, title) {
  // Open the window synchronously (before any await) so pop-up blockers allow it.
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups for this site to print the invoice.');
    return;
  }
  const html = await buildInvoiceHTML(previewEl, title);
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Images are inlined as data URLs, so a short delay is enough for layout.
  setTimeout(() => {
    try { w.focus(); w.print(); } catch (e) { /* ignore */ }
  }, 400);
}

export function downloadJSON(obj, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
