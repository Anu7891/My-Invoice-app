import React, { useState, useEffect } from 'react';
import './App.css';
import InvoiceEditor from './components/InvoiceEditor';
import InvoicePreview from './components/InvoicePreview';

function App() {
  // Define available clients
  const clients = {
    'saturn': {
      name: 'Saturn Industries',
      address: 'Plot No. 74, Hojiwala Ind. Estate, Opp.\nGate No.2, National Highway 53, Vanz, Choryasi\nSurat Gujarat\nIN',
      gstNumber: 'GSTIN: 24ABXFM0127A1ZL',
      phone: '9879954421, 9879964421',
      email: 'saturn@hareshpipes.in'
    },
    'abhishek': {
      name: 'Abhishek Inspat Pvt. Ltd.',
      address: 'Plot No. A-25/1, A-24/2\nGIDC, Ichchapore\nSurat, Gujarat\nIN',
      gstNumber: 'GSTIN: 24AABCA9858J1ZC',
      phone: '',
      email: ''
    },
    'giriraj':{
      name: 'Shree Giriraj Metals & Minerals',
      address: 'Plot No. C 5/6, Road No.8, Gate No.1, Hojiwala Industrial Estate,Sachin-Palsana Highway, Surat - 394230',
      gstNumber: 'GSTIN: 24GLUPS8523M1Z1',
      phone: '',
      email: 'sgmm.surat@gmail.com'
    }
  };

  const [selectedClient, setSelectedClient] = useState('saturn');
  const [invoiceData, setInvoiceData] = useState({
    companyName: 'KAILASH SINGH',
    companyAddress: 'Plot No: 88\nNear Bapasitaram Mill\nSachin',
    panNumber: 'AYUPS4946H',
    phoneNumber: '8487854692',
    email: 'singhanubhav8783@gmail.com',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    clientName: clients.saturn.name,
    clientAddress: clients.saturn.address,
    gstNumber: clients.saturn.gstNumber,
    clientPhone: clients.saturn.phone,
    clientEmail: clients.saturn.email,
    bankName: 'INDIAN BANK(SACHIN BRANCH)',
    accountNumber: '524314207',
    ifscCode: 'IDIB000S095',
    signatureName: 'KAILASH SINGH',
    signatureDate: '',
    items: [
      {
        id: 1,
        title: 'Transport',
        deliveredTo: 'Saturn Godown',
        deliveryDate: '2025-09-27',
        fromLocation: 'Vitco (Sachin)',
        toLocation: 'Hojiwala',
        truckNo: 'GJ21T5475',
        weight: '29065kg',
        quantity: 29.065,
        price: 150.00,
        isFixedPrice: false
      },
      {
        id: 2,
        title: 'Weighing Bill',
        deliveredTo: 'Saturn Godown',
        deliveryDate: '2025-09-27',
        fromLocation: 'Vitco (Sachin)',
        toLocation: 'Hojiwala',
        truckNo: 'GJ21T5475',
        weight: '',
        quantity: 1,
        price: 130.00,
        isFixedPrice: false
      }
    ]
  });

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 7);
    
    setInvoiceData(prev => ({
      ...prev,
      invoiceDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      signatureDate: today.toISOString().split('T')[0]
    }));
  }, []);

  const updateInvoiceData = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClientChange = (clientKey) => {
    setSelectedClient(clientKey);
    const client = clients[clientKey];
    setInvoiceData(prev => ({
      ...prev,
      clientName: client.name,
      clientAddress: client.address,
      gstNumber: client.gstNumber,
      clientPhone: client.phone,
      clientEmail: client.email
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      title: '',
      deliveredTo: '',
      deliveryDate: '',
      fromLocation: '',
      toLocation: '',
      truckNo: 'GJ21T5475',
      weight: '',
      quantity: 0,
      price: 0,
      isFixedPrice: false
    };
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (itemId, field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (itemId) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const moveItemUp = (itemId) => {
    setInvoiceData(prev => {
      const items = [...prev.items];
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      if (currentIndex > 0) {
        // Swap with the item above
        [items[currentIndex], items[currentIndex - 1]] = [items[currentIndex - 1], items[currentIndex]];
      }
      
      return {
        ...prev,
        items: items
      };
    });
  };

  const moveItemDown = (itemId) => {
    setInvoiceData(prev => {
      const items = [...prev.items];
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      if (currentIndex < items.length - 1) {
        // Swap with the item below
        [items[currentIndex], items[currentIndex + 1]] = [items[currentIndex + 1], items[currentIndex]];
      }
      
      return {
        ...prev,
        items: items
      };
    });
  };

  const exportToHTML = () => {
    const element = document.createElement('a');
    const file = new Blob([generateHTML()], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `invoice-${invoiceData.invoiceNumber || 'INV-001'}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateHTML());
    printWindow.document.close();
    printWindow.print();
  };

  const generateHTML = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      if (item.isFixedPrice) {
        return sum + price;
      } else {
        const quantity = parseFloat(item.quantity) || 0;
        return sum + (quantity * price);
      }
    }, 0);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoiceData.companyName}</title>
  <style>
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
  </style>
</head>
<body>
  <div class="header-container">
    <div class="left-header">${invoiceData.companyName}</div>
    <div class="right-header">
      <div class="invoice-title">Invoice</div>
      <div class="company-details">
        <strong>${invoiceData.companyName}</strong><br>
        ${invoiceData.companyAddress.replace(/\n/g, '<br>')}<br><br>
        PAN NO: ${invoiceData.panNumber}<br>
        ${invoiceData.phoneNumber}<br>
        ${invoiceData.email}
      </div>
    </div>
  </div>

  <div class="bill-to-container">
    <div class="bill-to">
      <h3>BILL TO</h3>
      <div>
        <strong>${invoiceData.clientName}</strong><br>
        ${invoiceData.clientAddress.replace(/\n/g, '<br>')}<br>
        ${invoiceData.gstNumber && invoiceData.gstNumber.trim() !== '' ? 'Tax Reg No. : ' + invoiceData.gstNumber + '<br>' : ''}
        ${invoiceData.clientEmail && invoiceData.clientEmail.trim() !== '' ? invoiceData.clientEmail + '<br>' : ''}
        ${invoiceData.clientPhone && invoiceData.clientPhone.trim() !== '' ? invoiceData.clientPhone : ''}
      </div>
    </div>
    
    <div class="invoice-details">
      <div><strong>Invoice #</strong> ${invoiceData.invoiceNumber}</div>
      <div><strong>Date</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatDate(invoiceData.invoiceDate)}</div>
      <div><strong>Due date</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatDate(invoiceData.dueDate)}</div>
    </div>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Item</th>
        <th class="quantity-col">Quantity</th>
        <th class="price-col">Price</th>
        <th class="amount-col">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.items.map(item => `
        <tr>
          <td>
            <div class="item-details">
              <div class="item-title">${item.title}</div>
              ${item.deliveredTo ? `<div><strong>Delivered To:</strong> ${item.deliveredTo}</div>` : ''}
              ${item.deliveryDate ? `<div><strong>Date:</strong> ${formatDate(item.deliveryDate)}</div>` : ''}
              ${item.fromLocation && item.toLocation ? `<div><strong>From:</strong> ${item.fromLocation} to ${item.toLocation}</div>` : ''}
              ${item.truckNo ? `<div><strong>Truck no:</strong> ${item.truckNo}</div>` : ''}
              ${item.weight ? `<div><strong>Weight:</strong> ${item.weight}</div>` : ''}
            </div>
          </td>
          <td class="quantity-col">${item.quantity}</td>
          <td class="price-col">${formatCurrency(parseFloat(item.price) || 0)}</td>
          <td class="amount-col">${formatCurrency(item.isFixedPrice ? (parseFloat(item.price) || 0) : ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="bottom-section">
    <div class="payment-instructions">
      <h3>Payment Instructions</h3>
      <div class="bank-details">
        <div>${invoiceData.bankName}</div>
        <div>A/c no: ${invoiceData.accountNumber}</div>
        <div>IFSC CODE: ${invoiceData.ifscCode}</div>
      </div>
    </div>
    
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td>${formatCurrency(subtotal)}</td>
        </tr>
        <tr>
          <td>Total</td>
          <td>${formatCurrency(subtotal)}</td>
        </tr>
      </table>
      <div class="amount-due">
        <div class="amount-due-label">Amount Due</div>
        <div class="amount-due-value">${formatCurrency(subtotal)}</div>
      </div>
    </div>
  </div>

  <div class="signature-section">
    <div class="agreement-text">
      By signing this document, the customer agrees to the services and conditions described in this document.
      <div class="signature-name">${invoiceData.signatureName}</div>
    </div>
    <div class="signature-area">
      <div class="signature-line">
        <div class="signature-space">
          <img src="images/sign.png" alt="Signature" title="signature" class="actual-signature">
        </div>
        <div>${formatDate(invoiceData.signatureDate)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="App">
      <div className="export-buttons">
        <button className="btn btn-success" onClick={exportToHTML}>Export HTML</button>
        <button className="btn" onClick={printInvoice}>Print Invoice</button>
      </div>

      <div className="container">
        <InvoiceEditor
          invoiceData={invoiceData}
          updateInvoiceData={updateInvoiceData}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
          moveItemUp={moveItemUp}
          moveItemDown={moveItemDown}
          selectedClient={selectedClient}
          clients={clients}
          handleClientChange={handleClientChange}
        />
        <InvoicePreview
          invoiceData={invoiceData}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
}

export default App;
