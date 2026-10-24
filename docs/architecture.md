# Architecture Notes — Akuntansi UMKM

## Module Responsibilities

### js/app/

| File | Responsibility |
|---|---|
| `init.js` | Bootstrap sequence: layout → route registration → router start |
| `router.js` | Hash-based navigation; maps `#/path` → page render function |
| `state.js` | In-memory session state (not persisted directly) |
| `events.js` | Application-wide pub/sub event bus |

### js/domain/ (Phase 2+)

| File | Responsibility |
|---|---|
| `accounts.js` | Chart of accounts: account types, classifications, system account protection |
| `journal.js` | Journal entry creation, debit=credit invariant, posting, reversal |
| `transactions.js` | Business event → journal entry translation (the template registry) |
| `inventory.js` | Inventory quantities, moving weighted-average cost engine |
| `production.js` | BOM management, production batch processing, WIP accumulation |
| `reports.js` | Balance Sheet, Income Statement, Cash Flow Statement derivation |
| `tax.js` | Tax rule registry, PPh Final calculation, PPN calculation |

### js/services/ (Phase 3+)

Coordinate user actions and domain operations. Do not embed financial calculations.

### js/storage/ (Phase 2+)

| File | Responsibility |
|---|---|
| `schema.js` | Schema version constants and TypeDefs |
| `db.js` | localStorage read/write; never called directly by UI |
| `migrations.js` | Version-to-version upgrade handlers |
| `integrity.js` | Referential consistency checks |

### js/ui/

Presentation only. Never contains accounting calculations.

## Data Flow

```
User interaction
  → UI Page (js/ui/pages/)
  → Service (js/services/)
  → Domain (js/domain/)
  → Storage (js/storage/db.js)
  → localStorage
```

Responses flow back up the same chain. The event bus allows UI components
to respond to domain changes without tight coupling.

## Standard Event Names

See `js/app/events.js` for the full EVENTS constant map.

Key events:
- `app:navigate` — hash route changed
- `transaction:posted` — new journal entry posted
- `inventory:updated` — inventory quantities or values changed
- `production:completed` — production batch finalised
- `restore:completed` — full data restore from backup

## Routing

Hash-based: `#/dashboard`, `#/transactions`, `#/reports`, etc.

No server-side routing is needed. `vercel.json` rewrites all paths to `index.html`.

## Monetary Arithmetic

All IDR amounts are integer rupiah (no decimals).
Safe range: `Number.MAX_SAFE_INTEGER` ≈ Rp 9 quadrillion.
All arithmetic uses functions from `js/utils/currency.js`.
Never use floating-point arithmetic on monetary values.

## Date Handling

Internal representation: ISO 8601 date string `"YYYY-MM-DD"`.
Never store as a Date object (timezone-sensitive) or Unix timestamp for date-only values.
Display formatting via `js/utils/date.js` → `id-ID` locale.
Business timezone: `Asia/Jakarta`.
