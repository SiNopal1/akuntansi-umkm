/**
 * migrations.js — Schema version upgrade handlers
 *
 * When the stored schemaVersion is lower than SCHEMA_VERSION,
 * runMigrations() applies each incremental upgrade in sequence.
 *
 * Migration functions receive the raw stored data and return
 * the upgraded version. They are append-only: never remove a
 * migration once it has been released.
 *
 * Each migration must:
 *   1. Be idempotent (safe to run twice).
 *   2. Preserve all existing data.
 *   3. Only change what is necessary for the new schema version.
 */

import { SCHEMA_VERSION, KEYS } from './schema.js';
import { getMeta, setMeta, dbGet, dbSet } from './db.js';

/**
 * Run all pending migrations for the current installation.
 * Called once during application init, before any other data access.
 */
export function runMigrations() {
  const meta = getMeta();
  if (!meta) return; // First install — no migration needed

  const storedVersion = meta.schemaVersion ?? 0;
  if (storedVersion >= SCHEMA_VERSION) return; // Up to date

  console.info(`[migrations] Upgrading schema from v${storedVersion} to v${SCHEMA_VERSION}`);

  let version = storedVersion;
  while (version < SCHEMA_VERSION) {
    const migrationFn = MIGRATIONS[version + 1];
    if (!migrationFn) {
      console.warn(`[migrations] No migration found for v${version} → v${version + 1}`);
      break;
    }
    try {
      migrationFn();
      version += 1;
      setMeta({ schemaVersion: version });
      console.info(`[migrations] Migrated to schema v${version}`);
    } catch (err) {
      console.error(`[migrations] Migration to v${version + 1} failed:`, err);
      throw new Error(`Migrasi data gagal (v${version} → v${version + 1}): ${err.message}`);
    }
  }
}

/**
 * Migration registry.
 * Key = target version number.
 * Value = migration function.
 *
 * MIGRATIONS[1] migrates from v0 → v1.
 * MIGRATIONS[2] migrates from v1 → v2. Etc.
 */
const MIGRATIONS = {
  // v0 → v1: Initial schema. No structural changes needed.
  // (v1 is the first released schema; there is nothing to migrate from v0.)
  1: function migrateToV1() {
    // No-op: v1 is the baseline. Any install that had pre-v1 data
    // would only have been a development snapshot. Nothing to transform.
  },
};
