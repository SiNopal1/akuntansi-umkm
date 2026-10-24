/**
 * pin.js — Local PIN gate using SubtleCrypto (SHA-256 + random salt)
 *
 * Security model:
 *   - Plaintext PIN is NEVER stored.
 *   - A random 16-byte salt is generated at PIN setup time.
 *   - Stored value: SHA-256(hex(salt) + pin)
 *   - A separate recovery code (user-visible, store offline) is hashed the same way.
 *
 * Limitations (disclosed to users):
 *   - This is a convenience access gate, NOT encryption.
 *   - Anyone with browser DevTools access can read localStorage directly.
 *   - There is no server-side enforcement.
 *   - Losing the PIN AND the recovery code requires a full data reset.
 *
 * Usage:
 *   import { setupPin, verifyPin, verifyRecovery, clearPin, hasPinSet } from './pin.js';
 */

import { getPinRecord, savePinRecord, removePinRecord } from '../storage/db.js';

/**
 * Hash a string using SHA-256 via SubtleCrypto.
 * @param {string} input
 * @returns {Promise<string>} hex-encoded hash
 */
async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random hex salt (16 bytes = 32 hex chars).
 * @returns {string}
 */
function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check whether a PIN has been configured.
 * @returns {boolean}
 */
export function hasPinSet() {
  return getPinRecord() !== null;
}

/**
 * Set up a new PIN.
 * @param {string} pin       - The PIN chosen by the user (e.g. "1234")
 * @param {string} recovery  - The recovery code (generated or user-provided)
 * @returns {Promise<void>}
 */
export async function setupPin(pin, recovery) {
  if (!pin || pin.length < 4) throw new Error('PIN harus minimal 4 digit.');
  if (!recovery || recovery.length < 8) throw new Error('Kode pemulihan harus minimal 8 karakter.');

  const salt = randomSalt();
  const hash = await sha256Hex(salt + pin);
  const recoveryHash = await sha256Hex(salt + recovery);

  savePinRecord({
    salt,
    hash,
    recoveryHash,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Verify a user-entered PIN against the stored hash.
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin) {
  const record = getPinRecord();
  if (!record) return true; // No PIN set — always passes
  const hash = await sha256Hex(record.salt + pin);
  return hash === record.hash;
}

/**
 * Verify a recovery code and clear the PIN if correct.
 * @param {string} recovery
 * @returns {Promise<boolean>} true if recovery succeeded and PIN was cleared
 */
export async function verifyRecovery(recovery) {
  const record = getPinRecord();
  if (!record) return false;
  const hash = await sha256Hex(record.salt + recovery);
  if (hash === record.recoveryHash) {
    removePinRecord();
    return true;
  }
  return false;
}

/**
 * Remove the PIN (disable the PIN gate).
 * Requires the current PIN to be verified first by the caller.
 */
export function clearPin() {
  removePinRecord();
}
