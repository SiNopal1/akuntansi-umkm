/**
 * transactions.js — Business event → journal entry translation (Domain layer)
 *
 * Maps named transaction types to journal templates.
 * The UI submits a business event; this module produces balanced journal lines
 * and calls the journal engine to post them.
 *
 * MVP transaction types supported:
 *   SALE_CASH, SALE_CREDIT, CUSTOMER_RECEIPT,
 *   PURCHASE_CASH, PURCHASE_CREDIT, SUPPLIER_PAYMENT,
 *   EXPENSE_CASH, EXPENSE_CREDIT,
 *   BANK_TRANSFER,
 *   CAPITAL_IN, OWNER_WITHDRAWAL,
 *   LOAN_RECEIVED, LOAN_REPAYMENT,
 *   INVENTORY_ADJUSTMENT, COGS_MANUAL
 */

import { postJournal, JournalError } from './journal.js';
import { SYS_ACCOUNTS }              from './accounts.js';
import { generateId }                from '../utils/id.js';
import { appendTransaction, getAccounts } from '../storage/db.js';

export const TX_TYPE = Object.freeze({
  SALE_CASH:          'SALE_CASH',
  SALE_CREDIT:        'SALE_CREDIT',
  CUSTOMER_RECEIPT:   'CUSTOMER_RECEIPT',
  PURCHASE_CASH:      'PURCHASE_CASH',
  PURCHASE_CREDIT:    'PURCHASE_CREDIT',
  SUPPLIER_PAYMENT:   'SUPPLIER_PAYMENT',
  EXPENSE_CASH:       'EXPENSE_CASH',
  EXPENSE_CREDIT:     'EXPENSE_CREDIT',
  BANK_TRANSFER:      'BANK_TRANSFER',
  CAPITAL_IN:         'CAPITAL_IN',
  OWNER_WITHDRAWAL:   'OWNER_WITHDRAWAL',
  LOAN_RECEIVED:      'LOAN_RECEIVED',
  LOAN_REPAYMENT:     'LOAN_REPAYMENT',
  INVENTORY_ADJUSTMENT: 'INVENTORY_ADJUSTMENT',
  COGS_MANUAL:        'COGS_MANUAL',
  PRODUCTION_START:   'PRODUCTION_START',
  PRODUCTION_COMPLETE:'PRODUCTION_COMPLETE',
  JOURNAL_MANUAL:     'JOURNAL_MANUAL',
});

export const TX_TYPE_LABELS = {
  [TX_TYPE.SALE_CASH]:         'Penjualan Tunai',
  [TX_TYPE.SALE_CREDIT]:       'Penjualan Kredit',
  [TX_TYPE.CUSTOMER_RECEIPT]:  'Penerimaan Piutang',
  [TX_TYPE.PURCHASE_CASH]:     'Pembelian Tunai',
  [TX_TYPE.PURCHASE_CREDIT]:   'Pembelian Kredit',
  [TX_TYPE.SUPPLIER_PAYMENT]:  'Pembayaran Utang',
  [TX_TYPE.EXPENSE_CASH]:      'Beban Tunai',
  [TX_TYPE.EXPENSE_CREDIT]:    'Beban Kredit',
  [TX_TYPE.BANK_TRANSFER]:     'Transfer Kas/Bank',
  [TX_TYPE.CAPITAL_IN]:        'Setoran Modal',
  [TX_TYPE.OWNER_WITHDRAWAL]:  'Pengambilan Pemilik',
  [TX_TYPE.LOAN_RECEIVED]:     'Penerimaan Pinjaman',
  [TX_TYPE.LOAN_REPAYMENT]:    'Cicilan Pinjaman',
  [TX_TYPE.INVENTORY_ADJUSTMENT]: 'Penyesuaian Persediaan',
  [TX_TYPE.COGS_MANUAL]:       'HPP Manual',
  [TX_TYPE.PRODUCTION_START]:  'Mulai Produksi',
  [TX_TYPE.PRODUCTION_COMPLETE]: 'Selesai Produksi',
  [TX_TYPE.JOURNAL_MANUAL]:    'Jurnal Manual',
};

/**
 * Post a business transaction.
 * Builds journal lines from the template and delegates to postJournal().
 *
 * @param {{
 *   type: string,
 *   date: string,
 *   description: string,
 *   reference?: string,
 *   amount: number,
 *   accountId?: string,        // target account (varies by type)
 *   accountId2?: string,       // secondary account (transfers, repayments)
 *   interestAmount?: number,   // for LOAN_REPAYMENT
 * }} opts
 * @returns {{ transaction: object, journal: object }}
 */
export function postTransaction(opts) {
  const { type, date, description, reference = '', amount, accountId, accountId2, interestAmount = 0 } = opts;

  const accounts  = getAccounts();
  const byId      = id => accounts.find(a => a.id === id);
  const sys       = SYS_ACCOUNTS;

  let lines;

  switch (type) {

    case TX_TYPE.SALE_CASH:
      // Dr Kas/Bank  Cr Pendapatan
      lines = [
        { accountId: accountId || sys.KAS,        debit: amount,  credit: 0      },
        { accountId: sys.PENDAPATAN,               debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.SALE_CREDIT:
      // Dr Piutang  Cr Pendapatan
      lines = [
        { accountId: sys.PIUTANG_USAHA,            debit: amount,  credit: 0      },
        { accountId: sys.PENDAPATAN,               debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.CUSTOMER_RECEIPT:
      // Dr Kas/Bank  Cr Piutang  — NOT new revenue
      lines = [
        { accountId: accountId || sys.KAS,         debit: amount,  credit: 0      },
        { accountId: sys.PIUTANG_USAHA,            debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.PURCHASE_CASH:
      // Dr Persediaan/Aset  Cr Kas/Bank
      lines = [
        { accountId: accountId  || sys.BAHAN_BAKU, debit: amount,  credit: 0      },
        { accountId: accountId2 || sys.KAS,        debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.PURCHASE_CREDIT:
      // Dr Persediaan/Aset  Cr Utang Usaha
      lines = [
        { accountId: accountId  || sys.BAHAN_BAKU, debit: amount,  credit: 0      },
        { accountId: sys.UTANG_USAHA,              debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.SUPPLIER_PAYMENT:
      // Dr Utang Usaha  Cr Kas/Bank — NOT a new purchase
      lines = [
        { accountId: sys.UTANG_USAHA,              debit: amount,  credit: 0      },
        { accountId: accountId || sys.KAS,         debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.EXPENSE_CASH:
      // Dr Beban  Cr Kas/Bank
      lines = [
        { accountId: accountId  || sys.BIAYA_ADMIN, debit: amount, credit: 0      },
        { accountId: accountId2 || sys.KAS,         debit: 0,      credit: amount },
      ];
      break;

    case TX_TYPE.EXPENSE_CREDIT:
      // Dr Beban  Cr Utang Usaha
      lines = [
        { accountId: accountId  || sys.BIAYA_ADMIN, debit: amount, credit: 0      },
        { accountId: sys.UTANG_USAHA,               debit: 0,      credit: amount },
      ];
      break;

    case TX_TYPE.BANK_TRANSFER:
      // Dr Destination  Cr Source — internal, not income/expense
      if (!accountId || !accountId2) throw new JournalError('Transfer membutuhkan akun asal dan tujuan.');
      if (accountId === accountId2)  throw new JournalError('Akun asal dan tujuan tidak boleh sama.');
      lines = [
        { accountId: accountId2, debit: amount,  credit: 0      },
        { accountId: accountId,  debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.CAPITAL_IN:
      // Dr Kas/Bank  Cr Modal Pemilik
      lines = [
        { accountId: accountId || sys.KAS,         debit: amount,  credit: 0      },
        { accountId: sys.MODAL_PEMILIK,            debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.OWNER_WITHDRAWAL:
      // Dr Prive  Cr Kas/Bank
      lines = [
        { accountId: sys.PRIVE,                    debit: amount,  credit: 0      },
        { accountId: accountId || sys.KAS,         debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.LOAN_RECEIVED:
      // Dr Kas/Bank  Cr Utang Bank
      lines = [
        { accountId: accountId || sys.KAS,         debit: amount,  credit: 0      },
        { accountId: sys.UTANG_BANK,               debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.LOAN_REPAYMENT: {
      // Dr Utang Bank (principal)  Dr Beban Bunga (interest)  Cr Kas/Bank
      const principal = amount;
      const interest  = interestAmount || 0;
      const total     = principal + interest;
      lines = [
        { accountId: sys.UTANG_BANK,               debit: principal, credit: 0     },
        ...(interest > 0 ? [
          { accountId: sys.BIAYA_BUNGA,            debit: interest,  credit: 0     },
        ] : []),
        { accountId: accountId || sys.KAS,         debit: 0,         credit: total },
      ];
      break;
    }

    case TX_TYPE.INVENTORY_ADJUSTMENT:
      // Dr/Cr Persediaan  Cr/Dr Beban Lain-lain
      if (amount > 0) {
        lines = [
          { accountId: accountId || sys.BAHAN_BAKU, debit: amount,  credit: 0      },
          { accountId: sys.BEBAN_LAIN,              debit: 0,       credit: amount },
        ];
      } else {
        const abs = Math.abs(amount);
        lines = [
          { accountId: sys.BEBAN_LAIN,              debit: abs,     credit: 0      },
          { accountId: accountId || sys.BAHAN_BAKU, debit: 0,       credit: abs    },
        ];
      }
      break;

    case TX_TYPE.COGS_MANUAL:
      // Dr HPP  Cr Persediaan Barang Jadi
      lines = [
        { accountId: sys.HPP,                      debit: amount,  credit: 0      },
        { accountId: sys.BARANG_JADI,              debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.PRODUCTION_START:
      // Dr WIP  Cr Bahan Baku
      lines = [
        { accountId: sys.BARANG_WIP,               debit: amount,  credit: 0      },
        { accountId: accountId || sys.BAHAN_BAKU,  debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.PRODUCTION_COMPLETE:
      // Dr Barang Jadi  Cr WIP
      lines = [
        { accountId: sys.BARANG_JADI,              debit: amount,  credit: 0      },
        { accountId: sys.BARANG_WIP,               debit: 0,       credit: amount },
      ];
      break;

    case TX_TYPE.JOURNAL_MANUAL:
      // opts.lines must be provided directly
      if (!opts.lines || opts.lines.length < 2) throw new JournalError('Jurnal manual butuh minimal 2 baris.');
      lines = opts.lines;
      break;

    default:
      throw new JournalError(`Jenis transaksi tidak dikenal: ${type}`);
  }

  const journal = postJournal({ date, description, reference, lines });

  const transaction = {
    id:          generateId('txn'),
    type,
    date,
    description,
    reference,
    amount,
    accountId:   accountId  || null,
    accountId2:  accountId2 || null,
    journalId:   journal.id,
    status:      'POSTED',
    createdAt:   new Date().toISOString(),
  };

  appendTransaction(transaction);
  return { transaction, journal };
}
