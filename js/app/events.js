/**
 * events.js — Application-wide event bus
 *
 * Simple pub/sub implementation.
 * Allows UI components and services to communicate without tight coupling.
 *
 * Usage:
 *   import { on, off, emit } from './events.js';
 *   on('transactions:posted', handler);
 *   emit('transactions:posted', { id: 'txn_...' });
 *   off('transactions:posted', handler);
 *
 * Standard event names are documented in docs/architecture.md.
 */

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {Function} handler
 */
export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
}

/**
 * Unsubscribe from an event.
 * @param {string} event
 * @param {Function} handler
 */
export function off(event, handler) {
  listeners.get(event)?.delete(handler);
}

/**
 * Emit an event with optional payload.
 * @param {string} event
 * @param {*} [payload]
 */
export function emit(event, payload) {
  listeners.get(event)?.forEach(handler => {
    try {
      handler(payload);
    } catch (err) {
      // Errors in one handler must not prevent other handlers from running
      console.error(`[EventBus] Error in handler for "${event}":`, err);
    }
  });
}

/**
 * Subscribe to an event once — auto-removes after first call.
 * @param {string} event
 * @param {Function} handler
 */
export function once(event, handler) {
  const wrapper = payload => {
    handler(payload);
    off(event, wrapper);
  };
  on(event, wrapper);
}

// Standard event name constants — import these to avoid typo-based bugs
export const EVENTS = Object.freeze({
  // Navigation
  NAVIGATE:              'app:navigate',

  // Business configuration
  BUSINESS_SAVED:        'business:saved',

  // Accounts
  ACCOUNT_CREATED:       'account:created',
  ACCOUNT_UPDATED:       'account:updated',

  // Transactions & journals
  TRANSACTION_POSTED:    'transaction:posted',
  TRANSACTION_REVERSED:  'transaction:reversed',

  // Inventory
  INVENTORY_UPDATED:     'inventory:updated',

  // Production
  PRODUCTION_COMPLETED:  'production:completed',

  // Data management
  BACKUP_EXPORTED:       'backup:exported',
  RESTORE_COMPLETED:     'restore:completed',

  // UI
  MODAL_CLOSE:           'modal:close',
});
