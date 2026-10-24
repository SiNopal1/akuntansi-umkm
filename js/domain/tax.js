/**
 * tax.js — Tax rules registry and PPh Final + PPN calculation
 *
 * Rules are versioned with effective dates.
 * PP 23/2018: 0.5% of monthly gross turnover (omzet bruto)
 * PP 20/2026 (effective 2027-01-01):
 *   - Turnover ≤ Rp 500 juta/year → 0.1%
 *   - Turnover > Rp 500 juta up to Rp 4.8 miliar → 0.5%
 *   - Duration clock resets from 2027-01-01
 *
 * ⚠️ PP 20/2026 provisions provided by user; verify against official gazette.
 * All calculations are bookkeeping aids, not certified tax returns.
 */

export const TAX_RULES = [
  {
    id:           'PPH_FINAL_PP23_2018',
    label:        'PPh Final UMKM — PP 23/2018',
    type:         'PPH_FINAL',
    effectiveFrom:'2018-07-01',
    effectiveTo:  '2026-12-31',
    rateNormal:   0.005,
    rateReduced:  null,
    thresholdReduced: null,
    annualCap:    4_800_000_000,
    source:       'PP No. 23 Tahun 2018',
    note:         'Tarif 0,5% dari omzet bruto bulanan.',
  },
  {
    id:           'PPH_FINAL_PP20_2026',
    label:        'PPh Final UMKM — PP 20/2026 (berlaku 2027)',
    type:         'PPH_FINAL',
    effectiveFrom:'2027-01-01',
    effectiveTo:  null,
    rateNormal:   0.005,     // for omzet > 500 juta/year
    rateReduced:  0.001,     // for omzet ≤ 500 juta/year
    thresholdReduced: 500_000_000,
    annualCap:    4_800_000_000,
    source:       'PP No. 20 Tahun 2026 (disampaikan pengguna — verifikasi diperlukan)',
    note:         '⚠️ BELUM DIVERIFIKASI dari sumber resmi. Tarif 0,1% untuk omzet ≤ Rp500 juta/tahun; 0,5% untuk di atas itu.',
  },
];

/**
 * Get the applicable PPh Final rule for a given date.
 * @param {string} date - ISO date
 * @returns {object|null}
 */
export function getPPhFinalRule(date) {
  return TAX_RULES
    .filter(r => r.type === 'PPH_FINAL' && r.effectiveFrom <= date && (!r.effectiveTo || r.effectiveTo >= date))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;
}

/**
 * Calculate PPh Final for a given month's gross turnover.
 * @param {number} monthlyTurnover  - integer IDR
 * @param {number} annualTurnover   - integer IDR (year-to-date estimate for rate selection)
 * @param {string} date             - any date in the applicable month (ISO)
 * @returns {{ tax: number, rate: number, rule: object, steps: string[] }}
 */
export function calculatePPhFinal(monthlyTurnover, annualTurnover, date) {
  const rule = getPPhFinalRule(date);
  if (!rule) return { tax: 0, rate: 0, rule: null, steps: ['Tidak ada aturan PPh Final yang berlaku.'] };

  if (annualTurnover > rule.annualCap) {
    return { tax: 0, rate: 0, rule, steps: [`Omzet tahunan (Rp${annualTurnover.toLocaleString('id-ID')}) melebihi batas Rp${rule.annualCap.toLocaleString('id-ID')}. Tidak eligible PPh Final UMKM.`] };
  }

  let rate = rule.rateNormal;
  if (rule.rateReduced !== null && annualTurnover <= rule.thresholdReduced) {
    rate = rule.rateReduced;
  }

  const tax   = Math.round(monthlyTurnover * rate);
  const steps = [
    `Dasar hukum: ${rule.source}`,
    `Omzet bulanan: Rp${monthlyTurnover.toLocaleString('id-ID')}`,
    `Tarif yang berlaku: ${(rate * 100).toFixed(1)}%`,
    `PPh Final = Rp${monthlyTurnover.toLocaleString('id-ID')} × ${(rate * 100).toFixed(1)}% = Rp${tax.toLocaleString('id-ID')}`,
    rule.note || '',
  ].filter(Boolean);

  return { tax, rate, rule, steps };
}

/**
 * PPN calculation (only for PKP businesses).
 * @param {number} dpp  - Dasar Pengenaan Pajak (integer IDR)
 * @param {string} date - ISO date
 * @returns {{ tax: number, rate: number, steps: string[] }}
 */
export function calculatePPN(dpp, date) {
  // 12% rate effective 2025-01-01 per UU HPP No. 7/2021
  const rate = date >= '2025-01-01' ? 0.12 : 0.11;
  const tax  = Math.round(dpp * rate);
  return {
    tax, rate,
    steps: [
      `Dasar: UU HPP No. 7/2021`,
      `Tarif PPN: ${(rate * 100).toFixed(0)}% (berlaku ${date >= '2025-01-01' ? '1 Jan 2025' : 'sebelum 2025'})`,
      `DPP: Rp${dpp.toLocaleString('id-ID')}`,
      `PPN = Rp${dpp.toLocaleString('id-ID')} × ${(rate * 100).toFixed(0)}% = Rp${tax.toLocaleString('id-ID')}`,
    ],
  };
}
