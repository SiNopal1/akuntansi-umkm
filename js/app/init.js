/**
 * init.js — Application bootstrap (Phase 2 updated)
 *
 * Sequence:
 *   1. Check localStorage availability.
 *   2. Initialise meta record (first install or update).
 *   3. Run schema migrations.
 *   4. Check PIN gate — if PIN is set, show gate before rendering app.
 *   5. Populate in-memory state from storage.
 *   6. Render the application layout shell.
 *   7. Register all routes.
 *   8. Initialise the router (resolves the current hash).
 */

import { isStorageAvailable, initMeta, getBusiness, getAccounts } from '../storage/db.js';
import { runMigrations }      from '../storage/migrations.js';
import { hasPinSet, verifyPin, verifyRecovery } from '../services/pin.js';
import { setState }           from './state.js';
import { renderLayout }       from '../ui/layout.js';
import { registerRoute, initRouter } from './router.js';
import { icon }               from '../../assets/icons/icons.js';
import { showToast }          from '../ui/components/toast.js';

// Page render functions
import { renderDashboard }    from '../ui/pages/dashboard.js';
import { renderTransactions } from '../ui/pages/transactions.js';
import { renderJournal }      from '../ui/pages/journal.js';
import { renderInventory }    from '../ui/pages/inventory.js';
import { renderProduction }   from '../ui/pages/production.js';
import { renderReports }      from '../ui/pages/reports.js';
import { renderTax }          from '../ui/pages/tax.js';
import { renderSettings }     from '../ui/pages/settings.js';

// Bootstrap the application
(async function boot() {

  // 1. localStorage availability check
  if (!isStorageAvailable()) {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;padding:2rem;text-align:center;">
        <div style="color:#dc2626;">${icon('alert', { size: '48' })}</div>
        <h1 style="font-size:1.25rem;font-weight:700;">Penyimpanan Tidak Tersedia</h1>
        <p style="color:#64748b;max-width:380px;">
          Browser Anda tidak mendukung localStorage, atau akses ke penyimpanan diblokir
          (misalnya mode incognito dengan storage dinonaktifkan).
          Aplikasi ini memerlukan localStorage untuk menyimpan data keuangan.
        </p>
      </div>
    `;
    return;
  }

  // 2. Initialise meta (first-run or version stamp)
  initMeta();

  // 3. Run pending schema migrations
  try {
    runMigrations();
  } catch (migrationErr) {
    // Show error but still let the user access the app to export a backup
    console.error('[boot] Migration failed:', migrationErr);
  }

  // 4. Populate in-memory state
  const business = getBusiness();
  const accounts = getAccounts();
  setState({
    isConfigured: !!business?.name,
    business:     business,
    accounts:     accounts,
    pinCleared:   false,
  });

  // 5. If PIN is set, show PIN gate before rendering the app
  if (hasPinSet()) {
    await showPinGate();
    setState({ pinCleared: true });
  }

  // 6. Render the persistent application shell
  renderLayout();

  // 7. Register all routes
  registerRoute('/dashboard',    renderDashboard,    'Dasbor');
  registerRoute('/transactions', renderTransactions, 'Transaksi');
  registerRoute('/journal',      renderJournal,      'Buku Jurnal');
  registerRoute('/inventory',    renderInventory,    'Inventaris');
  registerRoute('/production',   renderProduction,   'Produksi');
  registerRoute('/reports',      renderReports,      'Laporan Keuangan');
  registerRoute('/tax',          renderTax,          'Perpajakan');
  registerRoute('/settings',     renderSettings,     'Pengaturan');

  // 8. Start the router
  initRouter();

})();

/**
 * Show the PIN gate overlay and wait for correct PIN entry.
 * Returns a Promise that resolves when the gate is cleared.
 * @returns {Promise<void>}
 */
function showPinGate() {
  return new Promise(resolve => {
    const gate    = document.getElementById('pin-gate');
    const content = document.getElementById('pin-gate-content');
    if (!gate || !content) { resolve(); return; }

    let attempts = 0;

    const render = (errorMsg = '') => {
      content.innerHTML = `
        <div style="
          background: #fff;
          border-radius: 1rem;
          padding: 2.5rem 2rem;
          width: 340px;
          max-width: 90vw;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        ">
          <div style="color: var(--color-primary-600);">${icon('lock', { size: '36' })}</div>
          <div style="text-align:center;">
            <h1 style="font-size:1.125rem;font-weight:700;color:#1e293b;">Akuntansi UMKM</h1>
            <p style="font-size:0.875rem;color:#64748b;margin-top:0.25rem;">Masukkan PIN untuk melanjutkan</p>
          </div>
          <div style="width:100%;">
            <input
              type="password"
              id="pin-gate-input"
              placeholder="••••"
              inputmode="numeric"
              maxlength="12"
              autocomplete="current-password"
              style="
                width:100%;
                padding: 0.625rem 1rem;
                font-size:1.25rem;
                letter-spacing: 0.2em;
                text-align:center;
                border: 1px solid ${errorMsg ? '#fecaca' : '#cbd5e1'};
                border-radius: 0.5rem;
                outline:none;
              "
            />
            ${errorMsg ? `<p style="color:#dc2626;font-size:0.75rem;margin-top:0.375rem;text-align:center;">${errorMsg}</p>` : ''}
          </div>
          <button
            id="pin-gate-submit"
            style="
              width:100%;
              background: var(--color-primary-600);
              color: #fff;
              border: none;
              border-radius: 0.5rem;
              padding: 0.625rem;
              font-size: 0.9375rem;
              font-weight: 600;
              cursor: pointer;
            "
            type="button"
          >Buka</button>
          <button
            id="pin-gate-recovery"
            style="background:none;border:none;font-size:0.75rem;color:#64748b;cursor:pointer;text-decoration:underline;"
            type="button"
          >Lupa PIN? Gunakan kode pemulihan</button>
        </div>
      `;

      const input  = content.querySelector('#pin-gate-input');
      const submit = content.querySelector('#pin-gate-submit');
      const recBtn = content.querySelector('#pin-gate-recovery');

      input.focus();

      const tryPin = async () => {
        const pin = input.value;
        const ok  = await verifyPin(pin);
        if (ok) {
          gate.classList.add('hidden');
          resolve();
        } else {
          attempts += 1;
          render(`PIN salah.${attempts >= 3 ? ' Gunakan kode pemulihan jika perlu.' : ''}`);
        }
      };

      input.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
      submit.addEventListener('click', tryPin);
      recBtn.addEventListener('click', () => renderRecovery());
    };

    const renderRecovery = (errorMsg = '') => {
      content.innerHTML = `
        <div style="
          background: #fff;
          border-radius: 1rem;
          padding: 2.5rem 2rem;
          width: 360px;
          max-width: 90vw;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        ">
          <h2 style="font-size:1rem;font-weight:700;color:#1e293b;">Reset dengan Kode Pemulihan</h2>
          <p style="font-size:0.8125rem;color:#64748b;">
            Masukkan kode pemulihan yang Anda simpan saat mengatur PIN.
            PIN akan dihapus dan Anda dapat mengatur PIN baru di Pengaturan.
          </p>
          <input
            type="text"
            id="recovery-input"
            placeholder="Kode pemulihan"
            autocomplete="off"
            style="
              width:100%;
              padding: 0.5rem 0.75rem;
              border: 1px solid ${errorMsg ? '#fecaca' : '#cbd5e1'};
              border-radius: 0.5rem;
              font-size: 0.875rem;
            "
          />
          ${errorMsg ? `<p style="color:#dc2626;font-size:0.75rem;">${errorMsg}</p>` : ''}
          <div style="display:flex;gap:0.5rem;">
            <button id="recovery-back"
              style="flex:1;padding:0.5rem;border:1px solid #cbd5e1;border-radius:0.5rem;background:#fff;cursor:pointer;font-size:0.875rem;"
              type="button">Kembali</button>
            <button id="recovery-submit"
              style="flex:1;padding:0.5rem;background:var(--color-primary-600);color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-size:0.875rem;font-weight:600;"
              type="button">Verifikasi</button>
          </div>
        </div>
      `;

      content.querySelector('#recovery-back').addEventListener('click', () => render());
      content.querySelector('#recovery-submit').addEventListener('click', async () => {
        const code = content.querySelector('#recovery-input').value;
        const ok   = await verifyRecovery(code);
        if (ok) {
          gate.classList.add('hidden');
          resolve();
          // Show a reminder to set a new PIN
          setTimeout(() => {
            showToast({
              type:    'warning',
              title:   'PIN dihapus',
              message: 'Atur PIN baru di Pengaturan → Keamanan.',
              duration: 8000,
            });
          }, 500);
        } else {
          renderRecovery('Kode pemulihan salah.');
        }
      });
    };

    gate.classList.remove('hidden');
    render();
  });
}
