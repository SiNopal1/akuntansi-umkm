/**
 * reports.js page — Laporan Keuangan (Phase 5 MVP)
 */

import { setTopbarTitle, clearTopbarActions } from '../layout.js';
import { icon }            from '../../../assets/icons/icons.js';
import { buildBalanceSheet, buildIncomeStatement, buildCashFlow } from '../../domain/reports.js';
import { formatIDR }       from '../../utils/currency.js';
import { formatDate, todayISO, yearRange, currentYear } from '../../utils/date.js';
import { getBusiness }     from '../../storage/db.js';

let activeReport = 'neraca';
let fromDate = yearRange(currentYear()).from;
let toDate   = todayISO();

export function renderReports(container) {
  setTopbarTitle('Laporan Keuangan');
  clearTopbarActions();
  draw(container);
}

function draw(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Laporan Keuangan</h2>
      </div>
    </div>

    <!-- Period controls -->
    <div class="card mb-4">
      <div class="card-body py-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex gap-2">
            ${['neraca','labarugi','aruskas'].map(r => `
              <button class="btn btn-sm ${r === activeReport ? 'btn-primary' : 'btn-secondary'} report-tab" data-report="${r}">
                ${{ neraca:'Neraca', labarugi:'Laba Rugi', aruskas:'Arus Kas' }[r]}
              </button>
            `).join('')}
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <input type="date" id="rpt-from" class="form-input" style="width:auto;" value="${fromDate}" />
            <span class="text-xs" style="color:var(--color-text-muted)">s/d</span>
            <input type="date" id="rpt-to"   class="form-input" style="width:auto;" value="${toDate}" />
            <button class="btn btn-secondary btn-sm" id="btn-rpt-apply">Tampilkan</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report content -->
    <div id="report-body"></div>
  `;

  container.querySelectorAll('.report-tab').forEach(btn => {
    btn.addEventListener('click', () => { activeReport = btn.dataset.report; draw(container); });
  });
  container.querySelector('#btn-rpt-apply')?.addEventListener('click', () => {
    fromDate = container.querySelector('#rpt-from').value || fromDate;
    toDate   = container.querySelector('#rpt-to').value   || toDate;
    draw(container);
  });

  const body = container.querySelector('#report-body');
  if (activeReport === 'neraca')   renderNeraca(body);
  if (activeReport === 'labarugi') renderLabaRugi(body);
  if (activeReport === 'aruskas')  renderArusKas(body);
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

function renderNeraca(el) {
  const r = buildBalanceSheet(toDate);

  el.innerHTML = `
    <div class="card">
      <div class="card-header flex justify-between items-center">
        <span class="card-title">Neraca (per ${formatDate(toDate, 'long')})</span>
        ${r.balanced
          ? `<span class="badge badge-green">Seimbang</span>`
          : `<span class="badge badge-red">Tidak Seimbang!</span>`}
      </div>
      <div class="card-body p-0">
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap:0;">
          <!-- Assets -->
          <div style="border-right: 1px solid var(--color-border);">
            ${sectionHeader('ASET')}
            ${r.assets.map(a => reportRow(a.name, a.balance)).join('')}
            ${totalRow('Total Aset', r.totalAssets)}
          </div>
          <!-- Liabilities + Equity -->
          <div>
            ${sectionHeader('KEWAJIBAN')}
            ${r.liabilities.map(a => reportRow(a.name, a.balance)).join('')}
            ${totalRow('Total Kewajiban', r.totalLiabilities)}
            ${sectionHeader('EKUITAS')}
            ${r.equity.map(a => reportRow(a.name, a.balance)).join('')}
            ${totalRow('Total Ekuitas', r.totalEquity)}
            ${totalRow('Total Kewajiban + Ekuitas', r.totalLiabilities + r.totalEquity, true)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Income Statement ─────────────────────────────────────────────────────────

function renderLabaRugi(el) {
  const r = buildIncomeStatement(fromDate, toDate);

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Laba Rugi (${formatDate(fromDate)} — ${formatDate(toDate)})</span>
      </div>
      <div class="card-body p-0">
        ${sectionHeader('PENDAPATAN')}
        ${r.revenue.map(a => reportRow(a.name, a.balance)).join('')}
        ${r.revenue.length === 0 ? emptyRow('Tidak ada pendapatan') : ''}
        ${totalRow('Total Pendapatan', r.totalRevenue)}

        ${sectionHeader('HARGA POKOK PENJUALAN')}
        ${r.cogs.map(a => reportRow(a.name, a.balance)).join('')}
        ${r.cogs.length === 0 ? emptyRow('Tidak ada HPP') : ''}
        ${totalRow('Laba Kotor', r.grossProfit, false, true)}

        ${sectionHeader('BEBAN USAHA')}
        ${r.expenses.map(a => reportRow(a.name, a.balance)).join('')}
        ${r.expenses.length === 0 ? emptyRow('Tidak ada beban') : ''}
        ${totalRow('Total Beban', r.totalExpenses)}

        <div style="background: var(--color-primary-50); border-top: 2px solid var(--color-primary-300);">
          ${totalRow('LABA (RUGI) BERSIH', r.netIncome, true)}
        </div>
      </div>
    </div>
  `;
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

function renderArusKas(el) {
  const r = buildCashFlow(fromDate, toDate);
  const sumAmt = arr => arr.reduce((s, i) => s + i.amount, 0);

  const section = (title, items, isInflow) => `
    <div class="px-5 py-2 text-xs font-semibold uppercase tracking-wide" style="color:var(--color-text-muted); background:var(--color-secondary-50);">${title}</div>
    ${items.length === 0 ? emptyRow('Tidak ada') : items.map(i => reportRow(i.description, i.amount, isInflow ? '' : 'out')).join('')}
  `;

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Arus Kas (${formatDate(fromDate)} — ${formatDate(toDate)})</span>
      </div>
      <div class="card-body p-0">
        ${section('Aktivitas Operasi — Penerimaan', r.operating.inflows, true)}
        ${section('Aktivitas Operasi — Pengeluaran', r.operating.outflows, false)}
        ${totalRow('Arus Kas Bersih Operasi', r.operatingNet, false, true)}

        ${section('Aktivitas Pendanaan — Penerimaan', r.financing.inflows, true)}
        ${section('Aktivitas Pendanaan — Pengeluaran', r.financing.outflows, false)}
        ${totalRow('Arus Kas Bersih Pendanaan', r.financingNet, false, true)}

        <div style="background: var(--color-primary-50); border-top: 2px solid var(--color-primary-300);">
          ${totalRow('KENAIKAN (PENURUNAN) KAS BERSIH', r.netChange, true)}
        </div>
      </div>
    </div>
  `;
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function sectionHeader(label) {
  return `<div class="px-5 py-2 text-xs font-semibold uppercase tracking-wide" style="color:var(--color-text-muted); background:var(--color-secondary-50); border-bottom:1px solid var(--color-border);">${label}</div>`;
}

function reportRow(label, amount) {
  const color = amount < 0 ? 'var(--color-negative)' : '';
  return `
    <div class="flex justify-between items-center px-5 py-2 text-sm" style="border-bottom:1px solid var(--color-border);">
      <span>${esc(label)}</span>
      <span class="font-mono" style="color:${color}">${formatIDR(amount)}</span>
    </div>`;
}

function totalRow(label, amount, bold = false, highlight = false) {
  const color = amount < 0 ? 'var(--color-negative)' : amount > 0 ? 'var(--color-positive)' : '';
  return `
    <div class="flex justify-between items-center px-5 py-2 text-sm ${bold || highlight ? 'font-semibold' : ''}"
         style="border-top:${highlight || bold ? '2px solid var(--color-border)' : '1px solid var(--color-border)'}; background:${highlight ? 'var(--color-secondary-50)' : ''};">
      <span>${esc(label)}</span>
      <span class="font-mono" style="${bold ? 'font-size:1rem;' : ''}color:${color}">${formatIDR(amount)}</span>
    </div>`;
}

function emptyRow(label) {
  return `<div class="px-5 py-2 text-sm" style="color:var(--color-text-muted);border-bottom:1px solid var(--color-border);">${label}</div>`;
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
