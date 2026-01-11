/**
 * Format card number with spaces every 4 digits
 * @param {string} value - Raw input value
 * @returns {string} - Formatted card number
 */
export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
}

/**
 * Format expiration date with auto-slash
 * @param {string} value - Raw input value
 * @returns {string} - Formatted expiration date
 */
export function formatExpirationDate(value) {
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
export function formatCvv(value) {
  return value.replace(/\D/g, '').substring(0, 4);
}

/**
 * Format postal code to digits only
 * @param {string} value - Raw input value
 * @returns {string} - Formatted postal code
 */
export function formatPostalCode(value) {
  return value.replace(/\D/g, '').substring(0, 5);
}

/**
 * Validate card number using Luhn algorithm
 * @param {string} cardNumber - Card number value
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validateCardNumber(cardNumber) {
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
export function validateExpirationDate(value) {
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
export function validateCvv(value) {
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
export function validatePostalCode(value) {
  if (!value) {
    return 'Postal code is required';
  }
  if (value.length !== 5) {
    return 'Postal code must be 5 digits';
  }
  return null;
}
