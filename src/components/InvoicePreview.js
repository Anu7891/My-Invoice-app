import React from 'react';
import './InvoicePreview.css';

const InvoicePreview = ({ invoiceData, formatDate, formatCurrency }) => {
  const subtotal = invoiceData.items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    if (item.isFixedPrice) {
      return sum + price;
    } else {
      const quantity = parseFloat(item.quantity) || 0;
      return sum + (quantity * price);
    }
  }, 0);

  return (
    <div className="preview-panel">
      <h2>Invoice Preview</h2>
      <div className="invoice-preview">
        <div className="header-container">
          <div className="left-header">
            {invoiceData.companyName || 'COMPANY NAME'}
          </div>
          <div className="right-header">
            <div className="invoice-title">Invoice</div>
            <div className="company-details">
              <strong>{invoiceData.companyName || 'COMPANY NAME'}</strong><br />
              {invoiceData.companyAddress.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}<br />
                </React.Fragment>
              ))}<br />
              PAN NO: {invoiceData.panNumber || 'PAN'}<br />
              {invoiceData.phoneNumber || 'Phone'}<br />
              {invoiceData.email || 'Email'}
            </div>
          </div>
        </div>

        <div className="bill-to-container">
          <div className="bill-to">
            <h3>BILL TO</h3>
            <div>
              <strong>{invoiceData.clientName || 'Client Name'}</strong><br />
              {invoiceData.clientAddress.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}<br />
                </React.Fragment>
              ))}
              {invoiceData.gstNumber && invoiceData.gstNumber.trim() !== '' && (
                <>
                  Tax Reg No. : {invoiceData.gstNumber}<br />
                </>
              )}
              {invoiceData.clientEmail && invoiceData.clientEmail.trim() !== '' && (
                <>
                  {invoiceData.clientEmail}<br />
                </>
              )}
              {invoiceData.clientPhone && invoiceData.clientPhone.trim() !== '' && (
                <>
                  {invoiceData.clientPhone}
                </>
              )}
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
                      {item.fromLocation && item.toLocation && <div><strong>From:</strong> {item.fromLocation} to {item.toLocation}</div>}
                      {item.truckNo && <div><strong>Truck no:</strong> {item.truckNo}</div>}
                      {item.weight && <div><strong>Weight:</strong> {item.weight}</div>}
                    </div>
                  </td>
                  <td className="quantity-col">{item.quantity}</td>
                  <td className="price-col">{formatCurrency(parseFloat(item.price) || 0)}</td>
                  <td className="amount-col">{formatCurrency(item.isFixedPrice ? (parseFloat(item.price) || 0) : ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              <tr>
                <td>Subtotal</td>
                <td>{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td>Total</td>
                <td>{formatCurrency(subtotal)}</td>
              </tr>
            </table>
            <div className="amount-due">
              <div className="amount-due-label">Amount Due</div>
              <div className="amount-due-value">{formatCurrency(subtotal)}</div>
            </div>
          </div>
        </div>

        <div className="signature-section">
          <div className="agreement-text">
            By signing this document, the customer agrees to the services and conditions described in this document.
            <div className="signature-name">{invoiceData.signatureName || 'SIGNATURE NAME'}</div>
          </div>
          <div className="signature-area">
            <div className="signature-line">
              <div className="signature-space">
                <img src="/images/sign.png" alt="Signature" title="signature" className="actual-signature" />
              </div>
              <div>
                {formatDate(invoiceData.signatureDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
