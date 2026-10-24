/**
 * router.js — Hash-based client-side navigation
 *
 * Uses the URL hash (#/route) for navigation.
 * No server-side routing required — works with Vercel static hosting.
 *
 * Routes are registered as { path, render, title } objects.
 * The router listens for hashchange events and calls the matching render function.
 */

import { emit, EVENTS } from './events.js';

/** @type {Array<{ path: string, render: Function, title: string }>} */
const routes = [];

/** @type {string} */
let currentPath = '';

/**
 * Register a route.
 * @param {string} path - e.g. '/dashboard'
 * @param {Function} render - function(params) called when route is active
 * @param {string} title - page title in Bahasa Indonesia
 */
export function registerRoute(path, render, title) {
  routes.push({ path, render, title });
}

/**
 * Navigate to a path programmatically.
 * @param {string} path - e.g. '/dashboard'
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Return the current active path.
 * @returns {string}
 */
export function getCurrentPath() {
  return currentPath;
}

/**
 * Resolve the current hash to a path and render the matching route.
 * Falls back to the default route if no match is found.
 */
function resolve() {
  const hash = window.location.hash;
  const path = hash.startsWith('#') ? hash.slice(1) : (hash || '/dashboard');
  const normalised = path.startsWith('/') ? path : '/' + path;

  // Extract base path and query params
  const [basePath] = normalised.split('?');

  const route = routes.find(r => r.path === basePath)
    ?? routes.find(r => r.path === '/dashboard')
    ?? routes[0];

  if (!route) return;

  currentPath = basePath;
  document.title = `${route.title} — Akuntansi UMKM`;

  // Update active state in sidebar
  document.querySelectorAll('.sidebar-item[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === basePath);
  });

  // Render the page into the content area
  const contentEl = document.getElementById('page-content');
  if (contentEl) {
    route.render(contentEl);
  }

  emit(EVENTS.NAVIGATE, { path: basePath });
}

/**
 * Initialise the router.
 * Must be called after all routes are registered and the layout is rendered.
 */
export function initRouter() {
  window.addEventListener('hashchange', resolve);
  // Resolve on first load — if no hash, redirect to dashboard
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '/dashboard';
  } else {
    resolve();
  }
}
