/**
 * tax.js page — Perpajakan MVP (Phase 6)
 */

import { setTopbarTitle, clearTopbarActions } from '../layout.js';
import { icon }            from '../../../assets/icons/icons.js';
import { calculatePPhFinal, calculatePPN, TAX_RULES } from '../../domain/tax.js';
import { getTaxConfig, saveTaxConfig, getBusiness } from '../../storage/db.js';
import { formatIDR, parseIDR } from '../../utils/currency.js';
import { todayISO }        from '../../utils/date.js';
import { showToast }       from '../components/toast.js';

export function renderTax(container) {
  setTopbarTitle('Perpajakan');
  clearTopbarActions();
  draw(container);
}

function draw(container) {
  const cfg = getTaxConfig() ?? {};
  const biz = getBusiness();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Perpajakan</h2>
        <p class="page-subtitle">Alat bantu perhitungan pajak usaha</p>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="card mb-4" style="border-color: var(--color-accent-400); background: var(--color-accent-50);">
      <div class="card-body py-3">
        <div class="flex items-start gap-3">
          ${icon('warning', { size: '18' })}
          <p class="text-xs" style="color:var(--color-accent-800);">
            <strong>Penting:</strong> Perhitungan di sini adalah alat bantu pembukuan, bukan pengganti konsultasi pajak resmi.
            Selalu verifikasi kewajiban pajak dengan konsultan atau DJP.
          </p>
        </div>
      </div>
    </div>

    <!-- Tax profile -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="card">
        <div class="card-header"><span class="card-title">Profil Pajak</span></div>
        <div class="card-body">
          <form id="tax-profile-form" class="flex flex-col gap-3">
            <div class="form-group">
              <label class="form-label">Status PKP</label>
              <select id="tax-pkp" class="form-select">
                <option value="no"  ${cfg.pkp !== 'yes' ? 'selected':''}>Bukan PKP</option>
                <option value="yes" ${cfg.pkp === 'yes' ? 'selected':''}>PKP (Pengusaha Kena Pajak)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Omzet Tahunan Estimasi (Rp)</label>
              <input type="text" id="tax-omzet" class="form-input font-mono" placeholder="0" value="${cfg.annualOmzet ?? ''}" inputmode="numeric" />
            </div>
            <button type="submit" class="btn btn-primary btn-sm self-end">Simpan Profil Pajak</button>
          </form>
        </div>
      </div>

      <!-- PPh Final Calculator -->
      <div class="card">
        <div class="card-header"><span class="card-title">Hitung PPh Final UMKM</span></div>
        <div class="card-body">
          <div class="flex flex-col gap-3">
            <div class="form-group">
              <label class="form-label">Omzet Bulan Ini (Rp)</label>
              <input type="text" id="pph-monthly" class="form-input font-mono" placeholder="0" inputmode="numeric" />
            </div>
            <div class="form-group">
              <label class="form-label">Bulan / Tanggal Hitung</label>
              <input type="date" id="pph-date" class="form-input" value="${todayISO()}" />
            </div>
            <button class="btn btn-primary btn-sm self-end" id="btn-calc-pph">Hitung</button>
            <div id="pph-result" class="hidden"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- PPN Calculator (PKP only) -->
    ${cfg.pkp === 'yes' ? `
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">Hitung PPN (PKP)</span></div>
      <div class="card-body">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="form-group" style="min-width:200px;">
            <label class="form-label">DPP (Rp)</label>
            <input type="text" id="ppn-dpp" class="form-input font-mono" placeholder="0" inputmode="numeric" />
          </div>
          <div class="form-group" style="min-width:160px;">
            <label class="form-label">Tanggal Transaksi</label>
            <input type="date" id="ppn-date" class="form-input" value="${todayISO()}" />
          </div>
          <button class="btn btn-primary btn-sm" id="btn-calc-ppn">Hitung PPN</button>
        </div>
        <div id="ppn-result" class="hidden mt-3"></div>
      </div>
    </div>
    ` : ''}

    <!-- Rules reference -->
    <div class="card">
      <div class="card-header"><span class="card-title">Referensi Aturan Pajak</span></div>
      <div class="card-body p-0">
        <table class="data-table">
          <thead><tr><th>Aturan</th><th>Berlaku Dari</th><th>Berlaku Hingga</th><th>Tarif</th><th>Sumber</th></tr></thead>
          <tbody>
            ${TAX_RULES.map(r => `
              <tr>
                <td class="text-sm font-medium">${esc(r.label)}</td>
                <td class="text-xs">${r.effectiveFrom}</td>
                <td class="text-xs">${r.effectiveTo ?? '—'}</td>
                <td class="text-xs font-mono">${r.rateReduced != null ? `${(r.rateReduced*100).toFixed(1)}% / ${(r.rateNormal*100).toFixed(1)}%` : `${(r.rateNormal*100).toFixed(1)}%`}</td>
                <td class="text-xs" style="color:var(--color-text-muted)">${esc(r.source)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Save tax profile
  container.querySelector('#tax-profile-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const pkp     = container.querySelector('#tax-pkp').value;
    const omzet   = parseIDR(container.querySelector('#tax-omzet').value) ?? 0;
    saveTaxConfig({ ...cfg, pkp, annualOmzet: omzet, updatedAt: new Date().toISOString() });
    showToast({ type: 'success', title: 'Profil pajak disimpan.' });
    draw(container);
  });

  // PPh Final calculation
  container.querySelector('#btn-calc-pph')?.addEventListener('click', () => {
    const monthly = parseIDR(container.querySelector('#pph-monthly').value) ?? 0;
    const date    = container.querySelector('#pph-date').value;
    const annual  = cfg.annualOmzet ?? 0;
    const result  = calculatePPhFinal(monthly, annual, date);
    const resEl   = container.querySelector('#pph-result');
    resEl.className = 'mt-3 p-3 rounded text-sm';
    resEl.style.cssText = 'background:var(--color-primary-50);border:1px solid var(--color-primary-200)';
    resEl.innerHTML = `
      <div class="font-semibold mb-1">PPh Final = <span style="color:var(--color-primary-700)">${formatIDR(result.tax)}</span></div>
      ${result.steps.map(s => `<div style="color:var(--color-text-muted)">${esc(s)}</div>`).join('')}
    `;
  });

  // PPN calculation
  container.querySelector('#btn-calc-ppn')?.addEventListener('click', () => {
    const dpp    = parseIDR(container.querySelector('#ppn-dpp').value) ?? 0;
    const date   = container.querySelector('#ppn-date').value;
    const result = calculatePPN(dpp, date);
    const resEl  = container.querySelector('#ppn-result');
    resEl.className = 'p-3 rounded text-sm';
    resEl.style.cssText = 'background:var(--color-primary-50);border:1px solid var(--color-primary-200)';
    resEl.innerHTML = `
      <div class="font-semibold mb-1">PPN = <span style="color:var(--color-primary-700)">${formatIDR(result.tax)}</span></div>
      ${result.steps.map(s => `<div style="color:var(--color-text-muted)">${esc(s)}</div>`).join('')}
    `;
  });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
