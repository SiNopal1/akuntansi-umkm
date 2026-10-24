/**
 * inventory.js — Inventory quantities and Moving Weighted-Average Cost engine
 */

import { generateId }  from '../utils/id.js';
import { dbGet, dbSet } from '../storage/db.js';
import { KEYS }        from '../storage/schema.js';

// Each inventory record: { id, itemId, itemType, qty (string fixed-decimal), wac (integer IDR), updatedAt }
// itemType: 'material' | 'product'

function getInventory() { return dbGet(KEYS.INVENTORY) ?? []; }
function saveInventory(inv) { dbSet(KEYS.INVENTORY, inv); }

/** Get inventory record for an item, or null */
export function getItemInventory(itemId) {
  return getInventory().find(r => r.itemId === itemId) ?? null;
}

/**
 * Record a receipt (purchase or production input) — updates WAC.
 * @param {string} itemId
 * @param {string} itemType - 'material' | 'product'
 * @param {number} qty
 * @param {number} unitCost - integer IDR per unit
 */
export function receiveItem(itemId, itemType, qty, unitCost) {
  const inv = getInventory();
  let rec   = inv.find(r => r.itemId === itemId);

  if (!rec) {
    rec = { id: generateId('inv'), itemId, itemType, qty: 0, wac: 0, updatedAt: '' };
    inv.push(rec);
  }

  const oldQty  = rec.qty;
  const newQty  = oldQty + qty;
  // Moving WAC = (old qty × old WAC + incoming qty × unit cost) / new qty
  rec.wac       = newQty > 0 ? Math.round((oldQty * rec.wac + qty * unitCost) / newQty) : 0;
  rec.qty       = newQty;
  rec.updatedAt = new Date().toISOString();

  saveInventory(inv);
  return rec;
}

/**
 * Issue (consume) stock. Throws if insufficient stock.
 * @param {string} itemId
 * @param {number} qty
 * @returns {{ unitCost: number, totalCost: number }}
 */
export function issueItem(itemId, qty) {
  const inv = getInventory();
  const rec = inv.find(r => r.itemId === itemId);

  if (!rec || rec.qty < qty) {
    throw new Error(`Stok tidak mencukupi untuk item ${itemId}. Tersedia: ${rec?.qty ?? 0}, Dibutuhkan: ${qty}`);
  }

  const unitCost  = rec.wac;
  const totalCost = Math.round(qty * unitCost);
  rec.qty        -= qty;
  rec.updatedAt   = new Date().toISOString();

  saveInventory(inv);
  return { unitCost, totalCost };
}

/**
 * Adjust inventory quantity (positive or negative).
 * @param {string} itemId
 * @param {number} delta  - positive = add, negative = remove
 * @param {number} [unitCost] - required for positive adjustments
 */
export function adjustItem(itemId, delta, unitCost = 0) {
  if (delta > 0) return receiveItem(itemId, 'material', delta, unitCost);

  const inv = getInventory();
  const rec = inv.find(r => r.itemId === itemId);
  if (!rec) throw new Error(`Item ${itemId} tidak ditemukan di inventaris.`);
  if (rec.qty + delta < 0) throw new Error(`Penyesuaian akan membuat stok negatif.`);

  rec.qty      += delta;
  rec.updatedAt = new Date().toISOString();
  saveInventory(inv);
  return rec;
}

/** Get all inventory records with quantities > 0 */
export function getAllInventory() { return getInventory(); }
