/**
 * accounts.js — Chart of accounts domain rules and default COA
 *
 * Responsibilities:
 * - Provides the default chart of accounts for a new business
 * - Enforces system account protection
 * - Validates account creation and modification
 * - Maps accounts to financial statement sections
 *
 * IMPORTANT: Report mappings are based on account TYPE and CATEGORY,
 * never on account names or codes. Do not hard-code report totals
 * by name matching.
 */

import { ACCOUNT_TYPE, ACCOUNT_CATEGORY } from '../storage/schema.js';

// ─── System account IDs ────────────────────────────────────────────────────────
// These IDs are stable references used by the accounting engine.
// They must never be changed after first installation.
export const SYS_ACCOUNTS = Object.freeze({
  KAS:               'sys_kas',
  BANK:              'sys_bank',
  PIUTANG_USAHA:     'sys_piutang_usaha',
  BAHAN_BAKU:        'sys_bahan_baku',
  BARANG_WIP:        'sys_barang_wip',
  BARANG_JADI:       'sys_barang_jadi',
  UANG_MUKA:         'sys_uang_muka',
  ASET_TETAP:        'sys_aset_tetap',
  AKUM_PENYUSUTAN:   'sys_akum_penyusutan',
  UTANG_USAHA:       'sys_utang_usaha',
  UTANG_GAJI:        'sys_utang_gaji',
  UTANG_PPH:         'sys_utang_pph',
  UTANG_PPN:         'sys_utang_ppn',
  UTANG_BANK:        'sys_utang_bank',
  MODAL_PEMILIK:     'sys_modal_pemilik',
  PRIVE:             'sys_prive',
  LABA_DITAHAN:      'sys_laba_ditahan',
  PENDAPATAN:        'sys_pendapatan',
  PENDAPATAN_LAIN:   'sys_pendapatan_lain',
  HPP:               'sys_hpp',
  BIAYA_BBL:         'sys_biaya_bbl',
  BIAYA_TKL:         'sys_biaya_tkl',
  BIAYA_OVERHEAD:    'sys_biaya_overhead',
  BIAYA_GAJI:        'sys_biaya_gaji',
  BIAYA_SEWA:        'sys_biaya_sewa',
  BIAYA_UTILITAS:    'sys_biaya_utilitas',
  BIAYA_PEMASARAN:   'sys_biaya_pemasaran',
  BIAYA_PENYUSUTAN:  'sys_biaya_penyusutan',
  BIAYA_ADMIN:       'sys_biaya_admin',
  BIAYA_BUNGA:       'sys_biaya_bunga',
  BEBAN_PPH:         'sys_beban_pph',
  BEBAN_LAIN:        'sys_beban_lain',
});

/**
 * Generate the default chart of accounts for a new business.
 * Called once during first-time setup.
 * @returns {Array<object>} Array of account objects
 */
export function buildDefaultAccounts() {
  const now = new Date().toISOString();

  const def = (id, code, name, type, normalBalance, category, description = '') => ({
    id,
    code,
    name,
    type,
    normalBalance,
    category,
    isSystem:  true,
    isActive:  true,
    parentId:  null,
    description,
    createdAt: now,
  });

  return [
    // ── ASSETS ──────────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.KAS,             '1-1000', 'Kas',                              ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.CASH,               'Uang tunai di tangan'),
    def(SYS_ACCOUNTS.BANK,            '1-1100', 'Bank',                             ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.BANK,               'Rekening bank utama'),
    def(SYS_ACCOUNTS.PIUTANG_USAHA,   '1-1200', 'Piutang Usaha',                    ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.RECEIVABLE,         'Tagihan kepada pelanggan'),
    def(SYS_ACCOUNTS.BAHAN_BAKU,      '1-1300', 'Persediaan Bahan Baku',            ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.INVENTORY_RAW,     'Bahan baku untuk produksi'),
    def(SYS_ACCOUNTS.BARANG_WIP,      '1-1400', 'Persediaan Barang Dalam Proses',   ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.INVENTORY_WIP,     'Biaya produksi yang sedang berjalan'),
    def(SYS_ACCOUNTS.BARANG_JADI,     '1-1500', 'Persediaan Barang Jadi',           ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.INVENTORY_FG,      'Produk selesai siap jual'),
    def(SYS_ACCOUNTS.UANG_MUKA,       '1-1600', 'Uang Muka & Biaya Dibayar Dimuka', ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.PREPAID,            'Pembayaran di muka'),
    def(SYS_ACCOUNTS.ASET_TETAP,      '1-2000', 'Aset Tetap',                       ACCOUNT_TYPE.ASSET,    'debit',  ACCOUNT_CATEGORY.FIXED_ASSET,        'Mesin, kendaraan, bangunan'),
    def(SYS_ACCOUNTS.AKUM_PENYUSUTAN, '1-2100', 'Akumulasi Penyusutan',             ACCOUNT_TYPE.ASSET,    'credit', ACCOUNT_CATEGORY.ACCUM_DEPRECIATION, 'Kontra-aset: akumulasi penyusutan'),

    // ── LIABILITIES ─────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.UTANG_USAHA,     '2-1000', 'Utang Usaha',                      ACCOUNT_TYPE.LIABILITY,'credit', ACCOUNT_CATEGORY.PAYABLE,            'Tagihan dari pemasok'),
    def(SYS_ACCOUNTS.UTANG_GAJI,      '2-1100', 'Utang Gaji',                       ACCOUNT_TYPE.LIABILITY,'credit', ACCOUNT_CATEGORY.WAGES_PAYABLE,      'Gaji yang belum dibayar'),
    def(SYS_ACCOUNTS.UTANG_PPH,       '2-1200', 'Utang Pajak PPh Final',            ACCOUNT_TYPE.LIABILITY,'credit', ACCOUNT_CATEGORY.TAX_PAYABLE,        'PPh Final yang belum disetorkan'),
    def(SYS_ACCOUNTS.UTANG_PPN,       '2-1300', 'Utang PPN',                        ACCOUNT_TYPE.LIABILITY,'credit', ACCOUNT_CATEGORY.VAT_PAYABLE,        'PPN yang belum disetorkan (PKP)'),
    def(SYS_ACCOUNTS.UTANG_BANK,      '2-2000', 'Utang Bank / Pinjaman',            ACCOUNT_TYPE.LIABILITY,'credit', ACCOUNT_CATEGORY.LOAN,               'Pinjaman dari bank atau pihak lain'),

    // ── EQUITY ──────────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.MODAL_PEMILIK,   '3-1000', 'Modal Pemilik',                    ACCOUNT_TYPE.EQUITY,   'credit', ACCOUNT_CATEGORY.OWNER_CAPITAL,      'Modal yang disetorkan pemilik'),
    def(SYS_ACCOUNTS.PRIVE,           '3-1100', 'Prive (Pengambilan Pemilik)',       ACCOUNT_TYPE.EQUITY,   'debit',  ACCOUNT_CATEGORY.OWNER_DRAWINGS,     'Pengambilan pribadi pemilik'),
    def(SYS_ACCOUNTS.LABA_DITAHAN,    '3-1200', 'Laba Ditahan',                     ACCOUNT_TYPE.EQUITY,   'credit', ACCOUNT_CATEGORY.RETAINED_EARNINGS,  'Akumulasi laba yang tidak dibagi'),

    // ── REVENUE ─────────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.PENDAPATAN,      '4-1000', 'Pendapatan Penjualan',             ACCOUNT_TYPE.REVENUE,  'credit', ACCOUNT_CATEGORY.SALES_REVENUE,      'Penjualan produk jadi'),
    def(SYS_ACCOUNTS.PENDAPATAN_LAIN, '4-1100', 'Pendapatan Lain-lain',             ACCOUNT_TYPE.REVENUE,  'credit', ACCOUNT_CATEGORY.OTHER_REVENUE,      'Pendapatan di luar penjualan utama'),

    // ── COGS ────────────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.HPP,             '5-1000', 'Harga Pokok Penjualan',            ACCOUNT_TYPE.COGS,     'debit',  ACCOUNT_CATEGORY.COGS,               'Biaya produk yang terjual'),

    // ── MANUFACTURING ───────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.BIAYA_BBL,       '6-1000', 'Biaya Bahan Baku Langsung',        ACCOUNT_TYPE.MANUFACTURING,'debit', ACCOUNT_CATEGORY.DIRECT_MATERIAL, 'Bahan baku yang masuk ke WIP'),
    def(SYS_ACCOUNTS.BIAYA_TKL,       '6-1100', 'Biaya Tenaga Kerja Langsung',      ACCOUNT_TYPE.MANUFACTURING,'debit', ACCOUNT_CATEGORY.DIRECT_LABOUR,   'Upah langsung yang masuk ke WIP'),
    def(SYS_ACCOUNTS.BIAYA_OVERHEAD,  '6-1200', 'Overhead Pabrik',                  ACCOUNT_TYPE.MANUFACTURING,'debit', ACCOUNT_CATEGORY.OVERHEAD,         'Biaya overhead dialokasikan ke WIP'),

    // ── EXPENSES ────────────────────────────────────────────────────────────
    def(SYS_ACCOUNTS.BIAYA_GAJI,      '7-1000', 'Biaya Gaji dan Upah',              ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.WAGES_EXPENSE,      'Gaji karyawan administrasi'),
    def(SYS_ACCOUNTS.BIAYA_SEWA,      '7-1100', 'Biaya Sewa',                       ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.RENT_EXPENSE,       'Sewa tempat usaha'),
    def(SYS_ACCOUNTS.BIAYA_UTILITAS,  '7-1200', 'Biaya Utilitas',                   ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.UTILITY_EXPENSE,    'Listrik, air, internet'),
    def(SYS_ACCOUNTS.BIAYA_PEMASARAN, '7-1300', 'Biaya Pemasaran',                  ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.MARKETING_EXPENSE,  'Iklan dan promosi'),
    def(SYS_ACCOUNTS.BIAYA_PENYUSUTAN,'7-1400', 'Biaya Penyusutan',                 ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.DEPRECIATION_EXPENSE,'Penyusutan aset tetap'),
    def(SYS_ACCOUNTS.BIAYA_ADMIN,     '7-1500', 'Biaya Administrasi & Umum',        ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.ADMIN_EXPENSE,      'Biaya kantor dan administrasi'),
    def(SYS_ACCOUNTS.BIAYA_BUNGA,     '7-1600', 'Biaya Bunga Pinjaman',             ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.INTEREST_EXPENSE,   'Bunga atas pinjaman'),
    def(SYS_ACCOUNTS.BEBAN_PPH,       '8-1000', 'Beban PPh Final',                  ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.TAX_EXPENSE,        'PPh Final atas omzet'),
    def(SYS_ACCOUNTS.BEBAN_LAIN,      '7-9000', 'Beban Lain-lain',                  ACCOUNT_TYPE.EXPENSE,  'debit',  ACCOUNT_CATEGORY.OTHER_EXPENSE,      'Beban di luar kategori utama'),
  ];
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a new or updated account before saving.
 * @param {object} account
 * @param {Array} existingAccounts
 * @returns {{ valid: boolean, messages: string[] }}
 */
export function validateAccount(account, existingAccounts) {
  const messages = [];

  if (!account.code?.trim()) messages.push('Kode akun wajib diisi.');
  if (!account.name?.trim()) messages.push('Nama akun wajib diisi.');
  if (!Object.values(ACCOUNT_TYPE).includes(account.type)) messages.push('Jenis akun tidak valid.');
  if (!['debit', 'credit'].includes(account.normalBalance)) messages.push('Saldo normal tidak valid.');

  // Code uniqueness (excluding self on update)
  const duplicate = existingAccounts.find(
    a => a.code === account.code.trim() && a.id !== account.id
  );
  if (duplicate) messages.push(`Kode akun "${account.code}" sudah digunakan oleh "${duplicate.name}".`);

  return { valid: messages.length === 0, messages };
}

/**
 * Check whether an account can be deleted.
 * System accounts and accounts referenced by journal entries cannot be deleted.
 * @param {object} account
 * @param {Array} journals
 * @returns {{ canDelete: boolean, reason: string }}
 */
export function canDeleteAccount(account, journals) {
  if (account.isSystem) {
    return { canDelete: false, reason: 'Akun sistem tidak dapat dihapus.' };
  }
  const referenced = journals.some(j =>
    j.lines?.some(l => l.accountId === account.id)
  );
  if (referenced) {
    return { canDelete: false, reason: 'Akun ini sudah digunakan dalam jurnal dan tidak dapat dihapus.' };
  }
  return { canDelete: true, reason: '' };
}

/**
 * Get account type label in Bahasa Indonesia.
 * @param {string} type
 * @returns {string}
 */
export function getAccountTypeLabel(type) {
  const labels = {
    [ACCOUNT_TYPE.ASSET]:         'Aset',
    [ACCOUNT_TYPE.LIABILITY]:     'Kewajiban',
    [ACCOUNT_TYPE.EQUITY]:        'Ekuitas',
    [ACCOUNT_TYPE.REVENUE]:       'Pendapatan',
    [ACCOUNT_TYPE.COGS]:          'Harga Pokok',
    [ACCOUNT_TYPE.MANUFACTURING]: 'Biaya Produksi',
    [ACCOUNT_TYPE.EXPENSE]:       'Beban',
  };
  return labels[type] ?? type;
}

/**
 * Sort accounts by code for consistent display.
 * @param {Array} accounts
 * @returns {Array}
 */
export function sortAccounts(accounts) {
  return [...accounts].sort((a, b) => a.code.localeCompare(b.code, 'id'));
}

/**
 * Get accounts grouped by type for display in the COA page.
 * @param {Array} accounts
 * @returns {Map<string, Array>}
 */
export function groupAccountsByType(accounts) {
  const order = [
    ACCOUNT_TYPE.ASSET,
    ACCOUNT_TYPE.LIABILITY,
    ACCOUNT_TYPE.EQUITY,
    ACCOUNT_TYPE.REVENUE,
    ACCOUNT_TYPE.COGS,
    ACCOUNT_TYPE.MANUFACTURING,
    ACCOUNT_TYPE.EXPENSE,
  ];

  const sorted = sortAccounts(accounts);
  const grouped = new Map();

  for (const type of order) {
    const group = sorted.filter(a => a.type === type && a.isActive);
    if (group.length > 0) grouped.set(type, group);
  }

  return grouped;
}
