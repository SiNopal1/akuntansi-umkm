/**
 * dashboard.js — Dasbor (live KPIs, Phase 3+)
 */

import { setTopbarTitle, clearTopbarActions } from '../layout.js';
import { icon }         from '../../../assets/icons/icons.js';
import { getBusiness, getAccounts, getTransactions } from '../../storage/db.js';
import { buildBalanceSheet, buildIncomeStatement } from '../../domain/reports.js';
import { formatIDR }    from '../../utils/currency.js';
import { formatDate, todayISO, yearRange, currentYear } from '../../utils/date.js';
import { TX_TYPE_LABELS } from '../../domain/transactions.js';

export function renderDashboard(container) {
  setTopbarTitle('Dasbor');
  clearTopbarActions();

  const business     = getBusiness();
  const isConfigured = !!business?.name;
  const accounts     = getAccounts();
  const { from, to } = yearRange(currentYear());

  // Live data
  let totalAssets = 0, netIncome = 0, revenue = 0;
  if (accounts.length > 0) {
    try {
      const bs  = buildBalanceSheet(todayISO());
      const pl  = buildIncomeStatement(from, todayISO());
      totalAssets = bs.totalAssets;
      netIncome   = pl.netIncome;
      revenue     = pl.totalRevenue;
    } catch { /* no data yet */ }
  }

  const recent = getTransactions().slice(-5).reverse();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Selamat datang${business?.name ? `, ${esc(business.name)}` : ''}</h2>
        <p class="page-subtitle">Ringkasan keuangan usaha Anda</p>
      </div>
    </div>

    ${!isConfigured ? `
    <div class="card mb-6" style="border-color: var(--color-primary-200); background: var(--color-primary-50);">
      <div class="card-body">
        <div class="flex items-start gap-4">
          <span style="color: var(--color-primary-600); flex-shrink:0;">${icon('info', { size: '22' })}</span>
          <div>
            <div class="font-semibold" style="color: var(--color-primary-800);">Mulai dengan mengatur usaha Anda</div>
            <p class="text-sm mt-1" style="color: var(--color-primary-700);">Lengkapi profil usaha di menu Pengaturan untuk memulai pencatatan.</p>
            <button class="btn btn-primary btn-sm mt-3" onclick="window.location.hash='/settings'" type="button">
              ${icon('settings', { size: '14' })} Atur Usaha
            </button>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- KPI tiles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${kpi('Total Aset', totalAssets, 'building', accounts.length === 0)}
      ${kpi('Pendapatan (YTD)', revenue, 'trending-up', accounts.length === 0)}
      ${kpi('Laba Bersih (YTD)', netIncome, 'cash', accounts.length === 0, netIncome < 0)}
      ${kpi('Transaksi', getTransactions().length, 'transactions', false, false, true)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent transactions -->
      <div class="card lg:col-span-2">
        <div class="card-header flex items-center justify-between">
          <span class="card-title">Transaksi Terbaru</span>
          <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/transactions'" type="button">
            Lihat semua ${icon('chevron-right', { size: '14' })}
          </button>
        </div>
        <div class="card-body p-0">
          ${recent.length === 0 ? `
            <div class="empty-state">
              ${icon('transactions', { size: '36' })}
              <div class="empty-state-title">Belum ada transaksi</div>
            </div>
          ` : `<table class="data-table">
            <tbody>
              ${recent.map(t => `
                <tr>
                  <td class="text-xs" style="color:var(--color-text-muted); width:90px;">${formatDate(t.date, 'short')}</td>
                  <td class="text-sm">${esc(t.description)}</td>
                  <td class="text-xs"><span class="badge badge-blue">${TX_TYPE_LABELS[t.type] ?? t.type}</span></td>
                  <td class="text-right font-mono text-sm font-medium">${formatIDR(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <div class="card-header"><span class="card-title">Aksi Cepat</span></div>
        <div class="card-body flex flex-col gap-2">
          <button class="btn btn-secondary w-full justify-start" onclick="window.location.hash='/transactions'" type="button">
            ${icon('plus', { size: '16' })} Catat Transaksi
          </button>
          <button class="btn btn-secondary w-full justify-start" onclick="window.location.hash='/inventory'" type="button">
            ${icon('inventory', { size: '16' })} Cek Inventaris
          </button>
          <button class="btn btn-secondary w-full justify-start" onclick="window.location.hash='/production'" type="button">
            ${icon('production', { size: '16' })} Catat Produksi
          </button>
          <button class="btn btn-secondary w-full justify-start" onclick="window.location.hash='/reports'" type="button">
            ${icon('reports', { size: '16' })} Lihat Laporan
          </button>
          <button class="btn btn-secondary w-full justify-start" onclick="window.location.hash='/settings'" type="button">
            ${icon('download', { size: '16' })} Cadangan Data
          </button>
        </div>
      </div>
    </div>
  `;
}

function kpi(label, value, iconName, empty, negative = false, integer = false) {
  const display = empty ? '—' : integer ? value.toLocaleString('id-ID') : formatIDR(value);
  const cls     = empty ? '' : (negative ? 'negative' : value > 0 ? 'positive' : '');
  return `
    <div class="stat-card">
      <div class="flex items-center justify-between mb-2">
        <span class="stat-card-label">${label}</span>
        <span style="color: var(--color-secondary-300);">${icon(iconName, { size: '20' })}</span>
      </div>
      <div class="stat-card-value ${cls}" style="${empty ? 'color:var(--color-secondary-300);font-size:1rem;' : ''}">${display}</div>
    </div>`;
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
