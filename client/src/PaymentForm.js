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
 * Payment Form UI Component
 * @param {Function} onSubmit - Submit handler function that receives form data
 * @param {number} amount - The payment amount
 * @returns {HTMLElement} - The form element
 */
export function PaymentForm(onSubmit, amount) {
  const form = document.createElement('form');
  form.className = 'payment-form';
  form.innerHTML = `
    <h2>Payment Form</h2>
    <div class="form-group">
      <label for="cardNumber">Card Number</label>
      <input type="text" id="cardNumber" name="cardNumber" required placeholder="4111 1111 1111 1111" maxlength="19">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="expirationDate">Expiration Date</label>
        <input type="text" id="expirationDate" name="expirationDate" required placeholder="MM/YY" maxlength="5">
      </div>

      <div class="form-group">
        <label for="cvv">CVV</label>
        <input type="text" id="cvv" name="cvv" required placeholder="123" maxlength="4">
      </div>
    </div>

    <div class="form-group">
      <label for="postalCode">Postal Code</label>
      <input type="text" id="postalCode" name="postalCode" required placeholder="12345" maxlength="5"  inputmode="numeric">
    </div>

    <input type="hidden" name="amount" value="${amount}">

    <button type="submit">Pay $${amount.toFixed(2)}</button>

    <div id="result" class="result"></div>
  `;

  const resultDiv = form.querySelector('#result');
  const cardNumberInput = form.querySelector('#cardNumber');
  const expirationDateInput = form.querySelector('#expirationDate');
  const cvvInput = form.querySelector('#cvv');
  const postalCodeInput = form.querySelector('#postalCode');

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
    }
  }

  form.addEventListener('submit', handleSubmit);

  return form;
}
