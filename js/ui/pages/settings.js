/**
 * settings.js — Pengaturan page (Phase 2: fully implemented)
 *
 * Sections:
 *   1. Profil Usaha    — business name, legal form, fiscal year, etc.
 *   2. Bagan Akun      — chart of accounts viewer + add custom account
 *   3. Saldo Awal      — opening balance entry with debit=credit validation
 *   4. Keamanan        — PIN setup, change, and removal
 *   5. Cadangan Data   — JSON export
 *   6. Pulihkan Data   — JSON import with validation and confirmation
 */

import { setTopbarTitle, clearTopbarActions } from '../layout.js';
import { icon }                               from '../../../assets/icons/icons.js';
import { openModal, closeModal }              from '../components/modal.js';
import { showToast }                          from '../components/toast.js';
import { getBusiness, saveBusiness,
         getAccounts, saveAccounts,
         getOpening, saveOpening,
         getJournals }                        from '../../storage/db.js';
import { buildDefaultAccounts,
         validateAccount, canDeleteAccount,
         getAccountTypeLabel, groupAccountsByType } from '../../domain/accounts.js';
import { ACCOUNT_TYPE, ACCOUNT_CATEGORY }     from '../../storage/schema.js';
import { hasPinSet, setupPin, verifyPin,
         verifyRecovery, clearPin }           from '../../services/pin.js';
import { exportBackup, validateBackupFile,
         performRestore }                     from '../../services/backupService.js';
import { generateId }                         from '../../utils/id.js';
import { formatIDR, parseIDR }                from '../../utils/currency.js';
import { emit, EVENTS }                       from '../../app/events.js';

// ─── Active section state ──────────────────────────────────────────────────────
let activeSection = 'profil';

/**
 * Render the full Settings page.
 * @param {HTMLElement} container
 */
export function renderSettings(container) {
  setTopbarTitle('Pengaturan');
  clearTopbarActions();

  container.innerHTML = buildShell();
  bindSectionNav(container);
  renderSection(container, activeSection);
}

// ─── Shell ─────────────────────────────────────────────────────────────────────

function buildShell() {
  const sections = [
    { id: 'profil',   label: 'Profil Usaha',    iconName: 'building'  },
    { id: 'akun',     label: 'Bagan Akun',       iconName: 'journal'   },
    { id: 'saldo',    label: 'Saldo Awal',        iconName: 'cash'      },
    { id: 'keamanan', label: 'Keamanan (PIN)',     iconName: 'lock'      },
    { id: 'cadangan', label: 'Cadangan Data',     iconName: 'download'  },
    { id: 'pulihkan', label: 'Pulihkan Data',     iconName: 'upload'    },
  ];

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Pengaturan</h2>
        <p class="page-subtitle">Konfigurasi usaha, akun, dan manajemen data</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Section nav -->
      <nav class="flex flex-col gap-1" aria-label="Bagian pengaturan">
        ${sections.map(s => `
          <button
            class="settings-nav-btn btn btn-ghost justify-start text-left"
            data-section="${s.id}"
            type="button"
            style="padding: 0.625rem 0.875rem;"
          >
            <span style="color: var(--color-primary-600);">${icon(s.iconName, { size: '16' })}</span>
            <span>${s.label}</span>
          </button>
        `).join('')}
      </nav>

      <!-- Section content -->
      <div class="lg:col-span-3" id="settings-section-content">
        <!-- rendered by renderSection() -->
      </div>
    </div>

    <!-- Storage notice -->
    <div class="card mt-6" style="border-color: var(--color-accent-400); background: var(--color-accent-50);">
      <div class="card-body py-3">
        <div class="flex items-start gap-3">
          <span style="color: var(--color-accent-600); flex-shrink:0; margin-top:1px;">${icon('warning', { size: '18' })}</span>
          <p class="text-xs" style="color: var(--color-accent-800);">
            <strong>Data Lokal:</strong> Semua catatan keuangan tersimpan hanya di browser ini.
            Data tidak dicadangkan otomatis. Lakukan ekspor cadangan JSON secara rutin.
          </p>
        </div>
      </div>
    </div>
  `;
}

function bindSectionNav(container) {
  container.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      renderSection(container, activeSection);
      updateActiveNavBtn(container);
    });
  });
  updateActiveNavBtn(container);
}

function updateActiveNavBtn(container) {
  container.querySelectorAll('.settings-nav-btn').forEach(btn => {
    const isActive = btn.dataset.section === activeSection;
    btn.style.backgroundColor = isActive ? 'var(--color-primary-50)' : '';
    btn.style.color            = isActive ? 'var(--color-primary-700)' : '';
    btn.style.fontWeight       = isActive ? '600' : '';
  });
}

function renderSection(container, section) {
  const el = container.querySelector('#settings-section-content');
  if (!el) return;

  const renderers = {
    profil:   renderProfilSection,
    akun:     renderAkunSection,
    saldo:    renderSaldoSection,
    keamanan: renderKeamananSection,
    cadangan: renderCadanganSection,
    pulihkan: renderPulihkanSection,
  };

  (renderers[section] ?? renderProfilSection)(el);
}

// ─── Section 1: Profil Usaha ──────────────────────────────────────────────────

function renderProfilSection(el) {
  const biz = getBusiness() ?? {};

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Profil Usaha</h3>
      </div>
      <div class="card-body">
        <form id="form-profil" novalidate>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group md:col-span-2">
              <label class="form-label" for="biz-name">Nama Usaha <span class="required">*</span></label>
              <input type="text" id="biz-name" class="form-input" value="${esc(biz.name ?? '')}" placeholder="Contoh: UD Berkah Mandiri" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-legal">Bentuk Usaha <span class="required">*</span></label>
              <select id="biz-legal" class="form-select">
                ${legalForms(biz.legalForm)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-industry">Bidang Usaha</label>
              <input type="text" id="biz-industry" class="form-input" value="${esc(biz.industry ?? '')}" placeholder="Contoh: Makanan & Minuman" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="form-label" for="biz-address">Alamat</label>
              <input type="text" id="biz-address" class="form-input" value="${esc(biz.address ?? '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-city">Kota / Kabupaten</label>
              <input type="text" id="biz-city" class="form-input" value="${esc(biz.city ?? '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-phone">Telepon</label>
              <input type="tel" id="biz-phone" class="form-input" value="${esc(biz.phone ?? '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-npwp">NPWP</label>
              <input type="text" id="biz-npwp" class="form-input" value="${esc(biz.npwp ?? '')}" placeholder="00.000.000.0-000.000" />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-nib">NIB</label>
              <input type="text" id="biz-nib" class="form-input" value="${esc(biz.nib ?? '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-fiscal">Awal Tahun Buku <span class="required">*</span></label>
              <input type="date" id="biz-fiscal" class="form-input" value="${esc(biz.fiscalYearStart ?? currentFiscalStart())}" required />
              <span class="form-hint">Biasanya 1 Januari tahun berjalan</span>
            </div>
          </div>
          <div class="mt-5 flex justify-end">
            <button type="submit" class="btn btn-primary">
              ${icon('check', { size: '14' })}
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  el.querySelector('#form-profil').addEventListener('submit', e => {
    e.preventDefault();
    saveProfil(el);
  });
}

function saveProfil(el) {
  const name         = el.querySelector('#biz-name').value.trim();
  const legalForm    = el.querySelector('#biz-legal').value;
  const industry     = el.querySelector('#biz-industry').value.trim();
  const address      = el.querySelector('#biz-address').value.trim();
  const city         = el.querySelector('#biz-city').value.trim();
  const phone        = el.querySelector('#biz-phone').value.trim();
  const npwp         = el.querySelector('#biz-npwp').value.trim();
  const nib          = el.querySelector('#biz-nib').value.trim();
  const fiscalYearStart = el.querySelector('#biz-fiscal').value;

  if (!name) {
    showToast({ type: 'error', title: 'Nama usaha wajib diisi.' });
    el.querySelector('#biz-name').classList.add('error');
    return;
  }

  const existing = getBusiness() ?? {};
  const biz = {
    id:             existing.id ?? generateId('biz'),
    name,
    legalForm,
    industry,
    address,
    city,
    phone,
    npwp,
    nib,
    fiscalYearStart: fiscalYearStart || currentFiscalStart(),
    currency:        'IDR',
    createdAt:       existing.createdAt ?? new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };

  saveBusiness(biz);

  // First-time: also seed default chart of accounts if none exist
  const accounts = getAccounts();
  if (accounts.length === 0) {
    saveAccounts(buildDefaultAccounts());
    showToast({ type: 'success', title: 'Profil disimpan', message: 'Bagan akun default telah dibuat.' });
  } else {
    showToast({ type: 'success', title: 'Profil usaha berhasil disimpan.' });
  }

  emit(EVENTS.BUSINESS_SAVED, biz);
}

// ─── Section 2: Bagan Akun ────────────────────────────────────────────────────

function renderAkunSection(el) {
  const accounts = getAccounts();

  if (accounts.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            ${icon('journal', { size: '40' })}
            <div class="empty-state-title">Bagan akun belum tersedia</div>
            <div class="empty-state-desc">Simpan profil usaha terlebih dahulu. Bagan akun default akan dibuat secara otomatis.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const grouped = groupAccountsByType(accounts);

  el.innerHTML = `
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h3 class="card-title">Bagan Akun (${accounts.length} akun)</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-account">
          ${icon('plus', { size: '14' })}
          Tambah Akun
        </button>
      </div>
      <div class="card-body p-0">
        ${[...grouped.entries()].map(([type, accs]) => `
          <div>
            <div class="px-5 py-2" style="background: var(--color-secondary-50); border-bottom: 1px solid var(--color-border);">
              <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-text-muted);">
                ${getAccountTypeLabel(type)}
              </span>
            </div>
            <table class="data-table" style="border-radius:0;">
              <tbody>
                ${accs.map(a => `
                  <tr>
                    <td class="font-mono text-xs" style="color: var(--color-text-muted); width: 90px;">${esc(a.code)}</td>
                    <td class="text-sm font-medium">${esc(a.name)}</td>
                    <td class="text-xs" style="color: var(--color-text-muted);">${a.normalBalance === 'debit' ? 'Debit' : 'Kredit'}</td>
                    <td style="width:80px; text-align:right;">
                      ${a.isSystem
                        ? `<span class="badge badge-blue">Sistem</span>`
                        : `<button class="btn btn-ghost btn-sm" data-account-id="${a.id}" data-action="delete-account" title="Hapus akun">
                             ${icon('trash', { size: '14' })}
                           </button>`
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  el.querySelector('#btn-add-account')?.addEventListener('click', () => openAddAccountModal(el));

  el.querySelectorAll('[data-action="delete-account"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const accountId = btn.dataset.accountId;
      confirmDeleteAccount(el, accountId);
    });
  });
}

function openAddAccountModal(settingsEl) {
  openModal({
    title: 'Tambah Akun Baru',
    body: `
      <form id="form-add-account" novalidate>
        <div class="flex flex-col gap-4">
          <div class="form-group">
            <label class="form-label" for="new-code">Kode Akun <span class="required">*</span></label>
            <input type="text" id="new-code" class="form-input" placeholder="Contoh: 1-1700" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-name">Nama Akun <span class="required">*</span></label>
            <input type="text" id="new-name" class="form-input" placeholder="Contoh: Kas Kecil" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-type">Jenis Akun <span class="required">*</span></label>
            <select id="new-type" class="form-select">
              ${Object.values(ACCOUNT_TYPE).map(t => `<option value="${t}">${getAccountTypeLabel(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="new-balance">Saldo Normal <span class="required">*</span></label>
            <select id="new-balance" class="form-select">
              <option value="debit">Debit</option>
              <option value="credit">Kredit</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="new-desc">Keterangan</label>
            <input type="text" id="new-desc" class="form-input" placeholder="Opsional" />
          </div>
          <div id="add-account-errors" class="hidden"></div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-primary" id="btn-save-account" type="button">Simpan Akun</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-save-account').addEventListener('click', () => {
        saveNewAccount(settingsEl);
      });
    },
  });
}

function saveNewAccount(settingsEl) {
  const code    = document.getElementById('new-code')?.value.trim() ?? '';
  const name    = document.getElementById('new-name')?.value.trim() ?? '';
  const type    = document.getElementById('new-type')?.value ?? '';
  const balance = document.getElementById('new-balance')?.value ?? '';
  const desc    = document.getElementById('new-desc')?.value.trim() ?? '';

  const newAccount = {
    id:            generateId('acc'),
    code,
    name,
    type,
    normalBalance: balance,
    category:      ACCOUNT_CATEGORY.OTHER_ASSET,
    isSystem:      false,
    isActive:      true,
    parentId:      null,
    description:   desc,
    createdAt:     new Date().toISOString(),
  };

  const accounts   = getAccounts();
  const validation = validateAccount(newAccount, accounts);

  if (!validation.valid) {
    const errEl = document.getElementById('add-account-errors');
    if (errEl) {
      errEl.className = 'mt-2';
      errEl.innerHTML = validation.messages
        .map(m => `<p class="form-error">${esc(m)}</p>`)
        .join('');
    }
    return;
  }

  accounts.push(newAccount);
  saveAccounts(accounts);
  emit(EVENTS.ACCOUNT_CREATED, newAccount);
  closeModal();
  showToast({ type: 'success', title: 'Akun berhasil ditambahkan.' });
  renderAkunSection(settingsEl);
}

function confirmDeleteAccount(settingsEl, accountId) {
  const accounts = getAccounts();
  const account  = accounts.find(a => a.id === accountId);
  if (!account) return;

  const journals   = getJournals();
  const { canDelete, reason } = canDeleteAccount(account, journals);

  if (!canDelete) {
    showToast({ type: 'error', title: 'Tidak dapat dihapus', message: reason });
    return;
  }

  openModal({
    title: 'Hapus Akun',
    size:  'sm',
    body:  `<p class="text-sm">Hapus akun <strong>${esc(account.name)}</strong> (${esc(account.code)})? Tindakan ini tidak dapat dibatalkan.</p>`,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-danger" id="btn-confirm-delete" type="button">Hapus</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-confirm-delete').addEventListener('click', () => {
        const updated = accounts.filter(a => a.id !== accountId);
        saveAccounts(updated);
        emit(EVENTS.ACCOUNT_UPDATED);
        closeModal();
        showToast({ type: 'success', title: 'Akun dihapus.' });
        renderAkunSection(settingsEl);
      });
    },
  });
}

// ─── Section 3: Saldo Awal ────────────────────────────────────────────────────

function renderSaldoSection(el) {
  const accounts = getAccounts();
  const opening  = getOpening();

  if (accounts.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            ${icon('cash', { size: '40' })}
            <div class="empty-state-title">Simpan profil usaha terlebih dahulu</div>
            <div class="empty-state-desc">Profil usaha dan bagan akun diperlukan sebelum mengisi saldo awal.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const isPosted = opening?.isPosted ?? false;
  const lines    = opening?.lines ?? [];

  // Build a map of existing opening values for pre-filling
  const lineMap = {};
  for (const l of lines) {
    lineMap[l.accountId] = { debit: l.debit, credit: l.credit };
  }

  // Only show balance sheet accounts for opening balances
  const bsAccounts = accounts.filter(a =>
    [ACCOUNT_TYPE.ASSET, ACCOUNT_TYPE.LIABILITY, ACCOUNT_TYPE.EQUITY].includes(a.type)
  ).sort((a, b) => a.code.localeCompare(b.code, 'id'));

  el.innerHTML = `
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h3 class="card-title">Saldo Awal</h3>
        ${isPosted ? `<span class="badge badge-green">Sudah Diposting</span>` : `<span class="badge badge-amber">Belum Diposting</span>`}
      </div>
      <div class="card-body">
        ${isPosted ? `
          <div class="flex items-start gap-3 mb-4 p-3 rounded" style="background: var(--color-primary-50); border: 1px solid var(--color-primary-200);">
            ${icon('info', { size: '18' })}
            <p class="text-sm" style="color: var(--color-primary-800);">
              Saldo awal sudah diposting dan tidak dapat diubah. Hubungi konsultan akuntansi jika perlu koreksi.
            </p>
          </div>
        ` : `
          <p class="text-sm mb-4" style="color: var(--color-text-muted);">
            Masukkan posisi keuangan usaha sebelum mulai menggunakan aplikasi ini.
            Total debit harus sama dengan total kredit sebelum dapat diposting.
          </p>
        `}

        <div class="mb-3">
          <label class="form-label" for="opening-date">Tanggal Saldo Awal</label>
          <input type="date" id="opening-date" class="form-input" style="width: auto;"
            value="${opening?.date ?? ''}" ${isPosted ? 'disabled' : ''} />
          <span class="form-hint">Biasanya satu hari sebelum transaksi pertama</span>
        </div>

        <div class="table-container mb-4">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th class="text-right">Debit (Rp)</th>
                <th class="text-right">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${bsAccounts.map(a => {
                const l = lineMap[a.id] ?? { debit: 0, credit: 0 };
                return `
                  <tr>
                    <td class="font-mono text-xs" style="color: var(--color-text-muted);">${esc(a.code)}</td>
                    <td class="text-sm">${esc(a.name)}</td>
                    <td style="width:170px;">
                      <input type="text" class="form-input text-right opening-debit font-mono"
                        data-account-id="${a.id}"
                        value="${l.debit > 0 ? l.debit : ''}"
                        placeholder="0"
                        ${isPosted ? 'disabled' : ''}
                        inputmode="numeric"
                        style="font-size: 0.8125rem;" />
                    </td>
                    <td style="width:170px;">
                      <input type="text" class="form-input text-right opening-credit font-mono"
                        data-account-id="${a.id}"
                        value="${l.credit > 0 ? l.credit : ''}"
                        placeholder="0"
                        ${isPosted ? 'disabled' : ''}
                        inputmode="numeric"
                        style="font-size: 0.8125rem;" />
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: var(--color-secondary-50); font-weight: 600;">
                <td colspan="2" class="text-sm">Total</td>
                <td class="text-right font-mono text-sm" id="opening-total-debit">Rp 0</td>
                <td class="text-right font-mono text-sm" id="opening-total-credit">Rp 0</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div id="opening-balance-alert" class="hidden mb-3"></div>

        ${!isPosted ? `
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" id="btn-save-opening" type="button">
              ${icon('check', { size: '14' })}
              Simpan Draft
            </button>
            <button class="btn btn-primary" id="btn-post-opening" type="button">
              ${icon('check', { size: '14' })}
              Posting Saldo Awal
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Live totals update
  el.querySelectorAll('.opening-debit, .opening-credit').forEach(input => {
    input.addEventListener('input', () => updateOpeningTotals(el));
  });
  updateOpeningTotals(el);

  el.querySelector('#btn-save-opening')?.addEventListener('click', () => saveOpeningDraft(el, false));
  el.querySelector('#btn-post-opening')?.addEventListener('click', () => saveOpeningDraft(el, true));
}

function updateOpeningTotals(el) {
  let totalDebit = 0, totalCredit = 0;
  el.querySelectorAll('.opening-debit').forEach(input => {
    totalDebit += parseIDR(input.value) ?? 0;
  });
  el.querySelectorAll('.opening-credit').forEach(input => {
    totalCredit += parseIDR(input.value) ?? 0;
  });

  const debitEl  = el.querySelector('#opening-total-debit');
  const creditEl = el.querySelector('#opening-total-credit');
  if (debitEl)  debitEl.textContent  = formatIDR(totalDebit);
  if (creditEl) creditEl.textContent = formatIDR(totalCredit);

  const alertEl = el.querySelector('#opening-balance-alert');
  if (!alertEl) return;

  if (totalDebit === 0 && totalCredit === 0) {
    alertEl.className = 'hidden mb-3';
  } else if (totalDebit === totalCredit) {
    alertEl.className = 'mb-3 p-3 rounded text-sm';
    alertEl.style.cssText = 'background: var(--color-positive-bg); border: 1px solid var(--color-primary-200); color: var(--color-primary-800);';
    alertEl.innerHTML = `${icon('check', { size: '16' })} Debit = Kredit — Saldo awal seimbang.`;
  } else {
    const diff = Math.abs(totalDebit - totalCredit);
    alertEl.className = 'mb-3 p-3 rounded text-sm flex items-center gap-2';
    alertEl.style.cssText = 'background: var(--color-negative-bg); border: 1px solid #fecaca; color: var(--color-negative);';
    alertEl.innerHTML = `${icon('alert', { size: '16' })} Selisih: ${formatIDR(diff)} — Debit dan kredit belum seimbang.`;
  }
}

function saveOpeningDraft(el, post) {
  const date = el.querySelector('#opening-date')?.value;
  if (!date) {
    showToast({ type: 'error', title: 'Tanggal saldo awal wajib diisi.' });
    return;
  }

  const lines = [];
  const accounts = getAccounts();
  const bsIds = new Set(
    accounts
      .filter(a => [ACCOUNT_TYPE.ASSET, ACCOUNT_TYPE.LIABILITY, ACCOUNT_TYPE.EQUITY].includes(a.type))
      .map(a => a.id)
  );

  let totalDebit = 0, totalCredit = 0;

  el.querySelectorAll('.opening-debit').forEach(input => {
    const accountId = input.dataset.accountId;
    const debit = parseIDR(input.value) ?? 0;
    if (debit > 0 && bsIds.has(accountId)) {
      totalDebit += debit;
      lines.push({ accountId, debit, credit: 0 });
    }
  });
  el.querySelectorAll('.opening-credit').forEach(input => {
    const accountId = input.dataset.accountId;
    const credit = parseIDR(input.value) ?? 0;
    if (credit > 0 && bsIds.has(accountId)) {
      totalCredit += credit;
      // Merge with existing debit line if same account
      const existing = lines.find(l => l.accountId === accountId);
      if (existing) {
        existing.credit = credit;
      } else {
        lines.push({ accountId, debit: 0, credit });
      }
    }
  });

  if (post && totalDebit !== totalCredit) {
    showToast({
      type:    'error',
      title:   'Saldo awal belum seimbang',
      message: `Selisih: ${formatIDR(Math.abs(totalDebit - totalCredit))}. Debit harus sama dengan kredit.`,
    });
    return;
  }

  const existing = getOpening() ?? {};
  const opening = {
    id:        existing.id ?? generateId('opn'),
    date,
    isPosted:  post,
    lines,
    createdAt: existing.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveOpening(opening);
  showToast({
    type:    'success',
    title:   post ? 'Saldo awal berhasil diposting.' : 'Draft saldo awal disimpan.',
  });

  if (post) renderSaldoSection(el);
}

// ─── Section 4: Keamanan (PIN) ────────────────────────────────────────────────

function renderKeamananSection(el) {
  const pinSet = hasPinSet();

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Keamanan — PIN Akses Lokal</h3>
      </div>
      <div class="card-body">
        <div class="flex items-start gap-3 mb-5 p-3 rounded" style="background: var(--color-accent-50); border: 1px solid var(--color-accent-200, #fde68a);">
          ${icon('warning', { size: '18' })}
          <div class="text-xs" style="color: var(--color-accent-800);">
            <strong>Catatan Keamanan:</strong> PIN ini hanya mencegah akses tidak sengaja di layar browser.
            Seseorang dengan akses ke DevTools browser dapat membaca data langsung dari localStorage.
            PIN bukan pengganti enkripsi penuh.
          </div>
        </div>

        ${pinSet ? `
          <p class="text-sm mb-4" style="color: var(--color-text-muted);">PIN aktif. Anda dapat mengubah atau menghapus PIN.</p>
          <div class="flex gap-2">
            <button class="btn btn-secondary" id="btn-change-pin" type="button">${icon('lock', { size: '14' })} Ubah PIN</button>
            <button class="btn btn-danger" id="btn-remove-pin" type="button">${icon('trash', { size: '14' })} Hapus PIN</button>
          </div>
        ` : `
          <p class="text-sm mb-4" style="color: var(--color-text-muted);">PIN belum diatur. Aktifkan PIN untuk membatasi akses ke aplikasi ini.</p>
          <button class="btn btn-primary" id="btn-setup-pin" type="button">${icon('lock', { size: '14' })} Atur PIN</button>
        `}
      </div>
    </div>
  `;

  el.querySelector('#btn-setup-pin')?.addEventListener('click', () => openPinSetupModal(el));
  el.querySelector('#btn-change-pin')?.addEventListener('click', () => openPinSetupModal(el));
  el.querySelector('#btn-remove-pin')?.addEventListener('click', () => openRemovePinModal(el));
}

function openPinSetupModal(settingsEl) {
  openModal({
    title: 'Atur PIN Akses',
    body: `
      <div class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label" for="pin-new">PIN Baru (min. 4 digit) <span class="required">*</span></label>
          <input type="password" id="pin-new" class="form-input" placeholder="••••" maxlength="12" inputmode="numeric" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pin-confirm">Konfirmasi PIN <span class="required">*</span></label>
          <input type="password" id="pin-confirm" class="form-input" placeholder="••••" maxlength="12" inputmode="numeric" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pin-recovery">Kode Pemulihan (min. 8 karakter) <span class="required">*</span></label>
          <input type="text" id="pin-recovery" class="form-input" placeholder="Simpan di tempat aman" autocomplete="off" />
          <span class="form-hint">Simpan kode ini di luar aplikasi. Jika lupa PIN, kode ini digunakan untuk reset.</span>
        </div>
        <div id="pin-setup-error" class="hidden"></div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-primary" id="btn-save-pin" type="button">${icon('lock', { size: '14' })} Simpan PIN</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-save-pin').addEventListener('click', async () => {
        const pin1     = document.getElementById('pin-new')?.value ?? '';
        const pin2     = document.getElementById('pin-confirm')?.value ?? '';
        const recovery = document.getElementById('pin-recovery')?.value ?? '';
        const errEl    = document.getElementById('pin-setup-error');

        const showErr = msg => {
          errEl.className = 'form-error mt-1';
          errEl.textContent = msg;
        };

        if (pin1.length < 4)          { showErr('PIN harus minimal 4 digit.'); return; }
        if (pin1 !== pin2)            { showErr('Konfirmasi PIN tidak cocok.'); return; }
        if (recovery.length < 8)      { showErr('Kode pemulihan minimal 8 karakter.'); return; }

        try {
          await setupPin(pin1, recovery);
          closeModal();
          showToast({ type: 'success', title: 'PIN berhasil diatur.' });
          renderKeamananSection(settingsEl);
        } catch (err) {
          showErr(err.message);
        }
      });
    },
  });
}

function openRemovePinModal(settingsEl) {
  openModal({
    title: 'Hapus PIN',
    size:  'sm',
    body: `
      <div class="flex flex-col gap-4">
        <p class="text-sm">Masukkan PIN saat ini untuk mengonfirmasi penghapusan.</p>
        <div class="form-group">
          <label class="form-label" for="pin-current">PIN Saat Ini</label>
          <input type="password" id="pin-current" class="form-input" placeholder="••••" inputmode="numeric" autocomplete="current-password" />
        </div>
        <div id="pin-remove-error" class="hidden"></div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-danger" id="btn-confirm-remove-pin" type="button">Hapus PIN</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-confirm-remove-pin').addEventListener('click', async () => {
        const pin   = document.getElementById('pin-current')?.value ?? '';
        const errEl = document.getElementById('pin-remove-error');
        const ok    = await verifyPin(pin);

        if (!ok) {
          errEl.className = 'form-error';
          errEl.textContent = 'PIN salah.';
          return;
        }

        clearPin();
        closeModal();
        showToast({ type: 'success', title: 'PIN dihapus.' });
        renderKeamananSection(settingsEl);
      });
    },
  });
}

// ─── Section 5: Cadangan Data ─────────────────────────────────────────────────

function renderCadanganSection(el) {
  const biz = getBusiness();

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Cadangan Data (Ekspor JSON)</h3>
      </div>
      <div class="card-body">
        <p class="text-sm mb-4" style="color: var(--color-text-muted);">
          Ekspor semua data keuangan ke file JSON. File ini dapat digunakan untuk memulihkan data
          di browser ini atau di perangkat lain. <strong>Lakukan ini secara rutin.</strong>
        </p>
        <ul class="text-sm mb-5 flex flex-col gap-1" style="color: var(--color-text-muted);">
          <li>✓ Profil usaha</li>
          <li>✓ Bagan akun dan saldo awal</li>
          <li>✓ Semua jurnal dan transaksi</li>
          <li>✓ Data inventaris dan produksi</li>
          <li>✗ PIN tidak ikut dicadangkan (harus diatur ulang setelah pemulihan)</li>
        </ul>
        <button class="btn btn-primary" id="btn-export-backup" type="button">
          ${icon('download', { size: '14' })}
          Unduh Cadangan JSON
        </button>
        <div id="export-result" class="mt-3 text-sm hidden"></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-export-backup').addEventListener('click', () => {
    try {
      const name     = biz?.name ?? 'usaha';
      const filename = exportBackup(name);
      const resultEl = el.querySelector('#export-result');
      resultEl.className  = 'mt-3 text-sm';
      resultEl.style.color = 'var(--color-positive)';
      resultEl.textContent = `Cadangan berhasil diunduh: ${filename}`;
      showToast({ type: 'success', title: 'Cadangan berhasil diunduh.', message: filename });
    } catch (err) {
      showToast({ type: 'error', title: 'Gagal mengunduh cadangan.', message: err.message });
    }
  });
}

// ─── Section 6: Pulihkan Data ─────────────────────────────────────────────────

function renderPulihkanSection(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Pulihkan Data (Impor JSON)</h3>
      </div>
      <div class="card-body">
        <div class="flex items-start gap-3 mb-4 p-3 rounded" style="background: var(--color-negative-bg); border: 1px solid #fecaca;">
          ${icon('alert', { size: '18' })}
          <p class="text-sm" style="color: var(--color-negative);">
            <strong>Peringatan:</strong> Memulihkan data akan <strong>mengganti semua data saat ini</strong>.
            Buat cadangan terlebih dahulu sebelum melanjutkan.
          </p>
        </div>

        <div class="form-group mb-4">
          <label class="form-label" for="restore-file">Pilih File Cadangan (.json)</label>
          <input type="file" id="restore-file" accept=".json,application/json" class="form-input" style="padding: 0.4rem;" />
        </div>

        <button class="btn btn-secondary" id="btn-validate-restore" type="button">
          ${icon('search', { size: '14' })}
          Periksa File
        </button>

        <div id="restore-preview" class="hidden mt-4"></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-validate-restore').addEventListener('click', async () => {
    const fileInput = el.querySelector('#restore-file');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast({ type: 'error', title: 'Pilih file cadangan terlebih dahulu.' });
      return;
    }
    await validateAndPreviewRestore(el, file);
  });
}

async function validateAndPreviewRestore(settingsEl, file) {
  const previewEl = settingsEl.querySelector('#restore-preview');
  previewEl.className = 'mt-4';
  previewEl.innerHTML = `<p class="text-sm" style="color: var(--color-text-muted);">Memeriksa file...</p>`;

  const result = await validateBackupFile(file);

  if (!result.valid) {
    previewEl.innerHTML = `
      <div class="p-3 rounded" style="background: var(--color-negative-bg); border: 1px solid #fecaca;">
        <p class="text-sm font-semibold" style="color: var(--color-negative);">File tidak valid:</p>
        ${result.errors.map(e => `<p class="text-xs mt-1" style="color: var(--color-negative);">${esc(e)}</p>`).join('')}
      </div>
    `;
    return;
  }

  const s = result.summary;
  previewEl.innerHTML = `
    <div class="p-4 rounded mb-3" style="background: var(--color-primary-50); border: 1px solid var(--color-primary-200);">
      <p class="text-sm font-semibold mb-2" style="color: var(--color-primary-800);">Ringkasan Cadangan:</p>
      <div class="grid grid-cols-2 gap-1 text-sm" style="color: var(--color-primary-700);">
        <span>Nama Usaha:</span>       <span><strong>${esc(s.businessName)}</strong></span>
        <span>Diekspor:</span>         <span>${esc(s.exportedAt)}</span>
        <span>Versi Aplikasi:</span>   <span>${esc(s.appVersion)}</span>
        <span>Jumlah Jurnal:</span>    <span>${s.journalCount}</span>
        <span>Jumlah Transaksi:</span> <span>${s.txnCount}</span>
        <span>Jumlah Akun:</span>      <span>${s.accountCount}</span>
      </div>
    </div>
    <button class="btn btn-danger w-full" id="btn-confirm-restore" type="button">
      ${icon('upload', { size: '14' })}
      Pulihkan Data — Ganti Semua Data Saat Ini
    </button>
  `;

  previewEl.querySelector('#btn-confirm-restore').addEventListener('click', () => {
    openModal({
      title: 'Konfirmasi Pemulihan Data',
      size:  'sm',
      body: `<p class="text-sm">Tindakan ini akan <strong>menghapus semua data saat ini</strong> dan menggantinya dengan data dari cadangan. Tidak dapat dibatalkan. Lanjutkan?</p>`,
      footer: `
        <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
        <button class="btn btn-danger" id="btn-final-restore" type="button">Ya, Pulihkan</button>
      `,
      onOpen(panel) {
        panel.querySelector('#btn-final-restore').addEventListener('click', () => {
          try {
            performRestore(result.envelope);
            closeModal();
            showToast({ type: 'success', title: 'Data berhasil dipulihkan.', message: 'Halaman akan dimuat ulang.' });
            setTimeout(() => window.location.reload(), 1800);
          } catch (err) {
            closeModal();
            showToast({ type: 'error', title: 'Pemulihan gagal.', message: err.message });
          }
        });
      },
    });
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** HTML-escape a string */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function legalForms(selected = '') {
  const forms = [
    { value: 'perorangan', label: 'Perorangan (Usaha Dagang / UD)' },
    { value: 'cv',         label: 'CV (Persekutuan Komanditer)'    },
    { value: 'pt',         label: 'PT (Perseroan Terbatas)'        },
    { value: 'firma',      label: 'Firma'                          },
    { value: 'koperasi',   label: 'Koperasi'                       },
    { value: 'lainnya',    label: 'Lainnya'                        },
  ];
  return forms.map(f =>
    `<option value="${f.value}" ${f.value === selected ? 'selected' : ''}>${f.label}</option>`
  ).join('');
}

function currentFiscalStart() {
  const year = new Date().getFullYear();
  return `${year}-01-01`;
}
