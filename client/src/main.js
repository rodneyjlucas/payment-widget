import { submitPayment } from './api.js';
import { PaymentForm } from './PaymentForm.js';
import './style.css';

const app = document.querySelector('#payment-form-widget');

// Create the payment form with optional configuration
// Available config options:
//   theme: 'dark' | 'light' | 'minimal'
//   className: additional CSS classes
//   styles: { primary: '#10b981', 'border-radius': '4px', ... }
//   labels: { legend, cardNumber, expirationDate, cvv, postalCode, submit }
//   placeholders: { cardNumber, expirationDate, cvv, postalCode }
const paymentForm = PaymentForm(submitPayment, 99.99, {
  // Example customization (uncomment to test):
  // theme: 'light',
  // styles: {
  //   primary: '#10b981',
  //   'primary-hover': '#059669',
  //   'border-radius': '8px',
  //   'border-radius-sm': '4px'
  // },
  // labels: {
  //   legend: 'Secure Checkout',
  //   submit: 'Complete Purchase'
  // }
});

app.appendChild(paymentForm);
