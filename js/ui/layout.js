/**
 * layout.js — Application shell, sidebar, and topbar rendering
 *
 * Renders the full application chrome into #app.
 * The page content is rendered into #page-content by the router.
 */

import { icon } from '../../assets/icons/icons.js';
import { navigate } from '../app/router.js';

// Navigation items — grouped sections
const NAV_SECTIONS = [
  {
    label: 'Utama',
    items: [
      { route: '/dashboard',    label: 'Dasbor',          iconName: 'dashboard'     },
      { route: '/transactions', label: 'Transaksi',        iconName: 'transactions'  },
      { route: '/journal',      label: 'Buku Jurnal',      iconName: 'journal'       },
    ],
  },
  {
    label: 'Produksi',
    items: [
      { route: '/inventory',    label: 'Inventaris',       iconName: 'inventory'     },
      { route: '/production',   label: 'Produksi',         iconName: 'production'    },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { route: '/reports',      label: 'Laporan Keuangan', iconName: 'reports'       },
      { route: '/tax',          label: 'Perpajakan',       iconName: 'tax'           },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { route: '/settings',     label: 'Pengaturan',       iconName: 'settings'      },
    ],
  },
];

/**
 * Render the full application shell into #app.
 * Called once during init; the router handles subsequent page changes.
 */
export function renderLayout() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <!-- Sidebar overlay (mobile) -->
    <div class="sidebar-overlay hidden" id="sidebar-overlay" aria-hidden="true"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar" aria-label="Navigasi utama">
      <div class="sidebar-logo">
        <div class="sidebar-logo-title">Akuntansi UMKM</div>
        <div class="sidebar-logo-subtitle">Pencatatan keuangan usaha</div>
      </div>

      <nav class="sidebar-nav" aria-label="Menu navigasi">
        ${NAV_SECTIONS.map(section => `
          <div>
            <div class="sidebar-section-label">${section.label}</div>
            ${section.items.map(item => `
              <button
                class="sidebar-item"
                data-route="${item.route}"
                aria-label="${item.label}"
                type="button"
              >
                ${icon(item.iconName, { size: '18' })}
                <span>${item.label}</span>
              </button>
            `).join('')}
          </div>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="text-xs" style="color: var(--sidebar-text-muted); line-height: 1.5;">
          Data tersimpan di browser ini.<br>
          <button class="underline" style="background:none;border:none;color:inherit;cursor:pointer;font-size:inherit;padding:0;" data-route="/settings" type="button">
            Buat cadangan data
          </button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-area" id="main-area">
      <!-- Topbar -->
      <header class="topbar" role="banner">
        <button class="topbar-menu-btn" id="topbar-menu-btn" aria-label="Buka menu" aria-expanded="false" aria-controls="sidebar" type="button">
          ${icon('menu', { size: '22' })}
        </button>
        <h1 class="topbar-title" id="topbar-title">Dasbor</h1>
        <div class="topbar-actions" id="topbar-actions"></div>
      </header>

      <!-- Page content — router renders here -->
      <main class="page-content" id="page-content" tabindex="-1" aria-live="polite">
        <!-- page renders here -->
      </main>
    </div>
  `;

  // Sidebar navigation click handler
  app.querySelectorAll('.sidebar-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      navigate(route);
      closeSidebar();
    });
  });

  // Mobile sidebar toggle
  const menuBtn = document.getElementById('topbar-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  menuBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) closeSidebar();
    else openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('topbar-menu-btn');

  sidebar?.classList.add('open');
  overlay?.classList.remove('hidden');
  menuBtn?.setAttribute('aria-expanded', 'true');
  menuBtn?.setAttribute('aria-label', 'Tutup menu');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('topbar-menu-btn');

  sidebar?.classList.remove('open');
  overlay?.classList.add('hidden');
  menuBtn?.setAttribute('aria-expanded', 'false');
  menuBtn?.setAttribute('aria-label', 'Buka menu');
}

/**
 * Update the topbar title text.
 * Called by each page's render function.
 * @param {string} title
 */
export function setTopbarTitle(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = title;
}

/**
 * Set custom action buttons in the topbar right area.
 * @param {string} html - HTML string for the actions area
 */
export function setTopbarActions(html) {
  const el = document.getElementById('topbar-actions');
  if (el) el.innerHTML = html;
}

/**
 * Clear topbar actions.
 */
export function clearTopbarActions() {
  const el = document.getElementById('topbar-actions');
  if (el) el.innerHTML = '';
}
