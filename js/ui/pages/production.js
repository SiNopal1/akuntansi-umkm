/**
 * production.js page — Produksi MVP (Phase 4)
 */

import { setTopbarTitle, setTopbarActions } from '../layout.js';
import { icon }           from '../../../assets/icons/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast }      from '../components/toast.js';
import { dbGet, dbSet }   from '../../storage/db.js';
import { KEYS }           from '../../storage/schema.js';
import { issueItem, receiveItem } from '../../domain/inventory.js';
import { postTransaction, TX_TYPE } from '../../domain/transactions.js';
import { SYS_ACCOUNTS }   from '../../domain/accounts.js';
import { formatIDR, parseIDR } from '../../utils/currency.js';
import { formatDate, todayISO } from '../../utils/date.js';
import { generateId }     from '../../utils/id.js';
import { emit, EVENTS }   from '../../app/events.js';

const getBatches   = () => dbGet(KEYS.PRODUCTION) ?? [];
const saveBatches  = d => dbSet(KEYS.PRODUCTION, d);
const getMaterials = () => dbGet(KEYS.MATERIALS) ?? [];
const getProducts  = () => dbGet(KEYS.PRODUCTS)  ?? [];

export function renderProduction(container) {
  setTopbarTitle('Produksi');
  setTopbarActions(`
    <button class="btn btn-primary btn-sm" id="btn-new-batch">
      ${icon('plus', { size: '14' })}
      Batch Baru
    </button>
  `);
  draw(container);
  document.getElementById('btn-new-batch')?.addEventListener('click', () => openBatchModal(container));
}

function draw(container) {
  const batches   = getBatches().slice().reverse();
  const products  = getProducts();
  const pName     = id => products.find(p => p.id === id)?.name ?? id;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Produksi</h2>
        <p class="page-subtitle">${batches.length} batch produksi</p>
      </div>
    </div>
    <div class="card">
      <div class="card-body p-0">
        <div class="table-container" style="border:none;">
          <table class="data-table">
            <thead><tr>
              <th>No. Batch</th><th>Produk</th><th>Tanggal</th>
              <th class="text-right">Qty Rencana</th>
              <th class="text-right">Total Biaya</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              ${batches.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state">
                    ${icon('production', { size: '40' })}
                    <div class="empty-state-title">Belum ada batch produksi</div>
                    <div class="empty-state-desc">Klik "Batch Baru" untuk mencatat produksi.</div>
                  </div>
                </td></tr>
              ` : batches.map(b => `
                <tr>
                  <td class="font-mono text-xs">${esc(b.batchNo)}</td>
                  <td class="text-sm font-medium">${esc(pName(b.productId))}</td>
                  <td class="text-sm">${formatDate(b.date)}</td>
                  <td class="text-right text-sm">${b.plannedQty.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono text-sm">${formatIDR(b.totalCost)}</td>
                  <td><span class="badge ${b.status === 'COMPLETED' ? 'badge-green' : 'badge-amber'}">${b.status === 'COMPLETED' ? 'Selesai' : 'Draft'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openBatchModal(container) {
  const materials = getMaterials();
  const products  = getProducts();

  if (products.length === 0) {
    showToast({ type: 'error', title: 'Belum ada produk.', message: 'Tambahkan produk di menu Inventaris terlebih dahulu.' });
    return;
  }

  openModal({
    title: 'Catat Batch Produksi',
    size: 'lg',
    body: `
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label">Produk <span class="required">*</span></label>
            <select id="batch-product" class="form-select">
              ${products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal <span class="required">*</span></label>
            <input type="date" id="batch-date" class="form-input" value="${todayISO()}" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label">No. Batch <span class="required">*</span></label>
            <input type="text" id="batch-no" class="form-input" placeholder="BATCH-001" />
          </div>
          <div class="form-group">
            <label class="form-label">Qty Produksi (pcs) <span class="required">*</span></label>
            <input type="text" id="batch-qty" class="form-input font-mono" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Biaya Tenaga Kerja (Rp)</label>
          <input type="text" id="batch-labour" class="form-input font-mono" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Biaya Overhead (Rp)</label>
          <input type="text" id="batch-overhead" class="form-input font-mono" placeholder="0" />
        </div>
        ${materials.length > 0 ? `
          <div>
            <label class="form-label mb-2 block">Bahan Baku yang Dikonsumsi</label>
            <table class="data-table" style="font-size:0.8125rem;">
              <thead><tr><th>Bahan</th><th class="text-right">Qty</th></tr></thead>
              <tbody>
                ${materials.map(m => `
                  <tr>
                    <td>${esc(m.name)} (${esc(m.unit)})</td>
                    <td style="width:120px;">
                      <input type="text" class="form-input font-mono text-right mat-qty" data-mat-id="${m.id}" placeholder="0" style="font-size:0.8rem;" />
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-sm" style="color:var(--color-text-muted)">Tidak ada bahan baku terdaftar. Biaya bahan akan Rp0.</p>'}
        <div id="batch-error" class="hidden"></div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-primary" id="btn-save-batch" type="button">${icon('check', { size: '14' })} Posting Produksi</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-save-batch').addEventListener('click', () => {
        const errEl    = panel.querySelector('#batch-error');
        const show     = msg => { errEl.className = 'form-error'; errEl.textContent = msg; };
        const productId  = panel.querySelector('#batch-product').value;
        const date       = panel.querySelector('#batch-date').value;
        const batchNo    = panel.querySelector('#batch-no').value.trim();
        const plannedQty = parseFloat(panel.querySelector('#batch-qty').value) || 0;
        const labour     = parseIDR(panel.querySelector('#batch-labour').value) ?? 0;
        const overhead   = parseIDR(panel.querySelector('#batch-overhead').value) ?? 0;

        if (!date)       { show('Tanggal wajib diisi.'); return; }
        if (!batchNo)    { show('No. Batch wajib diisi.'); return; }
        if (plannedQty <= 0) { show('Qty produksi harus > 0.'); return; }

        // Collect material consumptions
        const matItems = [];
        panel.querySelectorAll('.mat-qty').forEach(inp => {
          const qty = parseFloat(inp.value) || 0;
          if (qty > 0) matItems.push({ matId: inp.dataset.matId, qty });
        });

        try {
          let materialCost = 0;
          const desc = `Produksi ${batchNo}`;

          // Issue materials → WIP
          for (const m of matItems) {
            const { totalCost } = issueItem(m.matId, m.qty);
            materialCost += totalCost;
            postTransaction({
              type: TX_TYPE.PRODUCTION_START, date, description: desc,
              reference: batchNo, amount: totalCost,
              accountId: m.matId, // from raw materials
            });
          }

          // Labour → WIP
          if (labour > 0) {
            postTransaction({
              type: TX_TYPE.EXPENSE_CASH, date, description: `${desc} — Tenaga Kerja`,
              reference: batchNo, amount: labour,
              accountId: SYS_ACCOUNTS.BIAYA_TKL,
              accountId2: SYS_ACCOUNTS.KAS,
            });
          }

          // Overhead → WIP (simplified: recorded as expense)
          if (overhead > 0) {
            postTransaction({
              type: TX_TYPE.EXPENSE_CASH, date, description: `${desc} — Overhead`,
              reference: batchNo, amount: overhead,
              accountId: SYS_ACCOUNTS.BIAYA_OVERHEAD,
              accountId2: SYS_ACCOUNTS.KAS,
            });
          }

          const totalCost = materialCost + labour + overhead;
          const unitCost  = plannedQty > 0 ? Math.round(totalCost / plannedQty) : 0;

          // Complete production → Finished Goods
          if (totalCost > 0) {
            postTransaction({
              type: TX_TYPE.PRODUCTION_COMPLETE, date, description: `${desc} — Selesai`,
              reference: batchNo, amount: totalCost,
            });
          }

          // Add to finished goods inventory
          if (unitCost > 0) receiveItem(productId, 'product', plannedQty, unitCost);

          // Save batch record
          const batches = getBatches();
          batches.push({
            id: generateId('bat'), batchNo, productId, date,
            plannedQty, materialCost, labour, overhead, totalCost,
            status: 'COMPLETED', createdAt: new Date().toISOString(),
          });
          saveBatches(batches);

          closeModal();
          showToast({ type: 'success', title: `Batch ${batchNo} diposting.`, message: `Total biaya: ${formatIDR(totalCost)}` });
          emit(EVENTS.PRODUCTION_COMPLETED);
          draw(container);
        } catch (err) {
          show(err.message);
        }
      });
    },
  });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
