/**
 * id.js — Stable unique identifier generation
 *
 * Uses crypto.randomUUID() when available (all modern browsers).
 * Falls back to a Math.random-based UUID v4 for older environments.
 * IDs are prefixed by entity type for readability in storage debugging.
 */

/**
 * Generate a prefixed unique ID.
 * @param {string} prefix - e.g. 'txn', 'jnl', 'acc', 'inv', 'prod'
 * @returns {string} e.g. "txn_550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(prefix = 'id') {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : fallbackUUID();
  return `${prefix}_${uuid}`;
}

/**
 * Math.random-based UUID v4 fallback (RFC 4122 compliant structure).
 * @returns {string}
 */
function fallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
