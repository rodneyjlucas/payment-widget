/**
 * Format card number with spaces every 4 digits
 * @param {string} value - Raw input value
 * @returns {string} - Formatted card number
 */
function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
}

/**
 * Format expiration date with auto-slash
 * @param {string} value - Raw input value
 * @returns {string} - Formatted expiration date
 */
function formatExpirationDate(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }
  return digits;
}

/**
 * Format CVV to digits only
 * @param {string} value - Raw input value
 * @returns {string} - Formatted CVV
 */
function formatCvv(value) {
  return value.replace(/\D/g, '').substring(0, 4);
}

/**
 * Format postal code to digits only
 * @param {string} value - Raw input value
 * @returns {string} - Formatted postal code
 */
function formatPostalCode(value) {
  return value.replace(/\D/g, '').substring(0, 5);
}

/**
 * Validate card number (16 digits with spaces)
 * @param {string} value - Card number value
 * @returns {string|null} - Error message or null if valid
 */
function validateCardNumber(cardNumber) {
		const cleaned = cardNumber.replace(/\s/g, "");

		if (!/^\d{13,19}$/.test(cleaned)) {
			return { valid: false, message: "Card number must be 13-19 digits" };
		}

		let sum = 0;
		let isEven = false;

		for (let i = cleaned.length - 1; i >= 0; i--) {
			let digit = parseInt(cleaned.charAt(i), 10);

			if (isEven) {
				digit *= 2;
				if (digit > 9) {
					digit -= 9;
				}
			}

			sum += digit;
			isEven = !isEven;
		}

		const valid = sum % 10 === 0;
		return {
			valid,
			message: valid ? "" : "Invalid card number",
		};
}

/**
 * Validate expiration date (MM/YY format, not expired)
 * @param {string} value - Expiration date value
 * @returns {string|null} - Error message or null if valid
 */
function validateExpirationDate(value) {
  if (!value) {
    return 'Expiration date is required';
  }
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return 'Expiration date must be MM/YY format';
  }
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) {
    return 'Invalid month';
  }
  const now = new Date();
  const expiry = new Date(year, month);
  if (expiry < now) {
    return 'Card has expired';
  }
  return null;
}

/**
 * Validate CVV (3-4 digits)
 * @param {string} value - CVV value
 * @returns {string|null} - Error message or null if valid
 */
function validateCvv(value) {
  if (!value) {
    return 'CVV is required';
  }
  if (value.length < 3 || value.length > 4) {
    return 'CVV must be 3-4 digits';
  }
  return null;
}

/**
 * Validate postal code (5 digits)
 * @param {string} value - Postal code value
 * @returns {string|null} - Error message or null if valid
 */
function validatePostalCode(value) {
  if (!value) {
    return 'Postal code is required';
  }
  if (value.length !== 5) {
    return 'Postal code must be 5 digits';
  }
  return null;
}

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
      resultDiv.innerHTML = `
        <strong>Payment Successful!</strong><br>
        Transaction ID: ${result.transactionId}<br>
        Amount: $${result.amount}<br>
        Client: ${result.clientId}
      `;
    } catch (error) {
      resultDiv.className = 'result error';
      resultDiv.textContent = `Error: ${error.message}`;
    }
  }

  form.addEventListener('submit', handleSubmit);

  return form;
}
