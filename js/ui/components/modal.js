/**
 * modal.js — Modal dialog system
 *
 * Manages a single modal at a time (stacking is not required for this app).
 * Traps focus within the modal while open.
 * Closes on Escape key or backdrop click.
 *
 * Usage:
 *   import { openModal, closeModal } from './modal.js';
 *
 *   openModal({
 *     title: 'Konfirmasi',
 *     size: 'sm',               // 'sm' | '' | 'lg'
 *     body: '<p>Yakin?</p>',
 *     footer: `
 *       <button class="btn btn-secondary" data-modal-close>Batal</button>
 *       <button class="btn btn-primary" id="confirm-btn">Ya</button>
 *     `,
 *     onOpen: (panel) => { ... },
 *     onClose: () => { ... },
 *   });
 */

import { icon } from '../../../assets/icons/icons.js';
import { emit, EVENTS } from '../../app/events.js';

let currentOnClose = null;

/**
 * Open a modal dialog.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.body] - HTML string for the modal body
 * @param {string} [opts.footer] - HTML string for the modal footer
 * @param {'sm'|''|'lg'} [opts.size='']
 * @param {Function} [opts.onOpen] - called with the panel element after render
 * @param {Function} [opts.onClose] - called when modal is closed
 */
export function openModal({ title, body = '', footer = '', size = '', onOpen, onClose } = {}) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  currentOnClose = onClose ?? null;

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';

  container.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-panel ${sizeClass}" role="document" id="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Tutup dialog" id="modal-close-btn">
            ${icon('close', { size: '20' })}
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>
  `;

  container.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Bind close triggers
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  container.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  // Escape key
  document.addEventListener('keydown', handleEscape);

  // Focus the first focusable element inside the panel
  const panel = document.getElementById('modal-panel');
  const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) focusable[0].focus();

  if (onOpen) onOpen(panel);
}

/**
 * Close the currently open modal.
 */
export function closeModal() {
  const container = document.getElementById('modal-container');
  if (!container || container.classList.contains('hidden')) return;

  container.classList.add('hidden');
  container.innerHTML = '';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleEscape);

  if (currentOnClose) {
    currentOnClose();
    currentOnClose = null;
  }

  emit(EVENTS.MODAL_CLOSE);
}

/** @param {KeyboardEvent} e */
function handleEscape(e) {
  if (e.key === 'Escape') closeModal();
}

/** @param {string} str */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
