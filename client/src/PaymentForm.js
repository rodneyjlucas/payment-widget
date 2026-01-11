import {
  formatCardNumber,
  formatCvv,
  formatExpirationDate,
  formatPostalCode,
  validateCardNumber,
  validateCvv,
  validateExpirationDate,
  validatePostalCode,
} from './validators.js';

/**
 * @typedef {Object} PaymentFormConfig
 * @property {string} [theme] - Theme preset: 'dark', 'light', or 'minimal'
 * @property {string} [className] - Additional CSS class names
 * @property {Object} [styles] - CSS custom property overrides (without --pf- prefix)
 * @property {Object} [labels] - Custom label text
 * @property {string} [labels.legend] - Legend text
 * @property {string} [labels.cardNumber] - Card number label
 * @property {string} [labels.expirationDate] - Expiration date label
 * @property {string} [labels.cvv] - CVV label
 * @property {string} [labels.postalCode] - Postal code label
 * @property {string} [labels.submit] - Submit button text
 * @property {Object} [placeholders] - Custom placeholder text
 */

/**
 * Payment Form UI Component
 * @param {Function} onSubmit - Submit handler function that receives form data
 * @param {number} amount - The payment amount
 * @param {PaymentFormConfig} [config] - Configuration options
 * @returns {HTMLElement} - The form element
 */
export function PaymentForm(onSubmit, amount, config = {}) {
  const {
    theme = '',
    className = '',
    styles = {},
    labels = {},
    placeholders = {}
  } = config;

  const mergedLabels = {
    legend: 'Payment Details',
    cardNumber: 'Card Number',
    expirationDate: 'Expiration Date',
    cvv: 'CVV',
    postalCode: 'Postal Code',
    submit: `Pay $${amount.toFixed(2)}`,
    ...labels
  };

  const mergedPlaceholders = {
    cardNumber: '4111 1111 1111 1111',
    expirationDate: 'MM/YY',
    cvv: '123',
    postalCode: '12345',
    ...placeholders
  };

  const form = document.createElement('form');
  form.className = ['payment-form', theme, className].filter(Boolean).join(' ');

  // Apply custom style overrides via CSS custom properties
  Object.entries(styles).forEach(([prop, value]) => {
    form.style.setProperty(`--pf-${prop}`, value);
  });

  form.innerHTML = `
    <fieldset>
      <legend>${mergedLabels.legend}</legend>

      <div class="form-group">
        <label for="cardNumber">${mergedLabels.cardNumber}</label>
        <input type="text" id="cardNumber" name="cardNumber" required placeholder="${mergedPlaceholders.cardNumber}" maxlength="19" inputmode="numeric" autocomplete="cc-number">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="expirationDate">${mergedLabels.expirationDate}</label>
          <input type="text" id="expirationDate" name="expirationDate" required placeholder="${mergedPlaceholders.expirationDate}" maxlength="5" inputmode="numeric" autocomplete="cc-exp">
        </div>

        <div class="form-group">
          <label for="cvv">${mergedLabels.cvv}</label>
          <input type="text" id="cvv" name="cvv" required placeholder="${mergedPlaceholders.cvv}" maxlength="4" inputmode="numeric" autocomplete="cc-csc">
        </div>
      </div>

      <div class="form-group">
        <label for="postalCode">${mergedLabels.postalCode}</label>
        <input type="text" id="postalCode" name="postalCode" required placeholder="${mergedPlaceholders.postalCode}" maxlength="5" inputmode="numeric" autocomplete="postal-code">
      </div>

      <input type="hidden" name="amount" value="${amount}">

      <button type="submit">${mergedLabels.submit}</button>
    </fieldset>

    <div id="result" class="result" role="status" aria-live="polite"></div>
  `;

  const resultDiv = form.querySelector('#result');
  const cardNumberInput = form.querySelector('#cardNumber');
  const expirationDateInput = form.querySelector('#expirationDate');
  const cvvInput = form.querySelector('#cvv');
  const postalCodeInput = form.querySelector('#postalCode');
  const submitButton = form.querySelector('button[type="submit"]');

  /**
   * Show error message for a form field
   * @param {HTMLInputElement} input - The input element
   * @param {string} message - Error message to display
   */
  function showError(input, message) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.add('has-error');
    input.classList.add('input-error');

    let errorEl = formGroup.querySelector('.error-message');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'error-message';
      formGroup.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  /**
   * Clear error state from a form field
   * @param {HTMLInputElement} input - The input element
   */
  function clearError(input) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('has-error');
    input.classList.remove('input-error');

    const errorEl = formGroup.querySelector('.error-message');
    if (errorEl) {
      errorEl.remove();
    }
  }

  /**
   * Clear all form errors
   */
  function clearAllErrors() {
    clearError(cardNumberInput);
    clearError(expirationDateInput);
    clearError(cvvInput);
    clearError(postalCodeInput);
  }

  cardNumberInput.addEventListener('input', (e) => {
    e.target.value = formatCardNumber(e.target.value);
    clearError(e.target);
  });

  expirationDateInput.addEventListener('input', (e) => {
    e.target.value = formatExpirationDate(e.target.value);
    clearError(e.target);
  });

  cvvInput.addEventListener('input', (e) => {
    e.target.value = formatCvv(e.target.value);
    clearError(e.target);
  });

  postalCodeInput.addEventListener('input', (e) => {
    e.target.value = formatPostalCode(e.target.value);
    clearError(e.target);
  });

  async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    const formData = new FormData(form);
    const cardNumber = formData.get('cardNumber');
    const expirationDate = formData.get('expirationDate');
    const cvv = formData.get('cvv');
    const postalCode = formData.get('postalCode');

    // Validate all fields
    let hasErrors = false;

    const cardNumberError = validateCardNumber(cardNumber);
    if (cardNumberError) {
      showError(cardNumberInput, cardNumberError.message);
      hasErrors = true;
    }

    const expirationDateError = validateExpirationDate(expirationDate);
    if (expirationDateError) {
      showError(expirationDateInput, expirationDateError);
      hasErrors = true;
    }

    const cvvError = validateCvv(cvv);
    if (cvvError) {
      showError(cvvInput, cvvError);
      hasErrors = true;
    }

    const postalCodeError = validatePostalCode(postalCode);
    if (postalCodeError) {
      showError(postalCodeInput, postalCodeError);
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    const paymentData = {
      cardNumber,
      expirationDate,
      cvv,
      postalCode,
      amount: parseFloat(formData.get('amount'))
    };

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    resultDiv.className = 'result';
    resultDiv.textContent = 'Processing...';

    try {
      const result = await onSubmit(paymentData);
      resultDiv.className = 'result success';
      resultDiv.textContent = '';

      const successTitle = document.createElement('strong');
      successTitle.textContent = 'Payment Successful!';
      resultDiv.appendChild(successTitle);

      resultDiv.appendChild(document.createElement('br'));
      resultDiv.appendChild(document.createTextNode(`Transaction ID: ${result.transactionId}`));
      resultDiv.appendChild(document.createElement('br'));
      resultDiv.appendChild(document.createTextNode(`Amount: $${result.amount}`));
      resultDiv.appendChild(document.createElement('br'));
      resultDiv.appendChild(document.createTextNode(`Client: ${result.clientId}`));
    } catch (error) {
      resultDiv.className = 'result error';
      resultDiv.textContent = `Error: ${error.message}`;
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  }

  form.addEventListener('submit', handleSubmit);

  return form;
}
