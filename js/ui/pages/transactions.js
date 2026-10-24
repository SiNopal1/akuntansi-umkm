/**
 * transactions.js — Transaction list and entry form (Phase 3 MVP)
 */

import { setTopbarTitle, setTopbarActions } from '../layout.js';
import { icon }           from '../../../assets/icons/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast }      from '../components/toast.js';
import { getTransactions, getAccounts } from '../../storage/db.js';
import { postTransaction, TX_TYPE, TX_TYPE_LABELS } from '../../domain/transactions.js';
import { SYS_ACCOUNTS }   from '../../domain/accounts.js';
import { ACCOUNT_TYPE }   from '../../storage/schema.js';
import { formatIDR, parseIDR } from '../../utils/currency.js';
import { formatDate, todayISO } from '../../utils/date.js';
import { emit, EVENTS }   from '../../app/events.js';

export function renderTransactions(container) {
  setTopbarTitle('Transaksi');
  setTopbarActions(`
    <button class="btn btn-primary btn-sm" id="btn-new-txn">
      ${icon('plus', { size: '14' })}
      Catat Transaksi
    </button>
  `);

  drawPage(container);

  document.getElementById('btn-new-txn')?.addEventListener('click', () => openTransactionModal(container));
}

function drawPage(container) {
  const txns     = getTransactions().slice().reverse();
  const accounts = getAccounts();
  const byId     = id => accounts.find(a => a.id === id);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Transaksi</h2>
        <p class="page-subtitle">${txns.length} transaksi tercatat</p>
      </div>
    </div>
    <div class="card">
      <div class="card-body p-0">
        <div class="table-container" style="border:none;">
          <table class="data-table">
            <thead><tr>
              <th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Referensi</th>
              <th class="text-right">Jumlah</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${txns.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state">
                    ${icon('transactions', { size: '40' })}
                    <div class="empty-state-title">Belum ada transaksi</div>
                    <div class="empty-state-desc">Klik "Catat Transaksi" untuk mulai mencatat.</div>
                  </div>
                </td></tr>
              ` : txns.map(t => `
                <tr>
                  <td class="text-sm">${formatDate(t.date)}</td>
                  <td><span class="badge badge-blue">${TX_TYPE_LABELS[t.type] ?? t.type}</span></td>
                  <td class="text-sm">${esc(t.description)}</td>
                  <td class="text-xs" style="color:var(--color-text-muted)">${esc(t.reference || '—')}</td>
                  <td class="text-right font-mono text-sm font-medium">${formatIDR(t.amount)}</td>
                  <td><span class="badge badge-green">Diposting</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openTransactionModal(container) {
  const accounts  = getAccounts();
  const cashAccts = accounts.filter(a =>
    [ACCOUNT_TYPE.ASSET].includes(a.type) &&
    ['CASH','BANK'].includes(a.category)
  );
  const allAccts  = accounts.filter(a => a.isActive);

  const acctOptions = (accts, sel = '') =>
    accts.map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.code)} — ${esc(a.name)}</option>`).join('');

  const typeOptions = [
    TX_TYPE.SALE_CASH, TX_TYPE.SALE_CREDIT,
    TX_TYPE.CUSTOMER_RECEIPT,
    TX_TYPE.PURCHASE_CASH, TX_TYPE.PURCHASE_CREDIT,
    TX_TYPE.SUPPLIER_PAYMENT,
    TX_TYPE.EXPENSE_CASH,
    TX_TYPE.BANK_TRANSFER,
    TX_TYPE.CAPITAL_IN, TX_TYPE.OWNER_WITHDRAWAL,
    TX_TYPE.LOAN_RECEIVED, TX_TYPE.LOAN_REPAYMENT,
  ].map(t => `<option value="${t}">${TX_TYPE_LABELS[t]}</option>`).join('');

  openModal({
    title: 'Catat Transaksi',
    size:  'lg',
    body: `
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label" for="txn-type">Jenis <span class="required">*</span></label>
            <select id="txn-type" class="form-select">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="txn-date">Tanggal <span class="required">*</span></label>
            <input type="date" id="txn-date" class="form-input" value="${todayISO()}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="txn-desc">Keterangan <span class="required">*</span></label>
          <input type="text" id="txn-desc" class="form-input" placeholder="Keterangan singkat transaksi" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label" for="txn-amount">Jumlah (Rp) <span class="required">*</span></label>
            <input type="text" id="txn-amount" class="form-input font-mono" placeholder="0" inputmode="numeric" />
          </div>
          <div class="form-group">
            <label class="form-label" for="txn-ref">No. Referensi</label>
            <input type="text" id="txn-ref" class="form-input" placeholder="Opsional" />
          </div>
        </div>
        <div class="form-group" id="acct1-group">
          <label class="form-label" for="txn-acct1">Akun Kas/Bank</label>
          <select id="txn-acct1" class="form-select">
            ${acctOptions(accounts.filter(a => ['CASH','BANK'].includes(a.category)), SYS_ACCOUNTS.KAS)}
          </select>
        </div>
        <div class="form-group hidden" id="acct2-group">
          <label class="form-label" for="txn-acct2" id="acct2-label">Akun Tujuan</label>
          <select id="txn-acct2" class="form-select">${acctOptions(allAccts)}</select>
        </div>
        <div class="form-group hidden" id="interest-group">
          <label class="form-label" for="txn-interest">Bunga (Rp)</label>
          <input type="text" id="txn-interest" class="form-input font-mono" placeholder="0" inputmode="numeric" />
        </div>
        <div id="txn-error" class="hidden"></div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-primary" id="btn-save-txn" type="button">
        ${icon('check', { size: '14' })} Posting Transaksi
      </button>
    `,
    onOpen(panel) {
      const typeEl     = panel.querySelector('#txn-type');
      const acct1Group = panel.querySelector('#acct1-group');
      const acct2Group = panel.querySelector('#acct2-group');
      const acct2Label = panel.querySelector('#acct2-label');
      const intGroup   = panel.querySelector('#interest-group');

      const updateFields = () => {
        const t = typeEl.value;
        const showAcct2 = [TX_TYPE.BANK_TRANSFER, TX_TYPE.PURCHASE_CASH, TX_TYPE.EXPENSE_CASH].includes(t);
        acct2Group.classList.toggle('hidden', !showAcct2);
        intGroup.classList.toggle('hidden', t !== TX_TYPE.LOAN_REPAYMENT);
        if (t === TX_TYPE.BANK_TRANSFER) {
          acct1Group.querySelector('label').textContent = 'Akun Asal';
          acct2Label.textContent = 'Akun Tujuan';
        } else {
          acct1Group.querySelector('label').textContent = 'Akun Kas/Bank';
          acct2Label.textContent = 'Akun Beban/Persediaan';
        }
      };
      typeEl.addEventListener('change', updateFields);
      updateFields();

      panel.querySelector('#btn-save-txn').addEventListener('click', () => {
        const errEl = panel.querySelector('#txn-error');
        const show  = msg => { errEl.className = 'form-error mt-1'; errEl.textContent = msg; };

        const type   = panel.querySelector('#txn-type').value;
        const date   = panel.querySelector('#txn-date').value;
        const desc   = panel.querySelector('#txn-desc').value.trim();
        const amount = parseIDR(panel.querySelector('#txn-amount').value);
        const ref    = panel.querySelector('#txn-ref').value.trim();
        const acct1  = panel.querySelector('#txn-acct1').value;
        const acct2  = panel.querySelector('#txn-acct2')?.value;
        const interest = parseIDR(panel.querySelector('#txn-interest')?.value || '0') ?? 0;

        if (!date)          { show('Tanggal wajib diisi.'); return; }
        if (!desc)          { show('Keterangan wajib diisi.'); return; }
        if (!amount || amount <= 0) { show('Jumlah harus lebih dari 0.'); return; }

        try {
          postTransaction({
            type, date, description: desc, reference: ref,
            amount, accountId: acct1, accountId2: acct2, interestAmount: interest,
          });
          closeModal();
          showToast({ type: 'success', title: 'Transaksi diposting.' });
          emit(EVENTS.TRANSACTION_POSTED);
          drawPage(container);
        } catch (err) {
          show(err.message);
        }
      });
    },
  });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
