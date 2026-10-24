/**
 * toast.js — Toast notification system
 *
 * Displays transient feedback messages (success, error, warning, info).
 * Accessible: uses aria-live="polite" on the container.
 *
 * Usage:
 *   import { showToast } from './toast.js';
 *   showToast({ type: 'success', title: 'Disimpan', message: 'Transaksi berhasil dicatat.' });
 */

import { icon } from '../../../assets/icons/icons.js';

const ICON_MAP = {
  success: 'check',
  error:   'alert',
  warning: 'warning',
  info:    'info',
};

const AUTO_DISMISS_MS = {
  success: 4000,
  error:   7000,
  warning: 6000,
  info:    5000,
};

/**
 * Show a toast notification.
 * @param {object} opts
 * @param {'success'|'error'|'warning'|'info'} [opts.type='info']
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {number} [opts.duration] - override auto-dismiss duration in ms (0 = persistent)
 */
export function showToast({ type = 'info', title, message = '', duration } = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const dismissMs = duration !== undefined ? duration : AUTO_DISMISS_MS[type] ?? 5000;
  const iconName = ICON_MAP[type] ?? 'info';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon ${type}">${icon(iconName, { size: '18' })}</span>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Tutup notifikasi">
      ${icon('close', { size: '16' })}
    </button>
  `;

  const close = () => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 150ms ease';
    setTimeout(() => toast.remove(), 160);
  };

  toast.querySelector('.toast-close').addEventListener('click', close);

  container.appendChild(toast);

  if (dismissMs > 0) {
    setTimeout(close, dismissMs);
  }
}

/** @param {string} str */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
