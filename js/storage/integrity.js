/**
 * integrity.js — Referential consistency checks
 *
 * These checks are run after restore operations and can be invoked
 * on-demand to verify that the stored data is internally consistent.
 *
 * They do NOT modify data — they only report problems.
 * Each check returns { ok: boolean, issues: string[] }.
 */

import { getAccounts, getJournals, getTransactions, getOpening } from './db.js';

/**
 * @typedef {object} IntegrityResult
 * @property {boolean}  ok
 * @property {string[]} issues
 */

/**
 * Run all integrity checks and return the combined result.
 * @returns {IntegrityResult}
 */
export function runAllChecks() {
  const results = [
    checkJournalBalance(),
    checkTransactionJournalLinks(),
    checkAccountsNoDuplicateCodes(),
    checkOpeningBalance(),
  ];

  const issues = results.flatMap(r => r.issues);
  return { ok: issues.length === 0, issues };
}

/**
 * Verify every posted journal entry has balanced debits and credits.
 * @returns {IntegrityResult}
 */
export function checkJournalBalance() {
  const journals = getJournals();
  const issues = [];

  for (const j of journals) {
    if (j.status !== 'POSTED') continue;
    const totalDebit  = j.lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
    const totalCredit = j.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (totalDebit !== totalCredit) {
      issues.push(`Jurnal ${j.id} tidak seimbang: debit=${totalDebit}, kredit=${totalCredit}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Verify every posted transaction has a corresponding journal entry.
 * @returns {IntegrityResult}
 */
export function checkTransactionJournalLinks() {
  const transactions = getTransactions();
  const journals     = getJournals();
  const journalIds   = new Set(journals.map(j => j.id));
  const issues = [];

  for (const t of transactions) {
    if (t.status !== 'POSTED') continue;
    if (t.journalId && !journalIds.has(t.journalId)) {
      issues.push(`Transaksi ${t.id} merujuk jurnal ${t.journalId} yang tidak ditemukan`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Verify no two accounts share the same code.
 * @returns {IntegrityResult}
 */
export function checkAccountsNoDuplicateCodes() {
  const accounts = getAccounts();
  const codes = {};
  const issues = [];

  for (const a of accounts) {
    if (codes[a.code]) {
      issues.push(`Kode akun duplikat: "${a.code}" (${a.id} dan ${codes[a.code]})`);
    }
    codes[a.code] = a.id;
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Verify the opening balance entry is balanced (if it exists and is posted).
 * @returns {IntegrityResult}
 */
export function checkOpeningBalance() {
  const opening = getOpening();
  if (!opening || !opening.isPosted) return { ok: true, issues: [] };

  const totalDebit  = opening.lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
  const totalCredit = opening.lines.reduce((s, l) => s + (l.credit ?? 0), 0);

  if (totalDebit !== totalCredit) {
    return {
      ok: false,
      issues: [`Saldo awal tidak seimbang: debit=${totalDebit}, kredit=${totalCredit}`],
    };
  }

  return { ok: true, issues: [] };
}
