/**
 * reports.js — Balance Sheet, Income Statement, Cash Flow Statement
 * All derived from the journal ledger. No separate report storage.
 */

import { getJournals, getAccounts, getOpening, getTransactions } from '../storage/db.js';
import { ACCOUNT_TYPE } from '../storage/schema.js';

// ─── Balance Sheet ────────────────────────────────────────────────────────────

/**
 * @param {string} asOfDate - ISO date
 * @returns {{ assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced }}
 */
export function buildBalanceSheet(asOfDate) {
  const accounts = getAccounts();
  const balances = computeBalancesUpTo(accounts, asOfDate);

  const group = type => accounts
    .filter(a => a.type === type && a.isActive)
    .map(a => ({ ...a, balance: balances.get(a.id) ?? 0 }))
    .filter(a => a.balance !== 0);

  const assets      = group(ACCOUNT_TYPE.ASSET);
  const liabilities = group(ACCOUNT_TYPE.LIABILITY);
  const equity      = group(ACCOUNT_TYPE.EQUITY);

  const netIncome   = buildIncomeStatement(currentFiscalStart(), asOfDate).netIncome;
  // Add current-period net income to retained earnings for balance sheet
  const retainedIdx = equity.findIndex(a => a.id === 'sys_laba_ditahan');
  if (retainedIdx >= 0) {
    equity[retainedIdx] = { ...equity[retainedIdx], balance: equity[retainedIdx].balance + netIncome };
  } else if (netIncome !== 0) {
    equity.push({ id: '_net_income', code: '3-9999', name: 'Laba Bersih Periode Berjalan', balance: netIncome });
  }

  const totalAssets      = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity      = equity.reduce((s, a) => s + a.balance, 0);

  return {
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
  };
}

// ─── Income Statement ─────────────────────────────────────────────────────────

/**
 * @param {string} fromDate
 * @param {string} toDate
 */
export function buildIncomeStatement(fromDate, toDate) {
  const accounts = getAccounts();
  const balances = computeBalancesInPeriod(accounts, fromDate, toDate);

  const group = type => accounts
    .filter(a => a.type === type && a.isActive)
    .map(a => ({ ...a, balance: balances.get(a.id) ?? 0 }))
    .filter(a => a.balance !== 0);

  const revenue   = group(ACCOUNT_TYPE.REVENUE);
  const cogs      = group(ACCOUNT_TYPE.COGS);
  const mfg       = group(ACCOUNT_TYPE.MANUFACTURING);
  const expenses  = group(ACCOUNT_TYPE.EXPENSE);

  const totalRevenue  = revenue.reduce((s, a) => s + a.balance, 0);
  const totalCOGS     = cogs.reduce((s, a) => s + a.balance, 0);
  const totalMfg      = mfg.reduce((s, a) => s + a.balance, 0);
  const grossProfit   = totalRevenue - totalCOGS - totalMfg;
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome     = grossProfit - totalExpenses;

  return { revenue, cogs, mfg, expenses, totalRevenue, totalCOGS, totalMfg, grossProfit, totalExpenses, netIncome };
}

// ─── Cash Flow Statement (Direct Method) ─────────────────────────────────────

/**
 * @param {string} fromDate
 * @param {string} toDate
 */
export function buildCashFlow(fromDate, toDate) {
  const txns = getTransactions().filter(t => t.status === 'POSTED' && t.date >= fromDate && t.date <= toDate);

  const operating = { inflows: [], outflows: [] };
  const investing  = { inflows: [], outflows: [] };
  const financing  = { inflows: [], outflows: [] };

  const OPERATING_IN   = ['SALE_CASH', 'CUSTOMER_RECEIPT'];
  const OPERATING_OUT  = ['PURCHASE_CASH', 'SUPPLIER_PAYMENT', 'EXPENSE_CASH'];
  const INVESTING_OUT  = [];
  const FINANCING_IN   = ['LOAN_RECEIVED', 'CAPITAL_IN'];
  const FINANCING_OUT  = ['LOAN_REPAYMENT', 'OWNER_WITHDRAWAL'];
  const EXCLUDED       = ['BANK_TRANSFER']; // internal — not cash flow

  for (const t of txns) {
    if (EXCLUDED.includes(t.type)) continue;
    const item = { description: t.description, amount: t.amount, date: t.date };
    if (OPERATING_IN.includes(t.type))   operating.inflows.push(item);
    else if (OPERATING_OUT.includes(t.type)) operating.outflows.push(item);
    else if (FINANCING_IN.includes(t.type))  financing.inflows.push(item);
    else if (FINANCING_OUT.includes(t.type)) financing.outflows.push(item);
  }

  const sum = arr => arr.reduce((s, i) => s + i.amount, 0);

  const operatingNet = sum(operating.inflows)  - sum(operating.outflows);
  const investingNet = sum(investing.inflows)  - sum(investing.outflows);
  const financingNet = sum(financing.inflows)  - sum(financing.outflows);
  const netChange    = operatingNet + investingNet + financingNet;

  return { operating, investing, financing, operatingNet, investingNet, financingNet, netChange };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeBalancesUpTo(accounts, upToDate) {
  const journals = getJournals().filter(j => j.status === 'POSTED' && j.date <= upToDate);
  return ledgerToBalances(accounts, journals);
}

function computeBalancesInPeriod(accounts, from, to) {
  const journals = getJournals().filter(j => j.status === 'POSTED' && j.date >= from && j.date <= to);
  return ledgerToBalances(accounts, journals);
}

function ledgerToBalances(accounts, journals) {
  const ledger = new Map();
  for (const j of journals) {
    for (const l of j.lines) {
      const c = ledger.get(l.accountId) ?? { debit: 0, credit: 0 };
      c.debit  += l.debit;
      c.credit += l.credit;
      ledger.set(l.accountId, c);
    }
  }
  const balances = new Map();
  for (const acc of accounts) {
    const e = ledger.get(acc.id) ?? { debit: 0, credit: 0 };
    balances.set(acc.id, acc.normalBalance === 'debit' ? e.debit - e.credit : e.credit - e.debit);
  }
  return balances;
}

function currentFiscalStart() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}
