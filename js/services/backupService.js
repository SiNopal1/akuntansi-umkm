/**
 * backupService.js — JSON export and import (restore) foundation
 *
 * Export: wraps all application data in a versioned envelope and
 * triggers a browser file download.
 *
 * Import: reads a JSON file, validates the envelope and contents,
 * shows a summary to the caller, and (after explicit confirmation)
 * replaces current data via db.restoreAllData().
 *
 * The PIN record is intentionally excluded from backups.
 * Restoring a backup does NOT restore the PIN — users must re-configure it.
 */

import { exportAllData, restoreAllData, setMeta } from '../storage/db.js';
import { SCHEMA_VERSION, APP_VERSION }             from '../storage/schema.js';

const BACKUP_FORMAT_VERSION = 1;
const BACKUP_TYPE_MARKER    = 'akuntansi-umkm-backup';

/**
 * Export all data as a JSON file download.
 * @param {string} [businessName] - used in the filename
 * @returns {string} the downloaded filename
 */
export function exportBackup(businessName = 'usaha') {
  const data     = exportAllData();
  const envelope = {
    _type:          BACKUP_TYPE_MARKER,
    _formatVersion: BACKUP_FORMAT_VERSION,
    _schemaVersion: SCHEMA_VERSION,
    _appVersion:    APP_VERSION,
    _exportedAt:    new Date().toISOString(),
    _businessName:  businessName,
    data,
  };

  const json     = JSON.stringify(envelope, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const date     = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
  const safeName = businessName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const filename = `cadangan_${safeName}_${date}.json`;

  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * @typedef {object} BackupValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 * @property {object|null} envelope   - the parsed envelope if valid
 * @property {object} summary         - human-readable restore summary
 */

/**
 * Read and validate a backup file.
 * @param {File} file
 * @returns {Promise<BackupValidationResult>}
 */
export async function validateBackupFile(file) {
  const errors  = [];
  const summary = {};

  // 1. Parse JSON
  let envelope;
  try {
    const text = await file.text();
    envelope = JSON.parse(text);
  } catch {
    return { valid: false, errors: ['File bukan JSON yang valid.'], envelope: null, summary };
  }

  // 2. Check type marker
  if (envelope._type !== BACKUP_TYPE_MARKER) {
    errors.push('File ini bukan cadangan Akuntansi UMKM yang valid.');
    return { valid: false, errors, envelope: null, summary };
  }

  // 3. Check format version
  if (typeof envelope._formatVersion !== 'number') {
    errors.push('Versi format cadangan tidak dikenali.');
    return { valid: false, errors, envelope: null, summary };
  }
  if (envelope._formatVersion > BACKUP_FORMAT_VERSION) {
    errors.push(`Cadangan ini dibuat oleh versi aplikasi yang lebih baru (format v${envelope._formatVersion}). Perbarui aplikasi terlebih dahulu.`);
    return { valid: false, errors, envelope: null, summary };
  }

  // 4. Check data object exists
  if (!envelope.data || typeof envelope.data !== 'object') {
    errors.push('Isi cadangan tidak ditemukan atau rusak.');
    return { valid: false, errors, envelope: null, summary };
  }

  // 5. Schema version compatibility
  if (envelope._schemaVersion > SCHEMA_VERSION) {
    errors.push(`Cadangan menggunakan schema v${envelope._schemaVersion}, aplikasi saat ini mendukung hingga v${SCHEMA_VERSION}.`);
    return { valid: false, errors, envelope: null, summary };
  }

  // 6. Build summary for the confirm dialog
  const d = envelope.data;
  summary.businessName  = d.business?.name  ?? '(tidak ada nama usaha)';
  summary.exportedAt    = envelope._exportedAt ?? '(tanggal tidak diketahui)';
  summary.appVersion    = envelope._appVersion ?? '(tidak diketahui)';
  summary.journalCount  = Array.isArray(d.journals)     ? d.journals.length     : 0;
  summary.txnCount      = Array.isArray(d.transactions) ? d.transactions.length : 0;
  summary.accountCount  = Array.isArray(d.accounts)     ? d.accounts.length     : 0;

  return { valid: true, errors: [], envelope, summary };
}

/**
 * Restore data from a validated backup envelope.
 * Saves a pre-restore snapshot to sessionStorage (available for this session only),
 * then replaces all localStorage data.
 *
 * Caller MUST have already validated the envelope via validateBackupFile()
 * and obtained explicit user confirmation before calling this.
 *
 * @param {object} envelope - result.envelope from validateBackupFile()
 */
export function performRestore(envelope) {
  // Safety: save current state to sessionStorage for emergency recovery this session
  try {
    const snapshot = exportAllData();
    sessionStorage.setItem('umkm_prerestore_backup', JSON.stringify(snapshot));
  } catch {
    // sessionStorage full or unavailable — proceed; user was warned about risks
  }

  restoreAllData(envelope.data);

  setMeta({
    lastOpenedAt: new Date().toISOString(),
    appVersion:   APP_VERSION,
  });
}
