import React, { forwardRef } from 'react';
import './InvoicePreview.css';
import { amountInWords, calcTotals, formatCurrency, formatDate, itemAmount, num } from '../utils/invoice';

const Lines = ({ text }) =>
  String(text || '')
    .split('\n')
    .map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ));

// The element with ref is what gets exported / printed.
const InvoicePreview = forwardRef(({ invoiceData, settings }, ref) => {
  const { subtotal, taxRate, tax, total } = calcTotals(invoiceData);
  const signatureSrc = settings.signatureImage || `${process.env.PUBLIC_URL || ''}/images/sign.png`;

  return (
    <div className="preview-panel">
      <h2>Invoice Preview</h2>
      <div className="invoice-preview" ref={ref}>
        <div className="header-container">
          <div className="left-header">{invoiceData.companyName || 'COMPANY NAME'}</div>
          <div className="right-header">
            <div className="invoice-title">Invoice</div>
            <div className="company-details">
              <strong>{invoiceData.companyName || 'COMPANY NAME'}</strong>
              <br />
              <Lines text={invoiceData.companyAddress} />
              <br />
              {invoiceData.panNumber && (
                <>
                  PAN NO: {invoiceData.panNumber}
                  <br />
                </>
              )}
              {invoiceData.phoneNumber && (
                <>
                  {invoiceData.phoneNumber}
                  <br />
                </>
              )}
              {invoiceData.email}
            </div>
          </div>
        </div>

        <div className="bill-to-container">
          <div className="bill-to">
            <h3>BILL TO</h3>
            <div>
              <strong>{invoiceData.clientName || 'Client Name'}</strong>
              <br />
              <Lines text={invoiceData.clientAddress} />
              {invoiceData.gstNumber && invoiceData.gstNumber.trim() !== '' && (
                <>
                  Tax Reg No. : {invoiceData.gstNumber}
                  <br />
                </>
              )}
              {invoiceData.clientEmail && invoiceData.clientEmail.trim() !== '' && (
                <>
                  {invoiceData.clientEmail}
                  <br />
                </>
              )}
              {invoiceData.clientPhone && invoiceData.clientPhone.trim() !== '' && <>{invoiceData.clientPhone}</>}
            </div>
          </div>

          <div className="invoice-details">
            <div><strong>Invoice #</strong> {invoiceData.invoiceNumber}</div>
            <div><strong>Date</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDate(invoiceData.invoiceDate)}</div>
            <div><strong>Due date</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDate(invoiceData.dueDate)}</div>
          </div>
        </div>

        <div className="table-scroll-wrapper">
          <table className="details-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="quantity-col">Quantity</th>
                <th className="price-col">Price</th>
                <th className="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="item-details">
                      <div className="item-title">{item.title}</div>
                      {item.deliveredTo && <div><strong>Delivered To:</strong> {item.deliveredTo}</div>}
                      {item.deliveryDate && <div><strong>Date:</strong> {formatDate(item.deliveryDate)}</div>}
                      {item.fromLocation && item.toLocation && (
                        <div><strong>From:</strong> {item.fromLocation} to {item.toLocation}</div>
                      )}
                      {item.fromLocation && !item.toLocation && <div><strong>From:</strong> {item.fromLocation}</div>}
                      {!item.fromLocation && item.toLocation && <div><strong>To:</strong> {item.toLocation}</div>}
                      {item.truckNo && <div><strong>Truck no:</strong> {item.truckNo}</div>}
                      {item.weight && <div><strong>Weight:</strong> {item.weight}</div>}
                      {(item.extraDetails || [])
                        .filter((d) => d.label || d.value)
                        .map((d) => (
                          <div key={d.id}>
                            {d.label && <strong>{d.label}:</strong>} {d.value}
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="quantity-col">{item.quantity}</td>
                  <td className="price-col">{formatCurrency(num(item.price))}</td>
                  <td className="amount-col">{formatCurrency(itemAmount(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoiceData.notes && invoiceData.notes.trim() && <div className="invoice-notes">{invoiceData.notes}</div>}

        <div className="bottom-section">
          <div className="payment-instructions">
            <h3>Payment Instructions</h3>
            <div className="bank-details">
              <div>{invoiceData.bankName || 'BANK NAME'}</div>
              <div>A/c no: {invoiceData.accountNumber || 'Account Number'}</div>
              <div>IFSC CODE: {invoiceData.ifscCode || 'IFSC Code'}</div>
            </div>
          </div>

          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td>{formatCurrency(subtotal)}</td>
                </tr>
                {taxRate > 0 && (
                  <tr className="tax-row">
                    <td>{settings.taxLabel || 'Tax'} ({taxRate}%)</td>
                    <td>{formatCurrency(tax)}</td>
                  </tr>
                )}
                <tr>
                  <td>Total</td>
                  <td>{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
            <div className="amount-due">
              <div className="amount-due-label">Amount Due</div>
              <div className="amount-due-value">{formatCurrency(total)}</div>
            </div>
            {settings.showAmountInWords && <div className="amount-words">{amountInWords(total)}</div>}
          </div>
        </div>

        <div className="signature-section">
          <div className="agreement-text">
            {settings.agreementText}
            <div className="signature-name">{invoiceData.signatureName || 'SIGNATURE NAME'}</div>
          </div>
          <div className="signature-area">
            <div className="signature-line">
              <div className="signature-space">
                <img src={signatureSrc} alt="Signature" title="signature" className="actual-signature" />
              </div>
              <div>{formatDate(invoiceData.signatureDate)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InvoicePreview;
