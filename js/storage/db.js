/**
 * db.js — localStorage abstraction layer
 *
 * All localStorage reads and writes MUST go through this module.
 * No other module may call localStorage directly.
 *
 * Responsibilities:
 * - Safe serialisation / deserialisation with error handling
 * - Storage quota detection
 * - Atomic replace for arrays (read → modify → write as one logical operation)
 * - User-visible errors when persistence fails
 *
 * Returns null on read failure (missing key or parse error).
 * Throws StorageError on write failure so callers can surface the problem.
 */

import { KEYS, SCHEMA_VERSION, APP_VERSION } from './schema.js';

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

// ─── Low-level read / write ───────────────────────────────────────────────────

/**
 * Read and parse a JSON value from localStorage.
 * @param {string} key
 * @returns {*|null} Parsed value, or null if missing or unparseable.
 */
export function dbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[db] Failed to read key "${key}":`, err);
    return null;
  }
}

/**
 * Serialise and write a value to localStorage.
 * @param {string} key
 * @param {*} value
 * @throws {StorageError} if localStorage is unavailable or quota is exceeded
 */
export function dbSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      throw new StorageError(
        'Ruang penyimpanan browser penuh. Buat cadangan data dan hapus data lama untuk melanjutkan.',
        err
      );
    }
    throw new StorageError(`Gagal menyimpan data (${key}): ${err.message}`, err);
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function dbRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`[db] Failed to remove key "${key}":`, err);
  }
}

/**
 * Check whether localStorage is available in this browser.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = '__umkm_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ─── Meta / version management ────────────────────────────────────────────────

/**
 * Read the meta record. Returns null if not yet initialised.
 * @returns {object|null}
 */
export function getMeta() {
  return dbGet(KEYS.META);
}

/**
 * Write or update the meta record.
 * @param {Partial<object>} updates
 */
export function setMeta(updates) {
  const current = getMeta() ?? {};
  dbSet(KEYS.META, { ...current, ...updates });
}

/**
 * Initialise meta on first install.
 */
export function initMeta() {
  const now = new Date().toISOString();
  const existing = getMeta();
  if (!existing) {
    dbSet(KEYS.META, {
      schemaVersion: SCHEMA_VERSION,
      appVersion:    APP_VERSION,
      installedAt:   now,
      lastOpenedAt:  now,
    });
  } else {
    setMeta({ lastOpenedAt: now, appVersion: APP_VERSION });
  }
}

// ─── Business profile ────────────────────────────────────────────────────────

/** @returns {object|null} */
export function getBusiness() {
  return dbGet(KEYS.BUSINESS);
}

/** @param {object} business */
export function saveBusiness(business) {
  dbSet(KEYS.BUSINESS, business);
}

// ─── Chart of accounts ───────────────────────────────────────────────────────

/** @returns {Array} */
export function getAccounts() {
  return dbGet(KEYS.ACCOUNTS) ?? [];
}

/** @param {Array} accounts */
export function saveAccounts(accounts) {
  dbSet(KEYS.ACCOUNTS, accounts);
}

/**
 * Upsert a single account (insert or replace by id).
 * @param {object} account
 */
export function upsertAccount(account) {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveAccounts(accounts);
}

// ─── Opening balances ────────────────────────────────────────────────────────

/** @returns {object|null} */
export function getOpening() {
  return dbGet(KEYS.OPENING);
}

/** @param {object} opening */
export function saveOpening(opening) {
  dbSet(KEYS.OPENING, opening);
}

// ─── Journals (immutable once posted) ────────────────────────────────────────

/** @returns {Array} */
export function getJournals() {
  return dbGet(KEYS.JOURNALS) ?? [];
}

/** @param {Array} journals */
export function saveJournals(journals) {
  dbSet(KEYS.JOURNALS, journals);
}

/**
 * Append a new journal entry. Never modifies existing entries.
 * @param {object} journal
 */
export function appendJournal(journal) {
  const journals = getJournals();
  journals.push(journal);
  saveJournals(journals);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** @returns {Array} */
export function getTransactions() {
  return dbGet(KEYS.TRANSACTIONS) ?? [];
}

/** @param {Array} transactions */
export function saveTransactions(transactions) {
  dbSet(KEYS.TRANSACTIONS, transactions);
}

/** @param {object} transaction */
export function appendTransaction(transaction) {
  const txns = getTransactions();
  txns.push(transaction);
  saveTransactions(txns);
}

// ─── Tax configuration ────────────────────────────────────────────────────────

/** @returns {object|null} */
export function getTaxConfig() {
  return dbGet(KEYS.TAX_CONFIG);
}

/** @param {object} config */
export function saveTaxConfig(config) {
  dbSet(KEYS.TAX_CONFIG, config);
}

// ─── PIN ──────────────────────────────────────────────────────────────────────

/** @returns {object|null} */
export function getPinRecord() {
  return dbGet(KEYS.PIN);
}

/** @param {object} pinRecord */
export function savePinRecord(pinRecord) {
  dbSet(KEYS.PIN, pinRecord);
}

/** Remove PIN (disables PIN gate) */
export function removePinRecord() {
  dbRemove(KEYS.PIN);
}

// ─── Full export (for backup) ─────────────────────────────────────────────────

/**
 * Export all application data as a plain object for JSON serialisation.
 * The PIN record is intentionally excluded from backups.
 * @returns {object}
 */
export function exportAllData() {
  return {
    meta:         getMeta(),
    business:     getBusiness(),
    accounts:     getAccounts(),
    opening:      getOpening(),
    journals:     getJournals(),
    transactions: getTransactions(),
    taxConfig:    getTaxConfig(),
    products:     dbGet(KEYS.PRODUCTS)    ?? [],
    materials:    dbGet(KEYS.MATERIALS)   ?? [],
    bom:          dbGet(KEYS.BOM)         ?? [],
    inventory:    dbGet(KEYS.INVENTORY)   ?? [],
    production:   dbGet(KEYS.PRODUCTION)  ?? [],
  };
}

/**
 * Restore all data from a validated backup object.
 * Caller must validate the backup before passing it here.
 * @param {object} data
 */
export function restoreAllData(data) {
  if (data.meta)         dbSet(KEYS.META,         data.meta);
  if (data.business)     dbSet(KEYS.BUSINESS,      data.business);
  if (data.accounts)     dbSet(KEYS.ACCOUNTS,      data.accounts);
  if (data.opening)      dbSet(KEYS.OPENING,       data.opening);
  if (data.journals)     dbSet(KEYS.JOURNALS,      data.journals);
  if (data.transactions) dbSet(KEYS.TRANSACTIONS,  data.transactions);
  if (data.taxConfig)    dbSet(KEYS.TAX_CONFIG,    data.taxConfig);
  if (data.products)     dbSet(KEYS.PRODUCTS,      data.products);
  if (data.materials)    dbSet(KEYS.MATERIALS,     data.materials);
  if (data.bom)          dbSet(KEYS.BOM,           data.bom);
  if (data.inventory)    dbSet(KEYS.INVENTORY,     data.inventory);
  if (data.production)   dbSet(KEYS.PRODUCTION,    data.production);
}
