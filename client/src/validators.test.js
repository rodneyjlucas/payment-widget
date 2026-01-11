import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCardNumber,
  formatExpirationDate,
  formatCvv,
  formatPostalCode,
  validateCardNumber,
  validateExpirationDate,
  validateCvv,
  validatePostalCode,
} from './validators.js';

describe('formatCardNumber', () => {
  it('formats digits with spaces every 4 characters', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('removes non-digit characters', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
  });

  it('handles partial input', () => {
    expect(formatCardNumber('4111')).toBe('4111');
    expect(formatCardNumber('41111111')).toBe('4111 1111');
  });

  it('limits to 16 digits (19 chars with spaces)', () => {
    expect(formatCardNumber('41111111111111111234')).toBe('4111 1111 1111 1111');
  });

  it('returns empty string for empty input', () => {
    expect(formatCardNumber('')).toBe('');
  });

  it('handles input with only non-digit characters', () => {
    expect(formatCardNumber('abcd-efgh')).toBe('');
  });
});

describe('formatExpirationDate', () => {
  it('adds slash after 2 digits', () => {
    expect(formatExpirationDate('1225')).toBe('12/25');
  });

  it('handles partial input with 2 digits', () => {
    expect(formatExpirationDate('12')).toBe('12/');
  });

  it('handles single digit input', () => {
    expect(formatExpirationDate('1')).toBe('1');
  });

  it('removes non-digit characters', () => {
    expect(formatExpirationDate('12/25')).toBe('12/25');
  });

  it('limits to 4 digits', () => {
    expect(formatExpirationDate('122599')).toBe('12/25');
  });

  it('returns empty string for empty input', () => {
    expect(formatExpirationDate('')).toBe('');
  });
});

describe('formatCvv', () => {
  it('keeps only digits', () => {
    expect(formatCvv('123')).toBe('123');
    expect(formatCvv('1234')).toBe('1234');
  });

  it('removes non-digit characters', () => {
    expect(formatCvv('12a3')).toBe('123');
  });

  it('limits to 4 digits', () => {
    expect(formatCvv('12345')).toBe('1234');
  });

  it('returns empty string for empty input', () => {
    expect(formatCvv('')).toBe('');
  });
});

describe('formatPostalCode', () => {
  it('keeps only digits', () => {
    expect(formatPostalCode('12345')).toBe('12345');
  });

  it('removes non-digit characters', () => {
    expect(formatPostalCode('123-45')).toBe('12345');
  });

  it('limits to 5 digits', () => {
    expect(formatPostalCode('123456')).toBe('12345');
  });

  it('returns empty string for empty input', () => {
    expect(formatPostalCode('')).toBe('');
  });
});

describe('validateCardNumber', () => {
  it('returns valid for valid Visa card number', () => {
    const result = validateCardNumber('4111 1111 1111 1111');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for valid Mastercard number', () => {
    const result = validateCardNumber('5500 0000 0000 0004');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for valid Amex number (15 digits)', () => {
    const result = validateCardNumber('3782 8224 6310 005');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns invalid for card number failing Luhn check', () => {
    const result = validateCardNumber('4111 1111 1111 1112');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid card number');
  });

  it('returns invalid for too few digits', () => {
    const result = validateCardNumber('4111 1111 1111');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Card number must be 13-19 digits');
  });

  it('returns invalid for too many digits', () => {
    const result = validateCardNumber('4111 1111 1111 1111 1111');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Card number must be 13-19 digits');
  });

  it('returns invalid for non-numeric input', () => {
    const result = validateCardNumber('abcd efgh ijkl mnop');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Card number must be 13-19 digits');
  });

  it('handles card number without spaces', () => {
    const result = validateCardNumber('4111111111111111');
    expect(result.valid).toBe(true);
  });

  it('returns valid for 13-digit card number passing Luhn', () => {
    const result = validateCardNumber('4222222222222');
    expect(result.valid).toBe(true);
  });
});

describe('validateExpirationDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for valid future date', () => {
    expect(validateExpirationDate('12/27')).toBeNull();
  });

  it('returns null for current month', () => {
    expect(validateExpirationDate('01/26')).toBeNull();
  });

  it('returns error for empty value', () => {
    expect(validateExpirationDate('')).toBe('Expiration date is required');
  });

  it('returns error for invalid format', () => {
    expect(validateExpirationDate('1225')).toBe('Expiration date must be MM/YY format');
    expect(validateExpirationDate('12-25')).toBe('Expiration date must be MM/YY format');
  });

  it('returns error for invalid month (00)', () => {
    expect(validateExpirationDate('00/27')).toBe('Invalid month');
  });

  it('returns error for invalid month (13)', () => {
    expect(validateExpirationDate('13/27')).toBe('Invalid month');
  });

  it('returns error for expired card', () => {
    expect(validateExpirationDate('12/24')).toBe('Card has expired');
    expect(validateExpirationDate('01/25')).toBe('Card has expired');
  });
});

describe('validateCvv', () => {
  it('returns null for valid 3-digit CVV', () => {
    expect(validateCvv('123')).toBeNull();
  });

  it('returns null for valid 4-digit CVV (Amex)', () => {
    expect(validateCvv('1234')).toBeNull();
  });

  it('returns error for empty value', () => {
    expect(validateCvv('')).toBe('CVV is required');
  });

  it('returns error for too few digits', () => {
    expect(validateCvv('12')).toBe('CVV must be 3-4 digits');
  });

  it('returns error for too many digits', () => {
    expect(validateCvv('12345')).toBe('CVV must be 3-4 digits');
  });
});

describe('validatePostalCode', () => {
  it('returns null for valid 5-digit postal code', () => {
    expect(validatePostalCode('12345')).toBeNull();
  });

  it('returns error for empty value', () => {
    expect(validatePostalCode('')).toBe('Postal code is required');
  });

  it('returns error for too few digits', () => {
    expect(validatePostalCode('1234')).toBe('Postal code must be 5 digits');
  });

  it('returns error for too many digits', () => {
    expect(validatePostalCode('123456')).toBe('Postal code must be 5 digits');
  });
});
