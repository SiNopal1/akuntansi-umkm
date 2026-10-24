/**
 * currency.js — IDR monetary formatting and integer arithmetic utilities
 *
 * All monetary values are stored and computed as integer rupiah.
 * No floating-point arithmetic is used for IDR amounts.
 * Safe integer range: Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991
 * Maximum storable IDR: ~Rp 9 quadrillion — well beyond UMKM scale.
 */

const IDR_LOCALE = 'id-ID';
const IDR_CURRENCY = 'IDR';

/**
 * Format an integer rupiah amount for display.
 * @param {number} amount - Integer rupiah value
 * @param {object} [options]
 * @param {boolean} [options.compact=false] - Use compact notation (Rp 1,2 Jt)
 * @param {boolean} [options.signed=false]  - Always show + or - sign
 * @param {boolean} [options.symbol=true]   - Include Rp symbol
 * @returns {string}
 */
export function formatIDR(amount, { compact = false, signed = false, symbol = true } = {}) {
  if (!Number.isFinite(amount)) return symbol ? 'Rp—' : '—';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : (signed && amount > 0 ? '+' : '');

  let formatted;

  if (compact) {
    if (abs >= 1_000_000_000) {
      formatted = (abs / 1_000_000_000).toLocaleString(IDR_LOCALE, { maximumFractionDigits: 1 }) + ' M';
    } else if (abs >= 1_000_000) {
      formatted = (abs / 1_000_000).toLocaleString(IDR_LOCALE, { maximumFractionDigits: 1 }) + ' Jt';
    } else if (abs >= 1_000) {
      formatted = (abs / 1_000).toLocaleString(IDR_LOCALE, { maximumFractionDigits: 0 }) + ' Rb';
    } else {
      formatted = abs.toLocaleString(IDR_LOCALE);
    }
    return symbol ? `${sign}Rp\u00A0${formatted}` : `${sign}${formatted}`;
  }

  formatted = abs.toLocaleString(IDR_LOCALE, {
    style: symbol ? 'currency' : 'decimal',
    currency: IDR_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // id-ID currency format produces "Rp1.250.000" — correct for Indonesian convention
  // When signed, prepend the sign before Rp
  if (symbol && sign) {
    // Insert sign before the Rp symbol
    return sign + formatted;
  }

  if (!symbol) {
    // Strip currency symbol — id-ID decimal gives "1.250.000"
    formatted = abs.toLocaleString(IDR_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return sign + formatted;
  }

  return formatted;
}

/**
 * Parse a user-entered string to an integer rupiah value.
 * Accepts: "1.250.000", "1250000", "1,250,000", "Rp 1.250.000"
 * Returns null if the input cannot be parsed as a valid positive integer.
 * @param {string} input
 * @returns {number|null}
 */
export function parseIDR(input) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const str = String(input)
    .replace(/[Rp\s]/gi, '')   // remove Rp and spaces
    .replace(/\./g, '')        // remove thousands separators (id-ID uses periods)
    .replace(/,/g, '')         // remove any commas
    .trim();

  if (str === '' || str === '-') return null;

  const num = Number(str);
  if (!Number.isInteger(num)) return null;
  if (!isSafeIDR(num)) return null;

  return num;
}

/**
 * Check whether a value is within the safe integer range for IDR.
 * @param {number} amount
 * @returns {boolean}
 */
export function isSafeIDR(amount) {
  return Number.isInteger(amount) && Math.abs(amount) <= Number.MAX_SAFE_INTEGER;
}

/**
 * Add two integer IDR amounts safely.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function addIDR(a, b) {
  const result = a + b;
  if (!isSafeIDR(result)) throw new RangeError(`IDR arithmetic overflow: ${a} + ${b}`);
  return result;
}

/**
 * Subtract two integer IDR amounts safely.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function subtractIDR(a, b) {
  const result = a - b;
  if (!isSafeIDR(result)) throw new RangeError(`IDR arithmetic overflow: ${a} - ${b}`);
  return result;
}

/**
 * Multiply an IDR amount by a scalar, rounding to nearest integer rupiah.
 * @param {number} amount - Integer IDR
 * @param {number} multiplier - Scalar (e.g. tax rate 0.005)
 * @param {'round'|'floor'|'ceil'} [rounding='round']
 * @returns {number}
 */
export function multiplyIDR(amount, multiplier, rounding = 'round') {
  const result = Math[rounding](amount * multiplier);
  if (!isSafeIDR(result)) throw new RangeError(`IDR arithmetic overflow in multiply`);
  return result;
}
