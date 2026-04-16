# CartAlogue POS System

A modern, web-based Point-of-Sale (POS) user interface for the CartAlogue Smart Basket project. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### 🖥️ Four Main Screens

1. **Idle/Main Screen**
   - Real-time clock and date display
   - Cashier information display
   - Ready status indicator
   - Large scan area for checkout codes

2. **Transaction Review Screen**
   - Basket ID and timestamp
   - Scrollable items table with:
     - Item name
     - Quantity
     - Unit price
     - Subtotal
   - Item count summary
   - Grand total display
   - Cancel and Proceed buttons

3. **Payment Screen**
   - Prominent total display
   - Cash-only payment method
   - Amount received input with numeric keypad
   - Real-time change calculation
   - Color-coded feedback (green/red)
   - Confirm payment button (enabled when sufficient amount)

4. **Transaction Complete Screen**
   - Success confirmation
   - Complete transaction summary:
     - Receipt number
     - Total paid
     - Amount received
     - Change given
     - Payment method
     - Timestamp
   - Print receipt option
   - Next customer button

### 🎨 Design Features

- Clean, professional color scheme
- Large, touch-friendly buttons (minimum 48px height)
- Responsive design (desktop/tablet)
- Clear visual hierarchy
- Color-coded status indicators
- Smooth transitions between screens

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS
- **React**: 18.2.0

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
POS/
├── app/
│   ├── globals.css          # Global styles with Tailwind
│   ├── layout.jsx            # Root layout component
│   └── page.jsx              # Main application with state management
├── components/
│   ├── IdleScreen.jsx                    # Main/Idle screen
│   ├── TransactionReviewScreen.jsx       # Transaction review
│   ├── PaymentScreen.jsx                 # Payment processing
│   └── TransactionCompleteScreen.jsx     # Completion screen
├── public/                   # Static assets
├── .github/
│   └── copilot-instructions.md          # Project setup checklist
├── tailwind.config.js        # Tailwind configuration
├── jsconfig.json             # JavaScript configuration
├── next.config.js            # Next.js configuration
└── package.json              # Dependencies and scripts
```

## Usage Guide

### Navigation Flow

1. **Start**: Idle screen displays real-time clock and ready status
2. **Scan**: Click "Scan checkout code" area → loads Transaction Review
3. **Review**: Check items and total → Click "Proceed to Payment"
4. **Payment**: 
   - Enter amount received using numeric keypad
   - See real-time change calculation
   - Click "Confirm Payment" when amount is sufficient
5. **Complete**: View summary → Click "Next Customer" to return to Idle

### Mock Data

The system includes sample transaction data for testing:

```javascript
{
  basketId: "BSK-20250215-001",
  items: [
    { name: "San Miguel Pale Pilsen 330ml", qty: 6, price: 45.00, subtotal: 270.00 },
    { name: "Lucky Me Pancit Canton", qty: 3, price: 15.00, subtotal: 45.00 },
    { name: "Alaska Evap Milk", qty: 2, price: 28.00, subtotal: 56.00 },
    { name: "Century Tuna Flakes", qty: 1, price: 35.00, subtotal: 35.00 }
  ],
  total: 406.00,
  timestamp: "2025-02-15 14:30:25"
}
```

## Key Interactive Elements

- **Scan Code Area**: Clickable area simulates barcode scan
- **Amount Input**: Accepts decimal input with numeric keypad
- **Change Calculation**: Automatic, real-time calculation
  - Green: Amount ≥ total (shows change)
  - Red: Amount < total (shows shortage)
- **Payment Button**: Enabled only when sufficient amount entered
- **Navigation**: Back/Cancel buttons return to previous screens

## Payment Validation

- Minimum payment must equal or exceed total
- Change = Amount Received - Total
- Visual feedback for insufficient payment
- Button state management prevents invalid transactions

## Future Enhancements

- Backend API integration
- Real barcode scanner support
- Receipt printer integration
- Multiple payment methods
- Transaction history
- Database integration
- User authentication
- Reporting dashboard

## License

© 2025 CartAlogue Smart Basket. All rights reserved.

## Support

For issues or questions, please contact the development team.
