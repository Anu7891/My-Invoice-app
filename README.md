# Invoice Editor React App

A modern React-based invoice editor that allows you to create professional invoices with a live preview.

## Features

- **Live Preview**: Real-time preview of your invoice as you type
- **No code changes needed** – everything is managed inside the app and saved in your browser:
  - **Settings**: business details, bank, signature name & image, agreement text, tax, default truck no.
  - **Clients**: add / edit / delete clients, or save a new client straight from the Bill To form
  - **Quick-add item templates**: one-click buttons like "+ Transport" or "+ Weighing Bill" with their default price
  - **Saved invoices**: save, reopen, duplicate, mark paid/unpaid, search and filter by client
- **Auto invoice numbering**: prefix + counter (e.g. `INV-001`), goes up automatically on every save
- **Smart items**: quantity filled from weight (29065kg → 29.065), delivery details copied from the previous item,
  duplicate / collapse items, autocomplete for locations, trucks and delivered-to, custom detail lines (e.g. Challan No)
- **Optional tax line** (GST %) and amount in words
- **Backup / restore** all data to a JSON file (Settings → Backup)
- **Export Options**: standalone HTML file (signature embedded) and Print / Save as PDF
- **Keyboard**: `Ctrl + S` saves the current invoice
- **Responsive Design**: Works on desktop and mobile devices
- **Same Layout**: Maintains the exact visual design of the original invoice

> Data is stored in the browser's localStorage. Use **Settings → Backup** to move it to another browser/computer.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd "E:\My Projects\My-Invoice-app"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

### Building for Production

To create a production build:

```bash
npm run build
```

This will create a `build` folder with the production-ready files.

## Usage

1. **First time**: open **Settings** and check your business, bank and signature details, and invoice number prefix
2. **New**: starts a fresh invoice with the next number and today's date
3. **Bill To**: pick a client, or type a new one and click "Save … to client list"
4. **Items**: use the quick-add buttons; type the weight and the quantity fills itself
5. **Save** (or `Ctrl + S`): stores the invoice under **Invoices** and bumps the invoice number
6. **Export HTML** or **Print / PDF**

## Project Structure

```
invoice-react-app/
├── public/
│   ├── index.html
│   └── images/
│       └── sign.png
├── src/
│   ├── components/
│   │   ├── InvoiceEditor.js / .css    # the form
│   │   ├── InvoicePreview.js / .css   # the live invoice
│   │   ├── ClientManager.js           # add / edit clients
│   │   ├── SettingsPanel.js           # business, bank, numbering, templates, backup
│   │   ├── InvoiceHistory.js          # saved invoices
│   │   └── Modal.js / .css
│   ├── hooks/usePersistentState.js    # state that is saved in the browser
│   ├── utils/
│   │   ├── invoice.js                 # default data, calculations, formatting
│   │   ├── storage.js                 # localStorage + backup
│   │   └── exportInvoice.js           # HTML export & print
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Components

- **App.js**: Main application component – invoice actions (new, save, open, duplicate) and toolbar
- **InvoiceEditor.js**: Form-based editor for invoice data
- **InvoicePreview.js**: Live preview of the invoice (also the source for export/print)
- **utils/invoice.js**: The starting data used the very first time the app opens

## Technologies Used

- React 18
- JavaScript (ES6+)
- CSS3
- HTML5

## License

This project is open source and available under the MIT License.
