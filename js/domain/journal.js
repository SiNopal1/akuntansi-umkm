/**
 * journal.js — Double-entry journal engine (Domain layer)
 *
 * Central accounting engine. Every financial event goes through here.
 * Invariant enforced: sum(debits) === sum(credits) on every posted entry.
 * Posted entries are immutable. Corrections use reversals + new entries.
 */

import { generateId }    from '../utils/id.js';
import { appendJournal, getJournals } from '../storage/db.js';

export class JournalError extends Error {
  constructor(msg) { super(msg); this.name = 'JournalError'; }
}

/**
 * Build and post a journal entry.
 * @param {{ date:string, description:string, reference?:string, lines:Array<{accountId,debit,credit}>, sourceTransactionId?:string }} opts
 * @returns {object} posted journal entry
 */
export function postJournal({ date, description, reference = '', lines, sourceTransactionId = null }) {
  // Validate balance
  const totalDebit  = lines.reduce((s, l) => s + (l.debit  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (totalDebit !== totalCredit) {
    throw new JournalError(
      `Jurnal tidak seimbang: debit=${totalDebit}, kredit=${totalCredit}`
    );
  }
  if (totalDebit === 0) throw new JournalError('Jurnal tidak boleh nol.');
  if (lines.length < 2)  throw new JournalError('Jurnal harus memiliki minimal 2 baris.');

  const entry = {
    id:                  generateId('jnl'),
    date,
    description,
    reference,
    status:              'POSTED',
    lines:               lines.map(l => ({
      accountId: l.accountId,
      debit:     l.debit  || 0,
      credit:    l.credit || 0,
    })),
    sourceTransactionId,
    postedAt:            new Date().toISOString(),
    createdAt:           new Date().toISOString(),
  };

  appendJournal(entry);
  return entry;
}

/**
 * Reverse a posted journal entry (create a mirror entry with swapped debits/credits).
 * @param {string} originalId
 * @param {string} date  - reversal date
 * @param {string} reason
 * @returns {object} reversal journal entry
 */
export function reverseJournal(originalId, date, reason) {
  const journals = getJournals();
  const original = journals.find(j => j.id === originalId);
  if (!original) throw new JournalError(`Jurnal ${originalId} tidak ditemukan.`);
  if (original.status !== 'POSTED') throw new JournalError('Hanya jurnal POSTED yang dapat dibalik.');

  const reversalLines = original.lines.map(l => ({
    accountId: l.accountId,
    debit:     l.credit,  // swapped
    credit:    l.debit,
  }));

  return postJournal({
    date,
    description: `[KOREKSI] ${original.description} — ${reason}`,
    reference:   `REV-${original.reference || original.id.slice(0, 8)}`,
    lines:       reversalLines,
    sourceTransactionId: original.sourceTransactionId,
  });
}

/**
 * Compute account balances from all posted journal entries up to (and including) a date.
 * Returns a Map<accountId, balance> where balance is positive = normal balance side.
 * @param {Array} accounts
 * @param {string} [upToDate] - ISO date, inclusive. If omitted, uses all entries.
 * @returns {Map<string, number>}
 */
export function computeBalances(accounts, upToDate = null) {
  const journals = getJournals().filter(j => j.status === 'POSTED');
  const filtered = upToDate ? journals.filter(j => j.date <= upToDate) : journals;

  // accountId → { debit: number, credit: number }
  const ledger = new Map();
  for (const j of filtered) {
    for (const l of j.lines) {
      const curr = ledger.get(l.accountId) ?? { debit: 0, credit: 0 };
      curr.debit  += l.debit;
      curr.credit += l.credit;
      ledger.set(l.accountId, curr);
    }
  }

  // Convert to net balance per account normal balance direction
  const balances = new Map();
  for (const acc of accounts) {
    const entry = ledger.get(acc.id) ?? { debit: 0, credit: 0 };
    const balance = acc.normalBalance === 'debit'
      ? entry.debit - entry.credit
      : entry.credit - entry.debit;
    balances.set(acc.id, balance);
  }
  return balances;
}

/**
 * Get all journal lines for a specific account in a date range.
 * @param {string} accountId
 * @param {string} from  - ISO date
 * @param {string} to    - ISO date
 * @returns {Array<{journal, line}>}
 */
export function getAccountLedger(accountId, from, to) {
  return getJournals()
    .filter(j => j.status === 'POSTED' && j.date >= from && j.date <= to)
    .flatMap(j => j.lines
      .filter(l => l.accountId === accountId)
      .map(l => ({ journal: j, line: l }))
    );
}
