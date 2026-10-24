/**
 * schema.js — Storage schema version constants and entity shape definitions
 *
 * SCHEMA_VERSION must be incremented any time the shape of a stored entity
 * changes in a way that requires migration. Migration handlers live in
 * migrations.js and are keyed by the version they upgrade FROM.
 *
 * Storage keys are the single source of truth for localStorage access.
 * All reads and writes must go through db.js using these keys.
 */

/** Current schema version. Increment on breaking shape changes. */
export const SCHEMA_VERSION = 1;

/** Application version string (semantic, independent of schema version). */
export const APP_VERSION = '0.2.0'; // Phase 2

/** localStorage key map — never access localStorage with ad-hoc strings */
export const KEYS = Object.freeze({
  META:         'umkm_meta',
  BUSINESS:     'umkm_business',
  ACCOUNTS:     'umkm_accounts',
  OPENING:      'umkm_opening',
  JOURNALS:     'umkm_journals',
  TRANSACTIONS: 'umkm_transactions',
  PRODUCTS:     'umkm_products',
  MATERIALS:    'umkm_materials',
  BOM:          'umkm_bom',
  INVENTORY:    'umkm_inventory',
  PRODUCTION:   'umkm_production',
  TAX_CONFIG:   'umkm_tax_config',
  PIN:          'umkm_pin',
});

/**
 * Meta record shape — stored at KEYS.META
 * @typedef {object} Meta
 * @property {number} schemaVersion
 * @property {string} appVersion
 * @property {string} installedAt   - ISO datetime
 * @property {string} lastOpenedAt  - ISO datetime
 */

/**
 * Business profile shape — stored at KEYS.BUSINESS
 * @typedef {object} Business
 * @property {string}  id
 * @property {string}  name
 * @property {string}  legalForm     - 'perorangan' | 'cv' | 'pt' | 'firma' | 'koperasi' | 'lainnya'
 * @property {string}  address
 * @property {string}  city
 * @property {string}  phone
 * @property {string}  npwp          - NPWP number (optional)
 * @property {string}  nib           - NIB number (optional)
 * @property {string}  industry      - e.g. 'Makanan & Minuman', 'Tekstil', etc.
 * @property {string}  fiscalYearStart - 'YYYY-MM-DD' of fiscal year start (usually Jan 1)
 * @property {string}  currency      - 'IDR' (fixed for now)
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

/**
 * Account shape — stored in array at KEYS.ACCOUNTS
 * @typedef {object} Account
 * @property {string}  id
 * @property {string}  code          - e.g. '1-1000'
 * @property {string}  name          - Display name in Bahasa Indonesia
 * @property {string}  type          - AccountType constant
 * @property {string}  normalBalance - 'debit' | 'credit'
 * @property {string}  category      - AccountCategory constant
 * @property {boolean} isSystem      - System accounts cannot be deleted
 * @property {boolean} isActive
 * @property {string|null} parentId  - For sub-accounts (Phase 3+)
 * @property {string}  description
 * @property {string}  createdAt
 */

/**
 * Account type constants — drives Balance Sheet and Income Statement classification
 */
export const ACCOUNT_TYPE = Object.freeze({
  ASSET:           'ASSET',
  LIABILITY:       'LIABILITY',
  EQUITY:          'EQUITY',
  REVENUE:         'REVENUE',
  COGS:            'COGS',
  MANUFACTURING:   'MANUFACTURING',
  EXPENSE:         'EXPENSE',
});

/**
 * Account category constants — drives report sub-sections
 */
export const ACCOUNT_CATEGORY = Object.freeze({
  // Assets
  CASH:              'CASH',
  BANK:              'BANK',
  RECEIVABLE:        'RECEIVABLE',
  INVENTORY_RAW:     'INVENTORY_RAW',
  INVENTORY_WIP:     'INVENTORY_WIP',
  INVENTORY_FG:      'INVENTORY_FG',
  PREPAID:           'PREPAID',
  FIXED_ASSET:       'FIXED_ASSET',
  ACCUM_DEPRECIATION:'ACCUM_DEPRECIATION',
  OTHER_ASSET:       'OTHER_ASSET',
  // Liabilities
  PAYABLE:           'PAYABLE',
  WAGES_PAYABLE:     'WAGES_PAYABLE',
  TAX_PAYABLE:       'TAX_PAYABLE',
  VAT_PAYABLE:       'VAT_PAYABLE',
  LOAN:              'LOAN',
  OTHER_LIABILITY:   'OTHER_LIABILITY',
  // Equity
  OWNER_CAPITAL:     'OWNER_CAPITAL',
  OWNER_DRAWINGS:    'OWNER_DRAWINGS',
  RETAINED_EARNINGS: 'RETAINED_EARNINGS',
  // Revenue
  SALES_REVENUE:     'SALES_REVENUE',
  OTHER_REVENUE:     'OTHER_REVENUE',
  // COGS
  COGS:              'COGS',
  // Manufacturing
  DIRECT_MATERIAL:   'DIRECT_MATERIAL',
  DIRECT_LABOUR:     'DIRECT_LABOUR',
  OVERHEAD:          'OVERHEAD',
  // Expenses
  WAGES_EXPENSE:     'WAGES_EXPENSE',
  RENT_EXPENSE:      'RENT_EXPENSE',
  UTILITY_EXPENSE:   'UTILITY_EXPENSE',
  MARKETING_EXPENSE: 'MARKETING_EXPENSE',
  DEPRECIATION_EXPENSE: 'DEPRECIATION_EXPENSE',
  ADMIN_EXPENSE:     'ADMIN_EXPENSE',
  INTEREST_EXPENSE:  'INTEREST_EXPENSE',
  TAX_EXPENSE:       'TAX_EXPENSE',
  OTHER_EXPENSE:     'OTHER_EXPENSE',
});

/**
 * Opening balance entry shape — stored at KEYS.OPENING
 * @typedef {object} OpeningBalance
 * @property {string}   id
 * @property {string}   date         - 'YYYY-MM-DD' — the day before business start
 * @property {boolean}  isPosted
 * @property {Array<OpeningLine>} lines
 * @property {string}   createdAt
 * @property {string}   updatedAt
 *
 * @typedef {object} OpeningLine
 * @property {string}  accountId
 * @property {number}  debit        - integer IDR
 * @property {number}  credit       - integer IDR
 */

/**
 * PIN record shape — stored at KEYS.PIN
 * NEVER stores plaintext PIN.
 * @typedef {object} PinRecord
 * @property {string} salt           - hex-encoded random salt
 * @property {string} hash           - hex-encoded SHA-256(salt + pin)
 * @property {string} recoveryHash   - SHA-256(salt + recoveryCode) for recovery
 * @property {string} createdAt
 */
