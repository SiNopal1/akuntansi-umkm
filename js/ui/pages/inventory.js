/**
 * inventory.js page — Inventaris (Phase 4 MVP)
 */

import { setTopbarTitle, setTopbarActions } from '../layout.js';
import { icon }           from '../../../assets/icons/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast }      from '../components/toast.js';
import { dbGet, dbSet }   from '../../storage/db.js';
import { KEYS }           from '../../storage/schema.js';
import { getAllInventory, receiveItem } from '../../domain/inventory.js';
import { formatIDR, parseIDR } from '../../utils/currency.js';
import { generateId }     from '../../utils/id.js';

// Materials catalogue: { id, code, name, unit, createdAt }
const getMaterials = () => dbGet(KEYS.MATERIALS) ?? [];
const saveMaterials = d => dbSet(KEYS.MATERIALS, d);
const getProducts  = () => dbGet(KEYS.PRODUCTS)  ?? [];
const saveProducts  = d => dbSet(KEYS.PRODUCTS, d);

let activeTab = 'materials';

export function renderInventory(container) {
  setTopbarTitle('Inventaris');
  setTopbarActions(`
    <button class="btn btn-primary btn-sm" id="btn-add-item">
      ${icon('plus', { size: '14' })}
      Tambah Item
    </button>
  `);
  draw(container);
  document.getElementById('btn-add-item')?.addEventListener('click', () => openAddItemModal(container));
}

function draw(container) {
  const materials = getMaterials();
  const products  = getProducts();
  const invRecs   = getAllInventory();
  const invMap    = Object.fromEntries(invRecs.map(r => [r.itemId, r]));

  const tabs = [
    { id: 'materials', label: 'Bahan Baku' },
    { id: 'products',  label: 'Barang Jadi' },
  ];

  const renderRows = (items, type) => {
    if (items.length === 0) return `
      <tr><td colspan="6">
        <div class="empty-state">
          ${icon('inventory', { size: '40' })}
          <div class="empty-state-title">Belum ada data</div>
          <div class="empty-state-desc">Klik "Tambah Item" untuk menambahkan.</div>
        </div>
      </td></tr>`;
    return items.map(item => {
      const inv = invMap[item.id];
      const qty = inv?.qty ?? 0;
      const wac = inv?.wac ?? 0;
      return `
        <tr>
          <td class="text-xs font-mono" style="color:var(--color-text-muted)">${esc(item.code)}</td>
          <td class="text-sm font-medium">${esc(item.name)}</td>
          <td class="text-xs" style="color:var(--color-text-muted)">${esc(item.unit)}</td>
          <td class="text-right font-mono text-sm">${qty.toLocaleString('id-ID', { maximumFractionDigits: 3 })}</td>
          <td class="text-right font-mono text-sm">${wac > 0 ? formatIDR(wac) : '—'}</td>
          <td class="text-right font-mono text-sm font-medium">${qty > 0 && wac > 0 ? formatIDR(Math.round(qty * wac)) : '—'}</td>
        </tr>`;
    }).join('');
  };

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Inventaris</h2>
        <p class="page-subtitle">${materials.length} bahan baku, ${products.length} produk</p>
      </div>
    </div>
    <div class="flex gap-2 mb-4">
      ${tabs.map(t => `<button class="btn ${t.id === activeTab ? 'btn-primary' : 'btn-secondary'} btn-sm inv-tab" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="card">
      <div class="card-body p-0">
        <div class="table-container" style="border:none;">
          <table class="data-table">
            <thead><tr>
              <th>Kode</th><th>Nama</th><th>Satuan</th>
              <th class="text-right">Stok</th>
              <th class="text-right">Harga WAC</th>
              <th class="text-right">Nilai Stok</th>
            </tr></thead>
            <tbody id="inv-rows">
              ${activeTab === 'materials' ? renderRows(materials, 'material') : renderRows(products, 'product')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.inv-tab').forEach(btn => {
    btn.addEventListener('click', () => { activeTab = btn.dataset.tab; draw(container); });
  });
}

function openAddItemModal(container) {
  openModal({
    title: 'Tambah Item Inventaris',
    body: `
      <div class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label">Jenis <span class="required">*</span></label>
          <select id="item-type" class="form-select">
            <option value="material">Bahan Baku</option>
            <option value="product">Barang Jadi</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label" for="item-code">Kode <span class="required">*</span></label>
            <input type="text" id="item-code" class="form-input" placeholder="BK-001" />
          </div>
          <div class="form-group">
            <label class="form-label" for="item-unit">Satuan <span class="required">*</span></label>
            <input type="text" id="item-unit" class="form-input" placeholder="kg / pcs / liter" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="item-name">Nama Item <span class="required">*</span></label>
          <input type="text" id="item-name" class="form-input" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label" for="item-qty">Stok Awal</label>
            <input type="text" id="item-qty" class="form-input font-mono" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="item-wac">Harga Satuan (Rp)</label>
            <input type="text" id="item-wac" class="form-input font-mono" placeholder="0" />
          </div>
        </div>
        <div id="item-error" class="hidden"></div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-modal-close type="button">Batal</button>
      <button class="btn btn-primary" id="btn-save-item" type="button">Simpan</button>
    `,
    onOpen(panel) {
      panel.querySelector('#btn-save-item').addEventListener('click', () => {
        const errEl = panel.querySelector('#item-error');
        const show  = msg => { errEl.className = 'form-error'; errEl.textContent = msg; };
        const type  = panel.querySelector('#item-type').value;
        const code  = panel.querySelector('#item-code').value.trim();
        const name  = panel.querySelector('#item-name').value.trim();
        const unit  = panel.querySelector('#item-unit').value.trim();
        const qty   = parseFloat(panel.querySelector('#item-qty').value) || 0;
        const wac   = parseIDR(panel.querySelector('#item-wac').value) ?? 0;

        if (!code) { show('Kode wajib diisi.'); return; }
        if (!name) { show('Nama wajib diisi.'); return; }
        if (!unit) { show('Satuan wajib diisi.'); return; }

        const item = { id: generateId('itm'), code, name, unit, createdAt: new Date().toISOString() };

        if (type === 'material') {
          const list = getMaterials();
          if (list.find(m => m.code === code)) { show('Kode sudah digunakan.'); return; }
          list.push(item);
          saveMaterials(list);
        } else {
          const list = getProducts();
          if (list.find(p => p.code === code)) { show('Kode sudah digunakan.'); return; }
          list.push(item);
          saveProducts(list);
        }

        if (qty > 0 && wac > 0) receiveItem(item.id, type, qty, wac);

        closeModal();
        showToast({ type: 'success', title: 'Item ditambahkan.' });
        activeTab = type === 'material' ? 'materials' : 'products';
        draw(container);
      });
    },
  });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
