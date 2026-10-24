/**
 * date.js — Date parsing, formatting, and period boundary utilities
 *
 * Internal date representation: ISO 8601 date string "YYYY-MM-DD"
 * This is timezone-agnostic for date-only records and avoids UTC shift issues.
 *
 * Business timezone assumption: Asia/Jakarta (WIB, UTC+7)
 * Display formatting uses id-ID locale.
 */

const ID_LOCALE = 'id-ID';

/**
 * Return today's date as an ISO date string "YYYY-MM-DD",
 * interpreted in the Asia/Jakarta timezone.
 * @returns {string}
 */
export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  // en-CA locale produces YYYY-MM-DD format natively
}

/**
 * Format an ISO date string for display to Indonesian users.
 * @param {string} iso - "YYYY-MM-DD"
 * @param {'short'|'medium'|'long'} [style='medium']
 * @returns {string}
 *
 * Examples:
 *   short:  "15/01/2026"
 *   medium: "15 Jan 2026"
 *   long:   "15 Januari 2026"
 */
export function formatDate(iso, style = 'medium') {
  if (!iso || !isValidDateISO(iso)) return '—';
  // Parse as local date — avoid UTC interpretation
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  switch (style) {
    case 'short':
      return date.toLocaleDateString(ID_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString(ID_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
    case 'medium':
    default:
      return date.toLocaleDateString(ID_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/**
 * Format a full ISO datetime string for display.
 * @param {string} isoDateTime - Full ISO 8601 datetime string
 * @returns {string}
 */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '—';
  const date = new Date(isoDateTime);
  return date.toLocaleString(ID_LOCALE, {
    timeZone: 'Asia/Jakarta',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Validate that a string is a well-formed ISO date "YYYY-MM-DD".
 * Does not validate calendar correctness (e.g. Feb 30) beyond basic range.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDateISO(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

/**
 * Compare two ISO date strings.
 * @param {string} a
 * @param {string} b
 * @returns {-1|0|1}
 */
export function compareDates(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check whether a date falls within an inclusive range.
 * @param {string} date - ISO date
 * @param {string} from - ISO date (inclusive start)
 * @param {string} to   - ISO date (inclusive end)
 * @returns {boolean}
 */
export function isDateInRange(date, from, to) {
  return date >= from && date <= to;
}

/**
 * Return the first and last ISO date of a given month.
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {{ from: string, to: string }}
 */
export function monthRange(year, month) {
  const from = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  return { from, to };
}

/**
 * Return the first and last ISO date of a given year.
 * @param {number} year
 * @returns {{ from: string, to: string }}
 */
export function yearRange(year) {
  return {
    from: `${year}-01-01`,
    to:   `${year}-12-31`,
  };
}

/**
 * Return the current year in Asia/Jakarta timezone.
 * @returns {number}
 */
export function currentYear() {
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 4));
}

/**
 * Return the current month (1-based) in Asia/Jakarta timezone.
 * @returns {number}
 */
export function currentMonth() {
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(5, 7));
}

/**
 * Return a human-readable month name in Bahasa Indonesia.
 * @param {number} month - 1-based
 * @returns {string}
 */
export function monthName(month) {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleDateString(ID_LOCALE, { month: 'long' });
}
