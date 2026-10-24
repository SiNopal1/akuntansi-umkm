/**
 * validation.js — Shared input validators
 *
 * Returns { valid: boolean, message: string } so callers can surface
 * error messages without knowing the validation implementation details.
 */

import { isValidDateISO, todayISO } from './date.js';
import { isSafeIDR } from './currency.js';

/**
 * Validate that a value is a non-empty string.
 * @param {*} value
 * @param {string} [fieldName='Nilai']
 * @returns {{ valid: boolean, message: string }}
 */
export function validateRequired(value, fieldName = 'Nilai') {
  const isEmpty = value === null || value === undefined || String(value).trim() === '';
  return isEmpty
    ? { valid: false, message: `${fieldName} wajib diisi.` }
    : { valid: true, message: '' };
}

/**
 * Validate an ISO date string.
 * @param {string} value
 * @param {string} [fieldName='Tanggal']
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDate(value, fieldName = 'Tanggal') {
  if (!value) return { valid: false, message: `${fieldName} wajib diisi.` };
  if (!isValidDateISO(value)) return { valid: false, message: `${fieldName} tidak valid. Gunakan format YYYY-MM-DD.` };
  return { valid: true, message: '' };
}

/**
 * Validate a monetary amount (integer rupiah, positive by default).
 * @param {*} value
 * @param {string} [fieldName='Jumlah']
 * @param {object} [options]
 * @param {boolean} [options.allowZero=false]
 * @param {boolean} [options.allowNegative=false]
 * @returns {{ valid: boolean, message: string }}
 */
export function validateAmount(value, fieldName = 'Jumlah', { allowZero = false, allowNegative = false } = {}) {
  const num = Number(value);
  if (!Number.isInteger(num)) return { valid: false, message: `${fieldName} harus berupa angka bulat rupiah.` };
  if (!isSafeIDR(num)) return { valid: false, message: `${fieldName} melebihi batas nilai yang aman.` };
  if (!allowNegative && num < 0) return { valid: false, message: `${fieldName} tidak boleh negatif.` };
  if (!allowZero && num === 0) return { valid: false, message: `${fieldName} tidak boleh nol.` };
  return { valid: true, message: '' };
}

/**
 * Validate a quantity (can be fractional, must be positive by default).
 * @param {*} value
 * @param {string} [fieldName='Kuantitas']
 * @param {object} [options]
 * @param {boolean} [options.allowZero=false]
 * @returns {{ valid: boolean, message: string }}
 */
export function validateQuantity(value, fieldName = 'Kuantitas', { allowZero = false } = {}) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return { valid: false, message: `${fieldName} harus berupa angka.` };
  if (!allowZero && num <= 0) return { valid: false, message: `${fieldName} harus lebih dari nol.` };
  if (num < 0) return { valid: false, message: `${fieldName} tidak boleh negatif.` };
  return { valid: true, message: '' };
}

/**
 * Run multiple validators and collect all failures.
 * @param {Array<{ valid: boolean, message: string }>} results
 * @returns {{ valid: boolean, messages: string[] }}
 */
export function collectValidation(results) {
  const messages = results.filter(r => !r.valid).map(r => r.message);
  return { valid: messages.length === 0, messages };
}
