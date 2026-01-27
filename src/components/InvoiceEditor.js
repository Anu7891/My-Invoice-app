import React from 'react';
import './InvoiceEditor.css';

const InvoiceEditor = ({ invoiceData, updateInvoiceData, addItem, updateItem, removeItem, moveItemUp, moveItemDown, selectedClient, clients, handleClientChange }) => {
  return (
    <div className="editor-panel">
      <h2>Invoice Editor</h2>
      
      {/* Company Information */}
      <div className="section">
        <h3>Company Information</h3>
        <div className="form-group">
          <label htmlFor="companyName">Company Name:</label>
          <input
            type="text"
            id="companyName"
            value={invoiceData.companyName}
            onChange={(e) => updateInvoiceData('companyName', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="companyAddress">Address:</label>
          <textarea
            id="companyAddress"
            value={invoiceData.companyAddress}
            onChange={(e) => updateInvoiceData('companyAddress', e.target.value)}
            rows="3"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="panNumber">PAN Number:</label>
            <input
              type="text"
              id="panNumber"
              value={invoiceData.panNumber}
              onChange={(e) => updateInvoiceData('panNumber', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone:</label>
            <input
              type="text"
              id="phoneNumber"
              value={invoiceData.phoneNumber}
              onChange={(e) => updateInvoiceData('phoneNumber', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={invoiceData.email}
            onChange={(e) => updateInvoiceData('email', e.target.value)}
          />
        </div>
      </div>

      {/* Invoice Details */}
      <div className="section">
        <h3>Invoice Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="invoiceNumber">Invoice Number:</label>
            <input
              type="text"
              id="invoiceNumber"
              value={invoiceData.invoiceNumber}
              onChange={(e) => updateInvoiceData('invoiceNumber', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="invoiceDate">Invoice Date:</label>
            <input
              type="date"
              id="invoiceDate"
              value={invoiceData.invoiceDate}
              onChange={(e) => updateInvoiceData('invoiceDate', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="dueDate">Due Date:</label>
          <input
            type="date"
            id="dueDate"
            value={invoiceData.dueDate}
            onChange={(e) => updateInvoiceData('dueDate', e.target.value)}
          />
        </div>
      </div>

      {/* Bill To Information */}
      <div className="section">
        <h3>Bill To</h3>
        <div className="form-group">
          <label htmlFor="clientSelect">Select Client:</label>
          <select
            id="clientSelect"
            value={selectedClient}
            onChange={(e) => handleClientChange(e.target.value)}
            className="client-select"
          >
            <option value="saturn">Saturn Industries</option>
            <option value="abhishek">Abhishek Inspat Pvt. Ltd.</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="clientName">Client Name:</label>
          <input
            type="text"
            id="clientName"
            value={invoiceData.clientName}
            onChange={(e) => updateInvoiceData('clientName', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="clientAddress">Client Address:</label>
          <textarea
            id="clientAddress"
            value={invoiceData.clientAddress}
            onChange={(e) => updateInvoiceData('clientAddress', e.target.value)}
            rows="4"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="gstNumber">GST Number:</label>
            <input
              type="text"
              id="gstNumber"
              value={invoiceData.gstNumber}
              onChange={(e) => updateInvoiceData('gstNumber', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="clientPhone">Client Phone:</label>
            <input
              type="text"
              id="clientPhone"
              value={invoiceData.clientPhone}
              onChange={(e) => updateInvoiceData('clientPhone', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="clientEmail">Client Email:</label>
          <input
            type="email"
            id="clientEmail"
            value={invoiceData.clientEmail}
            onChange={(e) => updateInvoiceData('clientEmail', e.target.value)}
          />
        </div>
      </div>

      {/* Items */}
      <div className="section">
        <h3>Items</h3>
        <div className="items-container">
          {invoiceData.items.map((item, index) => (
            <div key={item.id} className="item-row">
              <div className="item-header">
                <h4>Item {index + 1}</h4>
                <div className="item-controls">
                  <button
                    className="btn btn-move"
                    onClick={() => moveItemUp(item.id)}
                    disabled={index === 0}
                    title="Move Up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-move"
                    onClick={() => moveItemDown(item.id)}
                    disabled={index === invoiceData.items.length - 1}
                    title="Move Down"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Item Title:</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                  placeholder="e.g., Transport, Weighing Bill"
                />
              </div>
              
              <div className="item-details-section">
                <h5>Item Details</h5>
                <div className="form-row">
                  <div className="form-group">
                    <label>Delivered To:</label>
                    <input
                      type="text"
                      value={item.deliveredTo}
                      onChange={(e) => updateItem(item.id, 'deliveredTo', e.target.value)}
                      placeholder="e.g., Saturn Godown"
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Date:</label>
                    <input
                      type="date"
                      value={item.deliveryDate}
                      onChange={(e) => updateItem(item.id, 'deliveryDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>From Location:</label>
                    <input
                      type="text"
                      value={item.fromLocation}
                      onChange={(e) => updateItem(item.id, 'fromLocation', e.target.value)}
                      placeholder="e.g., Vitco (Sachin)"
                    />
                  </div>
                  <div className="form-group">
                    <label>To Location:</label>
                    <input
                      type="text"
                      value={item.toLocation}
                      onChange={(e) => updateItem(item.id, 'toLocation', e.target.value)}
                      placeholder="e.g., Hojiwala"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Truck No:</label>
                    <input
                      type="text"
                      value={item.truckNo}
                      onChange={(e) => updateItem(item.id, 'truckNo', e.target.value)}
                      placeholder="e.g., GJ21T5475"
                    />
                  </div>
                  <div className="form-group">
                    <label>Weight:</label>
                    <input
                      type="text"
                      value={item.weight}
                      onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                      placeholder="e.g., 29065kg"
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={item.isFixedPrice || false}
                    onChange={(e) => updateItem(item.id, 'isFixedPrice', e.target.checked)}
                  />
                  Fixed Price (not per unit)
                </label>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    placeholder={item.isFixedPrice ? "For reference only (not used in calculation)" : ""}
                  />
                </div>
                <div className="form-group">
                  <label>{item.isFixedPrice ? 'Fixed Price (₹):' : 'Price (₹):'}</label>
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                    placeholder={item.isFixedPrice ? "Enter fixed amount" : "Price per unit"}
                  />
                </div>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => removeItem(item.id)}
              >
                Remove Item
              </button>
            </div>
          ))}
        </div>
        <button className="btn" onClick={addItem}>Add Item</button>
      </div>

      {/* Payment Instructions */}
      <div className="section">
        <h3>Payment Instructions</h3>
        <div className="form-group">
          <label htmlFor="bankName">Bank Name:</label>
          <input
            type="text"
            id="bankName"
            value={invoiceData.bankName}
            onChange={(e) => updateInvoiceData('bankName', e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="accountNumber">Account Number:</label>
            <input
              type="text"
              id="accountNumber"
              value={invoiceData.accountNumber}
              onChange={(e) => updateInvoiceData('accountNumber', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ifscCode">IFSC Code:</label>
            <input
              type="text"
              id="ifscCode"
              value={invoiceData.ifscCode}
              onChange={(e) => updateInvoiceData('ifscCode', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="section">
        <h3>Signature</h3>
        <div className="form-group">
          <label htmlFor="signatureName">Signature Name:</label>
          <input
            type="text"
            id="signatureName"
            value={invoiceData.signatureName}
            onChange={(e) => updateInvoiceData('signatureName', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="signatureDate">Signature Date:</label>
          <input
            type="date"
            id="signatureDate"
            value={invoiceData.signatureDate}
            onChange={(e) => updateInvoiceData('signatureDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;
