/**
 * journal.js page — Buku Jurnal (Phase 3 MVP)
 */

import { setTopbarTitle, clearTopbarActions } from '../layout.js';
import { icon }           from '../../../assets/icons/icons.js';
import { getJournals, getAccounts } from '../../storage/db.js';
import { formatIDR }      from '../../utils/currency.js';
import { formatDate }     from '../../utils/date.js';

export function renderJournal(container) {
  setTopbarTitle('Buku Jurnal');
  clearTopbarActions();

  const journals  = getJournals().slice().reverse();
  const accounts  = getAccounts();
  const accName   = id => accounts.find(a => a.id === id)?.name ?? id;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Buku Jurnal</h2>
        <p class="page-subtitle">${journals.length} entri jurnal</p>
      </div>
    </div>
    <div class="card">
      <div class="card-body p-0">
        <div class="table-container" style="border:none;">
          <table class="data-table">
            <thead><tr>
              <th>Tanggal</th><th>Referensi</th><th>Keterangan</th>
              <th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th>
            </tr></thead>
            <tbody>
              ${journals.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state">
                    ${icon('journal', { size: '40' })}
                    <div class="empty-state-title">Belum ada entri jurnal</div>
                    <div class="empty-state-desc">Jurnal dibuat otomatis saat transaksi diposting.</div>
                  </div>
                </td></tr>
              ` : journals.flatMap(j => j.lines.map((l, i) => `
                <tr>
                  ${i === 0 ? `<td rowspan="${j.lines.length}" class="text-sm" style="vertical-align:top;">${formatDate(j.date)}</td>
                               <td rowspan="${j.lines.length}" class="text-xs font-mono" style="vertical-align:top;color:var(--color-text-muted)">${esc(j.reference || '—')}</td>
                               <td rowspan="${j.lines.length}" class="text-sm" style="vertical-align:top;">${esc(j.description)}</td>` : ''}
                  <td class="text-sm" style="${l.credit > 0 ? 'padding-left:2rem;' : 'font-weight:500;'}">${esc(accName(l.accountId))}</td>
                  <td class="text-right font-mono text-sm">${l.debit  > 0 ? formatIDR(l.debit)  : ''}</td>
                  <td class="text-right font-mono text-sm">${l.credit > 0 ? formatIDR(l.credit) : ''}</td>
                </tr>
              `)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
