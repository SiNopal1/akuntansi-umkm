/**
 * state.js — In-memory application state
 *
 * Provides a minimal reactive store for the current session.
 * Persisted state lives in localStorage (js/storage/db.js).
 * This module only holds what needs to be shared across UI components
 * during a single browser session.
 *
 * Phase 1: Basic structure. Populated from localStorage in Phase 2.
 */

/** @type {object} Application state */
const state = {
  /** Whether the business has been configured */
  isConfigured: false,

  /** Business profile (populated in Phase 2) */
  business: null,

  /** Chart of accounts array (populated in Phase 2) */
  accounts: [],

  /** Whether the PIN gate has been cleared for this session */
  pinCleared: false,
};

/**
 * Get the full state object.
 * @returns {object}
 */
export function getState() {
  return state;
}

/**
 * Update one or more state properties.
 * @param {Partial<typeof state>} updates
 */
export function setState(updates) {
  Object.assign(state, updates);
}
