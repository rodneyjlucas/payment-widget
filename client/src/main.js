import { submitPayment } from './api.js';
import { PaymentForm } from './PaymentForm.js';
import './style.css';

const app = document.querySelector('#payment-form-widget');

// Create the payment form with the submit handler and amount passed as parameters
const paymentForm = PaymentForm(submitPayment, 99.99);

app.appendChild(paymentForm);
