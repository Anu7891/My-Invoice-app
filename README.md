# Invoice Editor React App

A modern React-based invoice editor that allows you to create professional invoices with a live preview.

## Features

- **Live Preview**: Real-time preview of your invoice as you type
- **Form-Based Editing**: Easy-to-use form fields for all invoice data
- **Dynamic Items**: Add/remove invoice items with automatic calculations
- **Export Options**: 
  - Export to HTML file
  - Print directly from browser
- **Responsive Design**: Works on desktop and mobile devices
- **Same Layout**: Maintains the exact visual design of the original invoice

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd invoice-react-app
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

1. **Edit Company Information**: Fill in your business details
2. **Set Invoice Details**: Add invoice number, dates
3. **Add Client Information**: Enter client details
4. **Manage Items**: Add/remove services or products with quantities and prices
5. **Payment Instructions**: Add bank details
6. **Signature**: Set signature name and date
7. **Export or Print**: Use the buttons in the top-right corner

## Project Structure

```
invoice-react-app/
├── public/
│   ├── index.html
│   └── images/
│       └── sign.png
├── src/
│   ├── components/
│   │   ├── InvoiceEditor.js
│   │   ├── InvoiceEditor.css
│   │   ├── InvoicePreview.js
│   │   └── InvoicePreview.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Components

- **App.js**: Main application component with state management
- **InvoiceEditor.js**: Form-based editor for invoice data
- **InvoicePreview.js**: Live preview of the invoice
- **CSS Files**: Styling for each component

## Technologies Used

- React 18
- JavaScript (ES6+)
- CSS3
- HTML5

## License

This project is open source and available under the MIT License.
