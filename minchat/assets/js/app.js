/* ==================================================================
   Pulse Chat - Application (SPA)
   ================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* Utility helpers                                                     */
/* ------------------------------------------------------------------ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** SVG icon factory. Icons are inline so no external icon lib is needed. */
const PATHS = {
  chat: '<path d="M12 3C7 3 3 6.6 3 11c0 2.1.9 4 2.3 5.5-.2 1.2-.8 2.4-1.8 3.4 1.4.1 2.8-.3 3.9-1 1.4.5 3 .8 4.6.8 5 0 9-3.6 9-8S17 3 12 3z"/>',
  send: '<path d="M3.4 20.4l17.6-8.4L3.4 3.6l1.8 7.4 7.6.9-7.6.9-1.8 7.6z"/>',
  arrowRight: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.8 20a6.5 6.5 0 0 0-3.3-5.7"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  arrowLeft: '<path d="M19 12H5m7-7-7 7 7 7"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  doubleCheck: '<path d="M1.5 12.5 6 17l1-1"/><path d="M7 17l1-1M12 6.5 20 14.5l-1.5 1.5M4.5 4l8 8-1.5 1.5L3 5.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-4 4 4"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M13 2v6h6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  camera: '<path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>',
  group: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17.5 5.2a3.5 3.5 0 0 1-.2 6M21 20a6.5 6.5 0 0 0-4-6"/>',
  leave: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  menu: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a19.7 19.7 0 0 1 5.2-6.1M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a19.7 19.7 0 0 1-3.6 4.6M3 3l18 18"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  paperclip: '<path d="M21.4 11.1 12.9 19.6a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.9 1.9 0 0 1-2.7-2.7l7.8-7.8"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  arrowUp: '<path d="m5 12 7-7 7 7M12 19V5"/>',
  arrowDown: '<path d="M12 5v14m-7-8 7 8 7-8"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
  userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  flag: '<path d="M4 22V4c0-.6.4-1 1-1h9.5l-1 3.5L14.5 10H5"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>',
  reply: '<path d="m3 11 18-7-7 18-3.5-7z"/>',
  forward: '<path d="M21 3 3 10.5l7 3L13 17l-1 4 4-13z"/><path d="M10 13.5 21 3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  replyArrow: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v1"/>',
};

function icon(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Time formatting                                                     */
/* ------------------------------------------------------------------ */

const toDate = s => {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
};

function fmtClock(s) {
  const d = toDate(s);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(s) {
  const d = toDate(s);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dayLabel(s) {
  const d = toDate(s);
  if (!d) return '';
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startDay = new Date(d); startDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startToday - startDay) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function fmtAgo(s) {
  const d = toDate(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
}

/* ------------------------------------------------------------------ */
/* API                                                                */
/* ------------------------------------------------------------------ */

const CSRF = window.PULSE_CSRF || '';

/* The token is minted server-side and embedded in the page. If the session was
   rotated after this page was served (login, or a stale tab), every write would
   be rejected. Recover once, lazily, from api/session.php. */
let csrfRetry = null;
function refreshCsrfToken() {
  if (!csrfRetry) {
    csrfRetry = fetch('api/session.php', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        const t = d && d.ok && d.session && d.session.csrf;
        if (t) { window.PULSE_CSRF = t; state.csrf = t; }
        return t || null;
      })
      .catch(() => null);
  }
  return csrfRetry;
}

function isCsrfRejection(res, data) {
  if (res.status !== 403) return false;
  const msg = (data && data.error) || '';
  return /security token/i.test(msg);
}

async function api(path, opts = {}, allowCsrfRetry = true) {
  const o = { headers: {}, ...opts };
  const isForm = o.body instanceof FormData;
  if (!isForm && o.body && typeof o.body !== 'string') {
    o.headers['Content-Type'] = 'application/json';
    o.body = JSON.stringify(o.body);
  }
  const method = (o.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    o.headers['X-CSRF-Token'] = window.PULSE_CSRF || CSRF;
  }
  let res;
  try {
    res = await fetch(path, o);
  } catch (e) {
    throw new Error('Network error. Check your connection.');
  }
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON */ }

  if (allowCsrfRetry && method !== 'GET' && method !== 'HEAD' && isCsrfRejection(res, data)) {
    csrfRetry = null;
    const fresh = await refreshCsrfToken();
    if (fresh) return api(path, opts, false);
  }

  if (res.status === 401) {
    return { __authError: true };
  }
  if (!res.ok || !data || data.ok !== true) {
    const err = new Error((data && data.error) || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

const apiGet  = (p) => api(p);
const apiPost = (p, body, extra) => {
  const opts = { method: 'POST', ...(extra || {}) };
  if (body instanceof FormData) opts.body = body;
  else opts.body = body || {};
  return api(p, opts);
};

/* ------------------------------------------------------------------ */
/* App state                                                           */
/* ------------------------------------------------------------------ */

const state = {
  me: null,
  csrf: CSRF,
  convs: [],                 // conversation list
  tab: 'chats',              // 'chats' | 'people'
  search: '',
  activeId: null,            // active conversation id
  messages: [],              // active conversation messages (asc)
  olderBlocks: [],           // older blocks loaded via pagination (arrays asc)
  hasMore: false,
  activeMeta: null,          // conversation context incl my role
  typing: [],                // typing people in active conversation
  replyTo: null,             // message being replied to (quote preview)
  infoOpen: false,
  notifs: [],
  notifUnread: 0,
  lastConvJson: '',
  lastNotifFetch: 0,
  startedAt: Date.now(),
};

let pollers = [];

function stopPolling() {
  pollers.forEach(c => clearInterval(c));
  pollers = [];
}

function schedule(fn, ms) {
  pollers.push(setInterval(fn, ms));
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const TICON = { success: 'check', error: 'x', info: 'bell' };

function toast(message, type = 'info', ttl = 3400) {
  const wrap = $('#toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icon(TICON[type] || 'bell', 19)}<span>${message}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('leaving');
    setTimeout(() => t.remove(), 240);
  }, ttl);
}

/* ------------------------------------------------------------------ */
/* Modal system                                                        */
/* ------------------------------------------------------------------ */

function openModal(titleHTML, bodyHTML, opts = {}) {
  closeOverlays();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${titleHTML}</h3>
      <button class="icon-btn" data-close-modal>${icon('x', 20)}</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
  `;
  wrap.appendChild(modal);
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target.closest('[data-close-modal]')) {
      if (opts.onClose) opts.onClose();
      wrap.remove();
    }
  });
  $('#modal-container').appendChild(wrap);
  return wrap;
}

function closeModal() {
  const w = $('#modal-container').lastElementChild;
  if (w) w.remove();
}

function confirmDialog({ title, message, confirmText = 'Confirm', danger = true }) {
  return new Promise(resolve => {
    const wrap = openModal(esc(title), `
      <p class="muted" style="font-size:14px;line-height:1.55">${esc(message)}</p>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn-ghost" style="flex:1" data-conf-no>Cancel</button>
        <button class="btn-primary ${danger ? 'danger' : ''}" style="flex:1" data-conf-yes data-danger="${danger ? 'yes' : 'no'}">${esc(confirmText)}</button>
      </div>
      <style>
        .btn-primary.danger { background: var(--error); color: var(--on-error-container); }
      </style>
    `);
    const b = wrap.querySelector('[data-conf-yes]');
    const n = wrap.querySelector('[data-conf-no]');
    const done = v => { wrap.remove(); resolve(v); };
    b.addEventListener('click', () => done(true));
    n.addEventListener('click', () => done(false));
  });
}

/* ------------------------------------------------------------------ */
/* Menus & overlays                                                    */
/* ------------------------------------------------------------------ */

let activeMenu = null;
function closeMenus() {
  if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  const np = $('#notif-panel');
  if (np) np.remove();
}
function closeOverlays() {
  closeMenus();
  const f = $('#info-panel');
  const fb = $('#panel-backdrop');
  if (f && f.hasAttribute('data-overlay-close')) f.remove();
  if (fb) fb.remove();
}

function openMenu(anchor, items) {
  closeMenus();
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map(it => {
    if (!it) return '<div class="menu-sep"></div>';
    return it.header
      ? `<div class="menu-head">${esc(it.header)}</div>`
      : `<button class="${it.danger ? 'danger ' : ''}${it.disabled ? 'disabled' : ''}" data-act="${esc(it.id)}">${icon(it.icon, 17)}<span>${esc(it.label)}</span></button>`;
  }).join('');
  document.body.appendChild(m);
  activeMenu = m;
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - mw - 8);
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  m.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.classList.contains('disabled')) return;
    const it = items.find(i => i.id === btn.dataset.act);
    closeMenus();
    if (it && it.onClick) it.onClick();
  });
  setTimeout(() => {
    const closer = e => { if (!m.contains(e.target)) closeMenus(); };
    document.addEventListener('click', closer, { once: true });
    document.addEventListener('scroll', closer, { once: true, capture: true });
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('pulse_theme', theme);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(cur);
  if (state.me) {
    apiPost('api/profile.php', { action: 'update', theme: cur }).then(d => {
      state.me = d.user;
    }).catch(() => {});
  }
}

function initTheme() {
  const saved = localStorage.getItem('pulse_theme');
  const def = (state.me && state.me.theme) || saved || 'dark';
  document.documentElement.setAttribute('data-theme', def);
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ['#5b5ef5', '#00a572', '#e05cab', '#e07b39', '#2f9bc2', '#8b5cf6', '#3f9d5e', '#c2456b'];

function avatarHTML(user, size = 48, extraClass = '') {
  const initial = (user.full_name || user.username || '?').trim().charAt(0).toUpperCase();
  if (user.avatar) {
    return `<span class="avatar ${extraClass}" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px"><img src="${esc(user.avatar)}" alt="" onerror="this.parentElement.classList.add('broken');this.remove()"></span>`;
  }
  let h = 0;
  const s = user.username || user.full_name || '';
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const color = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return `<span class="avatar ${extraClass}" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px;background:${color}">${esc(initial)}</span>`;
}

/* ================================================================== */
/* AUTH VIEW                                                           */
/* ================================================================== */

function renderAuth(mode = 'login', prefill = {}) {
  stopPolling();
  resetChatUI();
  const app = $('#app');

  let body = '';
  if (mode === 'forgot') {
    body = `
      <div class="auth-brand">
        <div class="auth-logo">${icon('lock', 30)}</div>
        <h1>Forgot password?</h1>
        <p>Enter your account email or username and we'll send you a secure reset link.</p>
      </div>
      <form id="forgot-form" novalidate>
        <div class="field">
          <label class="field-label">Email or username</label>
          <div class="field-inner">
            ${icon('at', 19)}
            <input id="fp-identifier" type="text" placeholder="you@example.com" value="${esc(prefill.identifier || '')}" autocomplete="username">
          </div>
        </div>
        <button class="btn-primary" type="submit" id="fp-submit">Send reset link ${icon('send', 17)}</button>
      </form>
      <div style="display:none;margin-top:8px;border-radius:12px;background:var(--surface-mid);padding:12px 14px;font-size:13px;line-height:1.5" id="fp-result"></div>
      <div class="auth-switch" style="margin-top:16px">
        <span>Remembered it?</span> <button type="button" data-auth="login">Back to sign in</button>
      </div>
    `;
  } else {
    const isLogin = mode === 'login';
    body = `
      <div class="auth-brand">
        <div class="auth-logo">${icon('chat', 30)}</div>
        <h1>${isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p>${isLogin ? 'Sign in to sync your chats and continue the conversation.' : 'Join Pulse Chat and start messaging instantly.'}</p>
      </div>
      <form id="auth-form" novalidate>
      ${!isLogin ? `
      <div class="field">
        <label class="field-label">Full name</label>
        <div class="field-inner">${icon('user', 19)}<input id="reg-name" type="text" placeholder="Alex Morgan" autocomplete="name"></div>
      </div>
      <div class="field">
        <label class="field-label">Username</label>
        <div class="field-inner">${icon('at', 19)}<input id="reg-username" type="text" placeholder="alexmorgan" autocomplete="username"></div>
      </div>
      ` : ''}
      <div class="field">
        <label class="field-label">${isLogin ? 'Email or username' : 'Email'}</label>
        <div class="field-inner">${icon('mail', 19)}<input id="auth-id" type="text" placeholder="${isLogin ? 'you@example.com or @handle' : 'you@example.com'}" autocomplete="username"></div>
      </div>
      <div class="field">
        <label class="field-label">Password ${isLogin ? '<a href="#" data-auth="forgot">Forgot?</a>' : ''}</label>
        <div class="field-inner">
          ${icon('lock', 19)}
          <input id="auth-pass" type="password" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
          <button type="button" class="field-eye" data-eye>${icon('eye', 18)}</button>
        </div>
        ${!isLogin ? `
        <div class="pw-strength" id="pw-strength"><i></i><i></i><i></i><i></i></div>
        ` : ''}
      </div>
      ${!isLogin ? `
      <div class="field">
        <label class="field-label">Confirm password</label>
        <div class="field-inner">${icon('lock', 19)}<input id="reg-pass2" type="password" placeholder="••••••••" autocomplete="new-password"></div>
      </div>
      <label class="checkline">
        <input type="checkbox" id="reg-agree">
        <span>I agree to the Terms of Service and Privacy Policy.</span>
      </label>
      ` : ''}
      <button class="btn-primary" type="submit" id="auth-submit" style="margin-top:8px">
        ${isLogin ? 'Sign in' : 'Create account'} ${icon('arrowRight', 17)}
      </button>
      </form>
      <div class="auth-switch">
        <span>${isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
        <button type="button" data-auth="${isLogin ? 'register' : 'login'}">${isLogin ? 'Create one' : 'Sign in'}</button>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">${body}</div>
    </div>
  `;

  // switch modes
  $$('[data-auth]', app).forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const m = b.dataset.auth;
    play();
    renderAuth(m);
  }));

  // toggle password visibility
  const eye = $('[data-eye]', app);
  if (eye) eye.addEventListener('click', () => {
    const inp = $('#auth-pass', app);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    eye.innerHTML = icon(inp.type === 'password' ? 'eye' : 'eyeOff', 18);
  });

  // password strength (register)
  const strength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  };
  const pwStrengths = ['#reg-name', '#reg-pass2'];
  const pw = $('#auth-pass', app);
  if (pw && mode === 'register') {
    pw.addEventListener('input', () => {
      const s = strength(pw.value);
      const bars = $$('#pw-strength i', app);
      bars.forEach((b, i) => {
        b.className = '';
        if (i < s) b.classList.add('on' + s);
      });
    });
  }

  // forgot form
  if (mode === 'forgot') {
    $('#forgot-form', app).addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('#fp-submit', app);
      setLoading(btn, true);
      try {
        const d = await apiPost('api/auth.php', { action: 'forgot', identifier: $('#fp-identifier', app).value.trim() });
        const box = $('#fp-result', app);
        box.style.display = 'block';
        if (d.dev_url && d.token) {
          box.innerHTML = `<b>Development mode:</b> No mail server detected, so here is your reset link. Opening it lets you set a new password.<br><br>
            <a href="${esc(d.dev_url)}" style="word-break:break-all;color:var(--primary)">${esc(d.dev_url)}</a>`;
          toast('Reset link generated', 'success');
        } else {
          box.innerHTML = `If an account exists for that address, a password reset link is on its way. Please check your inbox.`;
          toast('Reset email sent', 'success');
        }
        drawResult(box);
      } catch (err) {
        setLoading(btn, false);
        toast(err.message, 'error');
      }
    });
    return;
  }

  // login/register form submit
  const authForm = $('#auth-form', app);
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#auth-submit', app);
    if (btn.disabled) return;
    const identifier = trimV($('#auth-id', app));
    const password = $('#auth-pass', app).value;

    if (mode === 'register') {
      const name = trimV($('#reg-name', app));
      const username = trimV($('#reg-username', app));
      const pass2 = $('#reg-pass2', app).value;
      const agree = $('#reg-agree', app);
      if (!agree.checked) return toast('Please accept the Terms of Service.', 'error');
      if (password !== pass2) return toast('Passwords do not match.', 'error');
      setLoading(btn, true);
      try {
        const d = await apiPost('api/auth.php', { action: 'register', full_name: name, username, email: identifier, password, agree: 1 });
        afterAuth(d);
      } catch (err) {
        setLoading(btn, false);
        toast(err.message, 'error');
      }
    } else {
      setLoading(btn, true);
      try {
        const d = await apiPost('api/auth.php', { action: 'login', identifier, password });
        afterAuth(d);
      } catch (err) {
        setLoading(btn, false);
        toast(err.message, 'error');
      }
    }
  });
}

// tiny helper to grab trimmed values consistently
function trimV(el) { return el && el.value ? el.value.trim() : ''; }

function drawResult(box) {
  /* placeholder for styling hook */
  void box;
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle('btn-loading', on);
  btn.disabled = on;
}

function resetChatUI() {
  state.convs = [];
  state.activeId = null;
  state.messages = [];
  state.olderBlocks = [];
  state.hasMore = false;
  state.activeMeta = null;
  state.infoOpen = false;
  const shell = $('#app .shell');
  if (shell) shell.remove();
}

function afterAuth(d) {
  state.me = d.user;
  state.csrf = d.csrf;
  applyTheme(d.user.theme || document.documentElement.getAttribute('data-theme'));
  state.startedAt = Date.now();
  renderShell();
  refreshConversations(true);
  refreshNotifications();
  toast('Welcome, ' + d.user.full_name + '!', 'success');
}

/* ================================================================== */
/* MAIN SHELL                                                          */
/* ================================================================== */

function renderShell() {
  const app = $('#app');
  app.innerHTML = `
    <div class="shell ${state.activeId ? 'chat-open' : ''}" id="shell">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-logo">${icon('chat', 20)}</div>
            <div class="brand-text"><b>Pulse Chat</b><span>${esc(state.me ? state.me.full_name : '')}</span></div>
          </div>
          <div class="header-actions">
            <button class="icon-btn" id="btn-newchat" title="New chat">${icon('plus', 20)}</button>
            <button class="icon-btn" id="btn-theme" title="Toggle theme">${icon('moon', 20)}</button>
            <button class="icon-btn" id="btn-notif" title="Notifications">
              ${icon('bell', 20)}
              <span class="badge-dot hidden" id="notif-badge">0</span>
            </button>
          </div>
        </div>

        <div class="search-wrap">
          <div class="search-box">
            ${icon('search', 18)}
            <input id="main-search" type="text" placeholder="${state.tab === 'chats' ? 'Search conversations' : 'Find people…'}">
            <button class="icon-btn search-clear" id="search-clear" title="Clear">${icon('x', 15)}</button>
          </div>
        </div>

        <div class="segmented" id="segmented">
          <button data-tab="chats" class="active">${icon('chat', 16)} Chats <span class="count" id="seg-unread">0</span></button>
          <button data-tab="people">${icon('users', 16)} People</button>
        </div>

        <div class="conv-list" id="conv-list">
          <div class="empty-list" style="padding:40px 20px"><div style="width:44px;height:44px" class="spinner"></div><span>Loading conversations…</span></div>
        </div>

        <div style="padding:10px 14px;border-top:1px solid var(--divider);display:flex;align-items:center;gap:10px">
          <button style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;text-align:left" id="btn-settings">
            <span class="avatar-wrap">${avatarHTML(state.me || {}, 38, 'sm')}</span>
            <span style="min-width:0;display:flex;flex-direction:column;line-height:1.2">
              <b style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state.me ? state.me.full_name : '')}</b>
              <span style="font-size:11.5px;color:var(--on-surface-variant)">@${esc(state.me ? state.me.username : '')}</span>
            </span>
          </button>
          <button class="icon-btn" id="btn-logout" title="Sign out">${icon('logout', 20)}</button>
        </div>
      </aside>

      <!-- Chat pane -->
      <main class="chat-pane" id="chat-pane">
        <div class="chat-empty" id="chat-empty">
          <div class="empty-icon">${icon('chat', 40)}</div>
          <h2>${esc(state.me ? 'Welcome, ' + state.me.full_name.split(' ')[0] : '')}</h2>
          <p>Select a conversation or start a new one. Your messages appear here in real time.</p>
          <button class="btn-primary" style="width:auto;padding:0 22px" id="empty-newchat">${icon('plus', 17)} New chat</button>
        </div>
        <div id="chat-active" class="hidden" style="display:flex;flex-direction:column;height:100%;min-height:0"></div>
      </main>

      <!-- Right panel slot -->
      <div id="panel-slot"></div>
    </div>
  `;

  wireShell();
  // initial render based on current tab/conversation
  renderConvList();
  renderChatPane();
  updateThemeIcon();
}

function wireShell() {
  const shell = $('#app .shell');

  play();

  // theme
  $('#btn-theme', shell).addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  // notifications
  $('#btn-notif', shell).addEventListener('click', e => {
    e.stopPropagation();
    if ($('#notif-panel')) { closeMenus(); return; }
    renderNotifPanel();
    refreshNotifications(true);
  });

  // new chat / empty new chat
  $('#btn-newchat', shell).addEventListener('click', () => switchTab('people'));
  const enc = $('#empty-newchat', shell);
  if (enc) enc.addEventListener('click', () => switchTab('people'));

  // settings
  $('#btn-settings', shell).addEventListener('click', () => openSettingsModal());

  // logout
  $('#btn-logout', shell).addEventListener('click', async () => {
    const yes = await confirmDialog({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of Pulse Chat?',
      confirmText: 'Sign out',
    });
    if (!yes) return;
    try {
      await apiPost('api/logout.php', {});
    } catch (_) {}
    stopPolling();
    window.location.hash = '';
    renderAuth('login');
  });

  // segmented tabs
  $$('#segmented button', shell).forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // search
  const search = $('#main-search', shell);
  const clearBtn = $('#search-clear', shell);
  search.addEventListener('input', () => {
    state.search = search.value.trim();
    clearBtn.classList.toggle('show', !!state.search);
    if (state.tab === 'people') debouncedPeopleSearch();
    renderConvList();
  });
  clearBtn.addEventListener('click', () => {
    state.search = '';
    search.value = '';
    clearBtn.classList.remove('show');
    if (state.tab === 'people') debouncedPeopleSearch();
    renderConvList();
    search.focus();
  });

  if (!globalKeyHandler) {
    globalKeyHandler = onGlobalKey;
    document.addEventListener('keydown', globalKeyHandler);
  }
}

let globalKeyHandler = null;
function onGlobalKey(e) {
  if (e.key === 'Escape') {
    closeOverlays();
    if (state.tab === 'people' && state.search) {
      state.search = ''; const s = $('#main-search'); if (s) s.value = '';
      renderConvList();
    }
  }
}

function updateThemeIcon() {
  const b = $('#btn-theme');
  if (!b) return;
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  b.innerHTML = icon(light ? 'sun' : 'moon', 20);
}

function switchTab(tab) {
  state.tab = tab;
  const shell = $('#app .shell');
  if (!shell) return;
  $$('#segmented button', shell).forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const search = $('#main-search', shell);
  if (search) {
    search.value = '';
    state.search = '';
    search.placeholder = tab === 'chats' ? 'Search conversations' : 'Find people…';
    const c = $('#search-clear', shell); if (c) c.classList.remove('show');
  }
  if (tab === 'people') {
    debouncedPeopleSearch();
  }
  renderConvList();
}

/* ------------------------------------------------------------------ */
/* Conversation list                                                   */
/* ------------------------------------------------------------------ */

function renderConvList() {
  const list = $('#conv-list');
  if (!list) return;
  const shell = $('#app .shell');

  if (state.tab === 'people') {
    // user search results
    if (!state.peopleResults) {
      list.innerHTML = `<div class="empty-list">
        ${icon('users', 44)}
        <div style="line-height:1.5"><b style="color:var(--on-surface)">Find someone</b><br>Search by name or @username to start a chat.</div>
      </div>`;
      return;
    }
    if (state.peopleResults.length === 0) {
      list.innerHTML = `<div class="empty-list">
        ${icon('search', 44)}
        <span>No people found for "${esc(state.search)}".</span>
      </div>`;
      return;
    }
    list.innerHTML = '<div style="padding:4px 4px 10px">' + state.peopleResults.map(u => `
      <div class="people-row" data-user="${u.id}">
        <span class="avatar-wrap">${avatarHTML(u, 46)}<span class="online-dot ${u.online ? '' : 'off'}"></span></span>
        <div class="pr-info">
          <div class="pr-name">${esc(u.full_name)}</div>
          <div class="pr-sub">@${esc(u.username)}${u.is_online ? '' : ''}</div>
        </div>
        ${icon('chevronRight', 17)}
      </div>
    `).join('') + '</div>';
    list.querySelectorAll('[data-user]').forEach(row => {
      row.addEventListener('click', async () => {
        const id = Number(row.dataset.user);
        try { await startDirectChat(id); } catch (_) {}
      });
    });
    return;
  }

  const items = state.search
    ? state.convs.filter(c => (c.name || '').toLowerCase().includes(state.search.toLowerCase()) || (c.subtitle || '').toLowerCase().includes(state.search.toLowerCase()))
    : state.convs;

  if (state.convs.length === 0 && !state.search) {
    list.innerHTML = `<div class="empty-list" style="margin-top:24px">
      ${icon('chat', 44)}
      <div style="line-height:1.5"><b style="color:var(--on-surface)">No messages yet</b><br>Tap the + icon to start your first conversation.</div>
    </div>`;
    return;
  }
  if (items.length === 0) {
    list.innerHTML = `<div class="empty-list"><span>No conversations match "${esc(state.search)}".</span></div>`;
    return;
  }

  const convJson = JSON.stringify({ v: items.map(c => ({
    id: c.id, unread: c.unread, name: c.name, last: c.last_message && c.last_message.id,
    typing: c.typing.map(t => t.id), ts: c.updated_at, pref: c.last_message && (c.last_message.text || c.last_message.type),
  })) });
  // only re-render when the visible data actually changed
  if (convJson === state.lastConvJson && list.dataset.rendered) {
    updateUnreadTotals();
    return;
  }
  state.lastConvJson = convJson;
  list.dataset.rendered = '1';

  let html = '';
  for (const c of items) {
    const last = c.last_message;
    let preview = last ? last.text : 'No messages yet — say hi!';
    const typing = c.typing || [];
    const isTyping = typing.length > 0;
    const names = typing.map(t => t.full_name).join(', ');

    let timeStr = '';
    if (last && last.created_at) timeStr = fmtClock(last.created_at);

    html += `
      <div class="conv-item ${c.id === state.activeId ? 'active' : ''}" data-conv="${c.id}">
        <span class="avatar-wrap">
          ${avatarHTML(c.type === 'direct' ? (c.peer || {}) : { full_name: c.name, username: 'group' }, 48, c.type === 'group' ? 'group' : '')}
          ${c.type === 'direct' && c.peer ? `<span class="online-dot ${c.peer.online ? '' : 'off'}"></span>` : ''}
        </span>
        <div class="conv-main">
          <div class="conv-row1">
            <span class="conv-name">${esc(c.name || 'Chat')}</span>
            <span class="conv-time">${timeStr}</span>
          </div>
          <div class="conv-row2">
            <span class="conv-preview ${isTyping ? 'typing' : ''}">${isTyping ? esc(names + (typing.length > 1 ? ' are typing' : ' is typing')) + '…' : esc(preview)}</span>
            ${c.unread > 0 ? `<span class="unread-badge">${c.unread}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  list.innerHTML = html;

  list.querySelectorAll('[data-conv]').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.conv);
      openConversation(id);
    });
  });

  updateUnreadTotals();
}

function updateUnreadTotals() {
  const total = state.convs.reduce((a, c) => a + (c.unread || 0), 0);
  const seg = $('#seg-unread');
  if (seg) {
    seg.textContent = total;
    seg.style.display = total > 0 ? 'grid' : 'none';
  }
  const badge = $('#notif-badge');
  document.title = total > 0 ? `(${total}) Pulse Chat` : 'Pulse Chat';
  if (state.notifUnread) {
    if (badge) { badge.textContent = state.notifUnread; badge.classList.remove('hidden'); }
  } else if (badge) {
    badge.classList.add('hidden');
  }
}

/* ------------------------------------------------------------------ */
/* People search (new chat)                                            */
/* ------------------------------------------------------------------ */

let peopleSearchTimer = null;
function debouncedPeopleSearch() {
  clearTimeout(peopleSearchTimer);
  peopleSearchTimer = setTimeout(() => {
    if (state.tab !== 'people') return;
    const q = state.search;
    if (q.length < 2) { state.peopleResults = null; renderConvList(); return; }
    apiGet('api/users.php?q=' + encodeURIComponent(q)).then(d => {
      state.peopleResults = d.users;
      renderConvList();
    }).catch(() => {});
  }, 280);
}

async function startDirectChat(userId) {
  const d = await apiPost('api/conversations.php', { user_id: userId });
  upsertConversation(d.conversation);
  if (state.tab === 'people') {
    state.tab = 'chats';
    const shell = $('#app .shell');
    $$('#segmented button', shell).forEach(b => b.classList.toggle('active', b.dataset.tab === 'chats'));
  }
  openConversation(d.conversation_id, true);
  return d.conversation;
}

function upsertConversation(conv) {
  if (!conv) return;
  const i = state.convs.findIndex(c => c.id === conv.id);
  if (i >= 0) state.convs[i] = conv;
  else state.convs.unshift(conv);
  // reorder by recency
  state.convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  state.lastConvJson = '';
}

/* ------------------------------------------------------------------ */
/* Chat pane                                                           */
/* ------------------------------------------------------------------ */

function renderChatPane() {
  const empty = $('#chat-empty');
  const active = $('#chat-active');
  const shell = $('#app .shell');

  if (!state.activeId) {
    state.infoOpen = false;
    closeOverlays();
    if (empty) empty.classList.remove('hidden');
    if (active) active.classList.add('hidden');
    if (shell) shell.classList.remove('chat-open');
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (active) active.classList.remove('hidden');

  const shellEl = $('#app .shell');
  if (shellEl && window.innerWidth <= 760) shellEl.classList.add('chat-open');

  const conv = state.convs.find(c => c.id === state.activeId) || {};
  const typing = state.typing || [];
  const isTyping = typing.length > 0;
  const subLock = document.getElementById('chat-sub-label');

  const name = conv.name || '';
  let sub = '';
  if (conv.type === 'direct') {
    sub = conv.peer ? (conv.peer.online ? 'Online' : 'Last seen ' + (conv.peer.last_seen ? fmtAgo(conv.peer.last_seen) : 'recently')) : 'Direct chat';
  } else {
    sub = 'Group chat';
  }
  if (isTyping) sub = `${typing.map(t => t.full_name).join(', ')} ${typing.length > 1 ? 'are' : 'is'} typing…`;

  resetPaintedMessages();
  active.innerHTML = `
    <div class="chat-header">
      <button class="icon-btn back-btn" id="chat-back">${icon('arrowLeft', 20)}</button>
      <button class="avatar-wrap" id="head-people" style="background:none;padding:0;cursor:pointer">
        ${avatarHTML(conv.type === 'direct' ? (conv.peer || {}) : { full_name: name, username: 'group' }, 42, conv.type === 'group' ? 'group' : '')}
        ${conv.type === 'direct' && conv.peer ? `<span class="online-dot ${conv.peer.online ? '' : 'off'}"></span>` : ''}
      </button>
      <div class="chat-head-main" id="head-main">
        <div class="chat-head-name">${esc(name)}</div>
        <div class="chat-head-sub ${isTyping ? 'live' : ''}" id="chat-sub-label">${sub}</div>
      </div>
      <div class="chat-actions">
        ${conv.type === 'group' ? `<button class="icon-btn" id="btn-add-member" title="Add member">${icon('user', 20)}</button>` : ''}
        <button class="icon-btn" id="btn-panel-info" title="Details">${icon('info', 20)}</button>
        <button class="icon-btn" id="btn-conv-menu" title="More">${icon('menu', 20)}</button>
      </div>
    </div>
    <div class="msg-scroll" id="msg-scroll">
      <div class="msgs-wrap" id="msgs-wrap"></div>
    </div>
    <div class="composer-wrap" id="composer-wrap">
      <div class="pending-attachments" id="pending-attachments"></div>
      <div class="composer composer-outer">
        <button class="emoji-btn" id="btn-emoji" title="Emoji">${icon('smile', 21)}</button>
        <div class="input-area">
          <textarea id="msg-input" rows="1" placeholder="Message ${esc(name.split(' ')[0] || '')}…"></textarea>
          <button class="attach-btn" id="btn-attach" title="Attach file">${icon('paperclip', 22)}</button>
        </div>
        <button class="send-btn" id="btn-send" title="Send">${icon('send', 20)}</button>
      </div>
    </div>
  `;

  const scroll = $('#msg-scroll');
  scroll.scrollTop = scroll.scrollHeight;
  scroll.addEventListener('scroll', () => {
    if (state.newBelow && isNearBottom()) {
      state.newBelow = 0;
      const c = $('#new-msgs-chip');
      if (c) c.remove();
    }
  });

  $('#chat-back', active).addEventListener('click', () => {
    const s = $('#app .shell');
    if (s) s.classList.remove('chat-open');
    closeOverlays();
  });
  $('#head-main', active).addEventListener('click', () => {
    toggleInfoPanel(true);
  });
  $('#head-people', active).addEventListener('click', () => toggleInfoPanel(true));
  $('#btn-panel-info', active).addEventListener('click', () => toggleInfoPanel());
  $('#btn-conv-menu', active).addEventListener('click', (e) => {
    e.stopPropagation();
    openConversationMenu(e.currentTarget, conv);
  });
  const addBtn = $('#btn-add-member', active);
  if (addBtn) addBtn.addEventListener('click', () => openAddMemberSheet(conv));

  wireComposer(conv);

  renderReplyBar();
  renderMessages();
  renderInfoPanel();
}

function openConversation(id, fromClick) {
  if (state.activeId === id) {
    // just refresh
    loadMessages(id);
    return;
  }
  state.activeId = id;
  state.messages = [];
  state.olderBlocks = [];
  state.hasMore = false;
  state.typing = [];
  state.newBelow = 0;
  state.infoOpen = false;
  state.replyTo = null;
  resetPaintedMessages();
  closeOverlays();
  markRead(id);
  renderChatPane();
  refreshConversations(false);
}

async function loadMessages(convId) {
  try {
    const d = await apiGet(`api/messages.php?conversation_id=${convId}&limit=50`);
    state.messages = d.messages || [];
    state.hasMore = d.has_more;
    state.typing = d.typing || [];
    if (d.conversation) state.activeMeta = d.conversation;
    if (state.activeId !== convId) return;
    renderMessages();
  } catch (e) {
    if (e.__authError) handleAuthError();
  }
}

async function loadOlder(convId) {
  const oldest = state.messages.length ? state.messages[0].id : 0;
  if (!oldest) return;
  const beforeBtn = $('#load-older');
  if (beforeBtn) { beforeBtn.textContent = 'Loading…'; beforeBtn.disabled = true; }
  try {
    const d = await apiGet(`api/messages.php?conversation_id=${convId}&before=${oldest}&limit=50`);
    if (d.messages && d.messages.length) {
      state.olderBlocks.push(d.messages);
      state.hasMore = d.has_more;
      renderMessages();
    } else {
      state.hasMore = false;
    }
  } catch (e) {
    if (beforeBtn) { beforeBtn.textContent = 'Load earlier messages'; beforeBtn.disabled = false; }
  }
}

function markRead(convId, force) {
  const conv = state.convs.find(c => c.id === convId);
  if (!conv || (!force && conv.unread === 0)) return;
  apiPost('api/conversations.php?action=read', { conversation_id: convId })
    .then(() => {
      const c = state.convs.find(x => x.id === convId);
      if (c) { c.unread = 0; state.lastConvJson = ''; renderConvList(); }
      const b = $('#notif-badge');
      if (b && state.notifUnread) { /* keep bell until notifications cleared */ }
    })
    .catch(e => { if (e.__authError) handleAuthError(); });
}

function resetActiveConv() {
  state.activeId = null;
  state.infoOpen = false;
  closeOverlays();
  const shell = $('#app .shell');
  if (shell) shell.classList.remove('chat-open');
  closeChatSearch();
  renderChatPane();
}

/* in-chat search bar */
let chatSearchActive = false;

function openChatSearch() {
  closeChatSearch();
  const chatActive = $('#chat-active');
  if (!chatActive) return;
  chatSearchActive = true;
  const bar = document.createElement('div');
  bar.className = 'chat-search-bar';
  bar.id = 'chat-search-bar';
  bar.innerHTML = `
    <div class="search-box" style="flex:1">
      ${icon('search', 18)}
      <input id="chat-search-input" type="text" placeholder="Search in this chat…" autocomplete="off">
      <button class="search-clear" id="chat-search-clear">${icon('x', 16)}</button>
    </div>
    <span class="search-count" id="chat-search-count"></span>
    <button class="icon-btn" id="chat-search-close" title="Close search">${icon('x', 18)}</button>
  `;
  const header = chatActive.querySelector('.chat-header');
  if (header && header.nextSibling) {
    chatActive.insertBefore(bar, header.nextSibling);
  } else {
    chatActive.prepend(bar);
  }
  const input = $('#chat-search-input');
  if (input) input.focus();

  let searchTimer = null;
  $('#chat-search-input', bar).addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    const clearBtn = $('#chat-search-clear', bar);
    if (clearBtn) clearBtn.classList.toggle('show', q.length > 0);
    if (q.length < 2) {
      $('#chat-search-count', bar).textContent = '';
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const d = await apiGet(`api/messages.php?conversation_id=${state.activeId}&q=${encodeURIComponent(q)}`);
        const results = d.messages || [];
        $('#chat-search-count', bar).textContent = results.length + ' found';
        // highlight matching rows
        $$('.msg-row.highlight', $('#msgs-wrap')).forEach(r => r.classList.remove('highlight'));
        results.forEach(m => {
          const row = $('#msgs-wrap').querySelector(`[data-msg="${m.id}"]`);
          if (row) {
            row.classList.add('highlight');
            setTimeout(() => row.classList.remove('highlight'), 2300);
          }
        });
        if (results.length > 0) {
          scrollToMessage(results[results.length - 1].id);
        }
      } catch (e) { /* ignore */ }
    }, 400);
  });

  $('#chat-search-clear', bar).addEventListener('click', () => {
    input.value = '';
    input.focus();
    $('#chat-search-count', bar).textContent = '';
    $$('.msg-row.highlight', $('#msgs-wrap')).forEach(r => r.classList.remove('highlight'));
  });
  $('#chat-search-close', bar).addEventListener('click', closeChatSearch);
}

function closeChatSearch() {
  chatSearchActive = false;
  const bar = $('#chat-search-bar');
  if (bar) bar.remove();
  $$('.msg-row.highlight', $('#msgs-wrap')).forEach(r => r.classList.remove('highlight'));
}

function openConversationMenu(anchor, conv) {
  const items = [];
  items.push({ header: (conv.type === 'group' ? conv.name : 'Direct chat') });
  items.push({ id: 'info', icon: 'info', label: 'Conversation details', onClick: () => toggleInfoPanel(true) });
  if (conv.type === 'group') {
    items.push({ id: 'add', icon: 'user', label: 'Add members', onClick: () => openAddMemberSheet(conv) });
  }
  items.push({ id: 'clear', icon: 'trash', label: 'Clear this chat on my device', danger: true, onClick: async () => {
    const yes = await confirmDialog({ title: 'Clear chat', message: 'This removes the loaded messages from your view but leaves them on the server.', confirmText: 'Clear' });
    if (!yes) return;
    state.messages = [];
    state.olderBlocks = [];
    state.lastConvJson = '';
    renderMessages();
    toast('Chat cleared', 'info');
  }});
  openMenu(anchor, items);
}

/* ------------------------------------------------------------------ */
/* Messages rendering                                                  */
/* ------------------------------------------------------------------ */

function allMessages() {
  const older = state.olderBlocks.flat();
  return dedupeMessages([...older, ...state.messages]);
}

function dedupeMessages(list) {
  const map = new Map();
  for (const m of list) if (m) map.set(m.id, m);
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

/* Signature of what is currently painted in the chat panel. Polling compares
   against this so an unchanged list never touches the DOM. */
let msgsPainted = { sig: null, keys: [], lastDay: null, hasMore: null, empty: false };
let typingPaintedSig = null;

/* The chat panel markup is rebuilt from scratch by renderChatPane(), so the
   paint cache must be dropped whenever #msgs-wrap is replaced. */
function resetPaintedMessages() {
  msgsPainted = { sig: null, keys: [], lastDay: null, hasMore: null, empty: false };
  typingPaintedSig = null;
}

/* Content-aware per-message key. Editing a message in place leaves its id and
   deleted flag untouched, so those alone are not enough to detect a change. */
function messageKey(m) {
  return m.id + '|' + (m.deleted ? 'd' : '') + (m.pinned ? 'p' : '')
       + '|' + (m.reply_to || 0) + '|' + (m.attachment_id || 0) + '|' + (m.content || '');
}

function messageListSignature(msgs) {
  return (state.hasMore ? 'H' : '-') + msgs.map(messageKey).join(',');
}

function typingSignature() {
  const t = state.typing || [];
  if (!t.length) return '';
  return t.map(x => String(x.id || x.user_id || x.username || '')).join(',');
}

/* True when every already-painted message is byte-identical, so the only change
   is messages appended at the end and we can patch instead of rebuilding. */
function paintedIsPrefixOf(paintedKeys, msgs) {
  if (!paintedKeys.length || paintedKeys.length > msgs.length) return false;
  for (let i = 0; i < paintedKeys.length; i++) {
    if (paintedKeys[i] !== messageKey(msgs[i])) return false;
  }
  return true;
}

function syncTypingRow(wrap, tsig) {
  if (tsig === typingPaintedSig) return;
  typingPaintedSig = tsig;
  const old = wrap.querySelector('.typing-row');
  if (old) old.remove();
  if (!tsig) return;
  const row = document.createElement('div');
  row.className = 'msg-row peer typing-row';
  row.innerHTML = '<div class="msg-balloon typing-balloon"><div class="typing-dots"><i></i><i></i><i></i></div></div>';
  wrap.appendChild(row);
}

function syncNewMessageChip(scroll) {
  let chip = $('#new-msgs-chip');
  if (state.newBelow && state.activeId) {
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'new-msgs-chip';
      chip.className = 'new-msgs-chip';
      chip.innerHTML = `${icon('arrowDown', 15)} New messages`;
      (document.querySelector('#chat-active') || scroll).appendChild(chip);
      chip.addEventListener('click', () => {
        scroll.scrollTop = scroll.scrollHeight;
        state.newBelow = 0;
        chip.remove();
      });
    }
  } else if (chip) {
    chip.remove();
  }
}

function renderMessages() {
  const wrap = $('#msgs-wrap');
  const scroll = $('#msg-scroll');
  if (!wrap || !scroll) return;

  const msgs = allMessages();
  const sig = messageListSignature(msgs);
  const tsig = typingSignature();
  const P = msgsPainted;

  // Unchanged: polling stays completely invisible. No innerHTML, no scroll reset,
  // no image re-request, no animation restart, text selection survives.
  if (sig === P.sig) {
    syncTypingRow(wrap, tsig);
    syncNewMessageChip(scroll);
    return;
  }

  const snapBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 160;
  const prevHeight = scroll.scrollHeight;
  const conv = state.convs.find(c => c.id === state.activeId) || {};

  if (msgs.length === 0) {
    wrap.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px 20px;color:var(--on-surface-variant);text-align:center">
        ${icon('chat', 42)}
        <div style="line-height:1.5"><b style="color:var(--on-surface)">No messages yet</b><br>Start the conversation with a greeting <span style="font-size:15px">👋</span></div>
      </div>`;
    P.keys = []; P.lastDay = null; P.empty = true; P.hasMore = state.hasMore;
  } else if (P.sig !== null && !P.empty && P.hasMore === state.hasMore && paintedIsPrefixOf(P.keys, msgs)) {
    // Append-only: patch in just the new bubbles so the panel does not appear to reload.
    let html = '';
    let lastDay = P.lastDay;
    for (let i = P.keys.length; i < msgs.length; i++) {
      const m = msgs[i];
      const day = dayLabel(m.created_at);
      if (day !== lastDay) {
        html += `<div class="day-divider">${esc(day)}</div>`;
        lastDay = day;
      }
      html += messageHTML(m, conv);
    }
    P.lastDay = lastDay;

    const staging = document.createElement('div');
    staging.innerHTML = html;
    wireMessageEvents(staging);
    const trow = wrap.querySelector('.typing-row');
    if (trow) trow.before(staging); else wrap.appendChild(staging);

    P.keys = msgs.map(messageKey); P.empty = false; P.hasMore = state.hasMore;
  } else {
    let html = '';
    let lastDay = null;
    if (state.hasMore) {
      html += `<div style="text-align:center;margin:8px 0"><button class="choice-pill" id="load-older">${icon('arrowUp', 16)} Load earlier messages</button></div>`;
    }
    for (const m of msgs) {
      const day = dayLabel(m.created_at);
      if (day !== lastDay) {
        html += `<div class="day-divider">${esc(day)}</div>`;
        lastDay = day;
      }
      html += messageHTML(m, conv);
    }
    wrap.innerHTML = html;
    P.keys = msgs.map(messageKey); P.lastDay = lastDay; P.empty = false; P.hasMore = state.hasMore;

    const lo = $('#load-older');
    if (lo) lo.addEventListener('click', () => loadOlder(state.activeId));
    wireMessageEvents();
  }

  P.sig = sig;
  syncTypingRow(wrap, tsig);

  if (snapBottom) {
    scroll.scrollTop = scroll.scrollHeight;
    state.newBelow = 0;
  } else {
    scroll.scrollTop += scroll.scrollHeight - prevHeight;
  }

  syncNewMessageChip(scroll);
}

function messageHTML(m, conv) {
  if (m.deleted) {
    return `
      <div class="msg-row ${m.mine ? 'mine' : 'peer'}" data-msg="${m.id}">
        <div class="msg-balloon"><span class="msg-text msg-deleted">This message was deleted.</span></div>
      </div>`;
  }

  const who = m.mine ? {} : m.sender || {};
  const showAv = !m.mine && conv.type === 'group';

  // reply context quote block
  let replyHTML = '';
  if (m.reply_to) {
    const rq = m.reply_to;
    const rqText = rq.deleted
      ? 'This message was deleted.'
      : (rq.content || (rq.type === 'image' ? '🖼 Photo' : (rq.type === 'file' ? '📄 File' : '')));
    const rqWho = (rq.sender && (rq.sender.full_name || rq.sender.username)) || 'Someone';
    replyHTML = `
      <div class="msg-reply" data-reply-jump="${rq.id}">
        <span class="reply-sender">${esc(rqWho)}</span>
        <span class="reply-text">${esc(rqText)}</span>
      </div>`;
  }

  let content = '';
  if (m.type === 'image') {
    const src = m.attachment ? esc(m.attachment.url_path) : '';
    content = `<div class="att-image reg">${src ? `<img src="${src}" alt="image" loading="lazy" data-lightbox="${src}">` : ''}</div>`;
    if (m.content) content += `<div class="msg-text" style="margin-top:6px">${esc(m.content)}</div>`;
  } else if (m.type === 'file') {
    const a = m.attachment;
    content = `
      <div class="att-file">
        <span class="file-icon">${icon('file', 20)}</span>
        <div class="file-meta">
          <div class="file-name">${a ? esc(a.original_name) : 'File'}</div>
          <div class="file-size">${a ? fmtSize(a.size) : ''}</div>
        </div>
        ${a && a.url_path ? `<a href="${esc(a.url_path)}" download="${esc(a.original_name)}" onclick="event.stopPropagation()" style="color:var(--bubble-out-text)" title="Download">${icon('download', 19)}</a>` : ''}
      </div>`;
    if (m.content) content += `<div class="msg-text" style="margin-top:6px">${esc(m.content)}</div>`;
  } else {
    content = `<div class="msg-text">${esc(m.content)}</div>`;
  }

  const pinBadge = m.pinned ? `<span class="pin-badge" title="Pinned">${icon('pin', 13)}</span>` : '';

  const ticks = m.mine ? `
    <span class="msg-tick ${m.reads > 0 ? 'read' : ''}">${m.reads > 0 ? icon('doubleCheck', 14) : icon('check', 14)}</span>
  ` : '';

  const senderLabel = showAv ? `<div class="sender-label">${esc((m.sender && m.sender.full_name) || '')}</div>` : '';

  return `
    <div class="msg-row ${m.mine ? 'mine' : 'peer'}" data-msg="${m.id}">
      ${showAv ? `<span class="msg-av" data-profile="${m.sender_id}" style="cursor:pointer">${avatarHTML(m.sender || {}, 28, 'sm')}</span>` : ''}
      <div class="msg-balloon">
        ${senderLabel}
        ${replyHTML}
        ${content}
        <span class="msg-meta">
          ${pinBadge}
          ${ticks}
          <span>${fmtClock(m.created_at)}</span>
        </span>
        <button class="msg-ctx" data-ctx="${m.id}" title="Message actions" style="position:absolute;top:-12px;right:-8px">${icon('menu', 15)}</button>
      </div>
    </div>`;
}

/* attach per-message handlers */
function wireMessageEvents(root) {
  const wrap = root || $('#msgs-wrap');
  if (!wrap) return;

  // lightbox
  $$('[data-lightbox]', wrap).forEach(img => {
    img.addEventListener('click', e => {
      e.stopPropagation();
      openLightbox(img.dataset.lightbox);
    });
  });

  // avatars -> profile
  $$('[data-profile]', wrap).forEach(av => {
    av.addEventListener('click', e => {
      e.stopPropagation();
      fetchUserProfile(Number(av.dataset.profile));
    });
  });

  // reply jump -> scroll to quoted message & highlight
  $$('[data-reply-jump]', wrap).forEach(rq => {
    rq.addEventListener('click', e => {
      e.stopPropagation();
      scrollToMessage(Number(rq.dataset.replyJump));
    });
  });

  // wire the per-message context (3-dot) button
  $$('.msg-ctx', wrap).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const id = Number(btn.dataset.ctx);
      const rect = btn.getBoundingClientRect();
      openMessageMenu({ left: rect.right, top: rect.bottom }, id);
    });
  });

  // desktop right-click and mobile long-press -> message menu
  $$('.msg-row', wrap).forEach(row => {
    row.addEventListener('contextmenu', e => {
      // only when over the bubble (not the avatar/links)
      if (!e.target.closest('.msg-balloon')) return;
      e.preventDefault();
      const id = Number(row.dataset.msg);
      openMessageMenu({ left: e.clientX, top: e.clientY }, id);
    });

    let lpTimer = null;
    let lpMoved = false;
    let lpStart = null;
    row.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      lpMoved = false;
      lpStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (lpTimer) clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        lpTimer = null;
        if (lpMoved) return;
        const id = Number(row.dataset.msg);
        if (navigator.vibrate) navigator.vibrate(30);
        openMessageMenu({ left: lpStart.x, top: lpStart.y }, id);
      }, 500);
    }, { passive: true });
    row.addEventListener('touchmove', e => {
      if (!lpStart) return;
      const dx = Math.abs(e.touches[0].clientX - lpStart.x);
      const dy = Math.abs(e.touches[0].clientY - lpStart.y);
      if (dx > 10 || dy > 10) lpMoved = true;
    }, { passive: true });
    row.addEventListener('touchend', () => {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    });
    row.addEventListener('touchcancel', () => {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    });
  });
}

function scrollToMessage(messageId) {
  const wrap = $('#msgs-wrap');
  if (!wrap) return;
  const all = allMessages();
  const target = all.find(m => m.id === messageId);
  if (!target) {
    // not in current page -> jump to whole history then locate
    loadOlderTo(messageId);
    return;
  }
  const row = wrap.querySelector(`[data-msg="${messageId}"]`);
  const scroll = $('#msg-scroll');
  if (row && scroll) {
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('highlight');
    setTimeout(() => row.classList.remove('highlight'), 2300);
  }
}

async function loadOlderTo(messageId) {
  const convId = state.activeId;
  if (!convId) return;
  const oldest = allMessages()[0];
  const before = oldest ? oldest.id : 0;
  const scroll = $('#msg-scroll');
  const prevHeight = scroll ? scroll.scrollHeight : 0;
  try {
    const d = await apiGet(`api/messages.php?conversation_id=${convId}&before=${before}&limit=80`);
    if (!d.messages || d.messages.length === 0) return;
    state.olderBlocks.push(dedupeMessages(d.messages));
    state.hasMore = d.has_more;
    renderMessages();
    const row = $('#msgs-wrap').querySelector(`[data-msg="${messageId}"]`);
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('highlight');
      setTimeout(() => row.classList.remove('highlight'), 2300);
    } else if (d.has_more) {
      await loadOlderTo(messageId);
    }
  } catch (e) { /* ignore */ }
}

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'image-lightbox';
  lb.innerHTML = `<img src="${esc(src)}" alt="image">`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

function openMessageMenu(pos, messageId) {
  const m = state.messages.find(x => x.id === messageId) || allMessages().find(x => x.id === messageId);
  if (!m || m.deleted) return;
  // small anchor element for positioning
  const anchor = document.createElement('div');
  Object.assign(anchor.style, { position: 'fixed', left: pos.left + 'px', top: pos.top + 'px', width: '0', height: '0' });
  document.body.appendChild(anchor);
  const items = [{ header: m.mine ? 'My message' : 'Message' }];

  // reply (any message)
  items.push({ id: 'reply', icon: 'reply', label: 'Reply', onClick: () => setReplyTo(m) });

  // forward
  items.push({ id: 'fwd', icon: 'forward', label: 'Forward', onClick: () => openForwardModal(m) });

  // copy text (only for text-bearing messages)
  const copyable = (m.content || (m.attachment && m.attachment.original_name)) && m.type !== 'file';
  if (copyable) {
    items.push({ id: 'copy', icon: 'copy', label: 'Copy text', onClick: () => copyMessage(m) });
  }

  // pin / unpin (own message or you're admin in a group)
  const canPin = m.mine || (state.activeMeta && state.activeMeta.role && ['owner', 'admin'].includes(state.activeMeta.role));
  if (canPin) {
    items.push({ id: 'pin', icon: 'pin', label: m.pinned ? 'Unpin' : 'Pin message', onClick: () => pinMessage(m) });
  }

  // delete only own messages
  if (m.mine) {
    items.push(null);
    items.push({ id: 'del', icon: 'trash', label: 'Delete for everyone', danger: true, onClick: () => deleteMessage(messageId) });
  }
  openMenu(anchor, items);
  setTimeout(() => anchor.remove(), 100);
}

function copyMessage(m) {
  const text = m.content || (m.type === 'file' ? m.attachment.original_name : '');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => toast('Copied', 'success')).catch(() => {});
}

async function pinMessage(m) {
  try {
    const d = await apiPost('api/messages.php?action=pin', { message_id: m.id });
    const updated = d.message;
    if (updated) {
      state.messages = dedupeMessages(state.messages.map(x => x.id === m.id ? updated : x));
      const olderIdx = state.olderBlocks.findIndex(blk => blk.some(x => x.id === m.id));
      if (olderIdx >= 0) {
        state.olderBlocks[olderIdx] = state.olderBlocks[olderIdx].map(x => x.id === m.id ? updated : x);
      }
    }
    renderMessages();
    toast(d.pinned ? 'Message pinned' : 'Message unpinned', 'success');
  } catch (e) {
    toast(e.message || 'Could not pin message.', 'error');
  }
}

function setReplyTo(m) {
  state.replyTo = m;
  renderReplyBar();
  const inp = $('#msg-input');
  if (inp) inp.focus();
}

function renderReplyBar() {
  const host = $('#chat-active');
  if (!host) return;
  let bar = $('#reply-bar');
  if (!state.replyTo || !state.replyTo.id) {
    if (bar) bar.remove();
    return;
  }
  const who = state.replyTo.sender && (state.replyTo.sender.full_name || state.replyTo.sender.username);
  const preview = state.replyTo.content || (state.replyTo.type === 'image' ? '🖼 Photo' : (state.replyTo.type === 'file' ? '📄 File' : ''));
  if (!bar) {
    const hostWire = $('#composer-wrap');
    const cmpHost = hostWire || host;
    bar = document.createElement('div');
    bar.id = 'reply-bar';
    bar.className = 'reply-bar';
    cmpHost.insertBefore(bar, $('#pending-attachments') || null);
  }
  bar.innerHTML = `
    <div class="reply-bar-info">
      <span class="reply-bar-label">${icon('replyArrow', 13)} Replying to <strong>${esc(who || 'someone')}</strong></span>
      <span class="reply-bar-preview">${esc(preview)}</span>
    </div>
    <button class="icon-btn" id="cancel-reply" title="Cancel reply">${icon('x', 16)}</button>
  `;
  const cancel = $('#cancel-reply');
  if (cancel) cancel.addEventListener('click', () => { state.replyTo = null; renderReplyBar(); });
}

async function openForwardModal(m) {
  const wrap = openModal('Forward message', `
    <p class="muted" style="font-size:13px;margin-bottom:4px">Choose a conversation to forward to:</p>
    <div class="forward-list" id="fwd-list">${icon('chat', 18)}<span style="padding:10px">Loading&hellip;</span></div>
  `);
  const list = $('#fwd-list', wrap);
  try {
    await refreshConversations(false);
    const convs = state.convs.filter(c => c.id !== (m.conversation_id || state.activeId));
    if (convs.length === 0) {
      list.innerHTML = '<p class="muted" style="font-size:13px;padding:12px">No other conversations yet.</p>';
      return;
    }
    list.innerHTML = convs.map(c => `
      <div class="people-row" data-fwd="${c.id}">
        <span class="avatar-wrap">${avatarHTML(c.type === 'direct' ? (c.peer || {}) : { full_name: c.name || 'Group', username: 'group' }, 40, 'sm' + (c.type === 'group' ? ' group' : ''))}</span>
        <div class="pr-info"><div class="pr-name">${esc(c.name || '')}</div><div class="pr-sub">${c.type === 'group' ? 'Group' : c.subtitle || ''}</div></div>
        <span class="checkbox">${icon('forward', 14)}</span>
      </div>
    `).join('');
    $$('[data-fwd]', list).forEach(row => {
      row.addEventListener('click', async () => {
        const tgt = Number(row.dataset.fwd);
        const btnState = row.querySelector('.checkbox');
        if (btnState) btnState.innerHTML = icon('check', 14);
        try {
          await apiPost('api/messages.php?action=forward', { message_id: m.id, conversation_id: tgt });
          toast('Message forwarded', 'success');
          closeModal();
          const c = state.convs.find(x => x.id === tgt);
          if (c && c.unread > 0) { /* keep unread */ }
        } catch (e) {
          toast(e.message || 'Could not forward.', 'error');
          wrap.remove();
        }
      });
    });
  } catch (e) {
    list.innerHTML = '<p class="muted" style="font-size:13px;padding:12px">Could not load conversations.</p>';
  }
}

async function deleteMessage(messageId) {
  const yes = await confirmDialog({
    title: 'Delete message',
    message: 'Delete this message for everyone in the conversation?',
    confirmText: 'Delete',
  });
  if (!yes) return;
  try {
    await apiPost('api/messages.php?action=delete', { message_id: messageId });
    // cheap local update
    const all = allMessages();
    const m = all.find(x => x.id === messageId);
    if (m) m.deleted = 1;
    state.messages = dedupeMessages(state.messages.map(x => x.id === messageId ? { ...x, deleted: 1 } : x));
    renderMessages();
    refreshConversations(false);
  } catch (e) {
    toast(e.message || 'Could not delete message.', 'error');
  }
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

let pendingAttachment = null;
let typingFlag = false;
let typingTimer = null;

function wireComposer(conv) {
  const inp = $('#msg-input');
  const sendBtn = $('#btn-send');
  const attachBtn = $('#btn-attach');
  const emojiBtn = $('#btn-emoji');
  const pendWrap = $('#pending-attachments');

  function canSend() {
    const t = inp.value.trim();
    return t.length > 0 || !!pendingAttachment;
  }
  function updateSend() {
    sendBtn.disabled = !canSend();
  }
  updateSend();

  inp.addEventListener('input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    updateSend();
    notifyTyping();
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend()) sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => { if (canSend()) sendMessage(); });

  attachBtn.addEventListener('click', () => {
    closeMenus();
    const fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,application/zip,.rar,.zip,audio/*,video/mp4';
    fi.addEventListener('change', () => {
      if (fi.files && fi.files[0]) {
        setPending(fi.files[0]);
      }
    });
    fi.click();
  });

  emojiBtn.addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('#emoji-pop');
    if (pop) { pop.remove(); return; }
    const names = [
      '😀','😁','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😜','🤪','😎','🤓',
      '🧐','🤗','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺',
      '😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','🤔','🤫',
      '🤭','🧠','💪','👋','🤝','🙏','👌','👍','👎','👏','💯','🔥','✨','🎉','🎊','❤️',
      '🧡','💛','💚','💙','💜','🖤','💔','💖','💬','👀','🌹','🌸','🍕','🍺','☕','🌙',
      '⚡','🌟','🎁','🚀','🐱','🐶','🦄','🐼','🍀','🌈','😴','🤒','🤢','🤮','🥳','😷',
    ];
    const grid = document.createElement('div');
    grid.className = 'emoji-pop';
    grid.id = 'emoji-pop';
    grid.innerHTML = `<div class="emoji-grid">${names.map(n => `<button type="button" data-e="${esc(n)}">${n}</button>`).join('')}</div>`;
    emojiBtn.parentElement.appendChild(grid);
    const anchor = emojiBtn.closest('.composer-outer');
    if (window.innerWidth <= 460) {
      grid.style.right = '0';
      grid.style.left = 'auto';
    }
    $$('[data-e]', grid).forEach(b => {
      b.addEventListener('click', () => {
        inp.value += b.dataset.e;
        inp.dispatchEvent(new Event('input'));
        updateSend();
        inp.focus();
      });
    });
  });

  function setPending(file) {
    pendingAttachment = { file, name: file.name, size: file.size, isImage: file.type.startsWith('image/') };
    renderPending();
    updateSend();
  }

  function renderPending() {
    if (!pendingAttachment) { pendWrap.innerHTML = ''; return; }
    pendWrap.innerHTML = `
      <div class="pending-file">
        ${pendingAttachment.isImage ? icon('image', 16) : icon('file', 16)}
        <span class="pf-name">${esc(pendingAttachment.name)}</span>
        <span class="muted tiny">${fmtSize(pendingAttachment.size)}</span>
        <button type="button" id="pf-remove" title="Remove">${icon('x', 15)}</button>
      </div>`;
    $('#pf-remove', pendWrap).addEventListener('click', () => {
      pendingAttachment = null;
      renderPending();
      updateSend();
    });
  }

  async function sendMessage() {
    const text = inp.value.trim();
    if (!text && !pendingAttachment) return;
    stopTyping();
    sendBtn.disabled = true;
    const replyId = state.replyTo ? state.replyTo.id : 0;

    if (!pendingAttachment) {
      try {
        const body = { conversation_id: state.activeId, content: text };
        if (replyId) body.reply_to = replyId;
        const d = await apiPost('api/messages.php', body);
        inp.value = '';
        inp.style.height = 'auto';
        state.replyTo = null; renderReplyBar();
        appendIncoming(d.message);
        updateSend();
      } catch (e) {
        sendBtn.disabled = false;
        toast(e.message || 'Failed to send.', 'error');
      }
    } else {
      const fd = new FormData();
      fd.append('attachment', pendingAttachment.file);
      fd.append('conversation_id', state.activeId);
      if (text) fd.append('content', text);
      fd.append('file_type', pendingAttachment.isImage ? 'image' : 'file');
      if (replyId) fd.append('reply_to', replyId);
      const att = pendingAttachment;
      pendingAttachment = null;
      renderPending();
      try {
        const d = await apiPost('api/messages.php', fd, {});
        inp.value = '';
        inp.style.height = 'auto';
        state.replyTo = null; renderReplyBar();
        appendIncoming(d.message);
        updateSend();
      } catch (e) {
        setPending(att && att.file ? { file: att.file, name: att.name, size: att.size, isImage: att.isImage } : null);
        if (!att) updateSend();
        toast(e.message || 'Failed to upload file.', 'error');
      }
    }
  }

  function notifyTyping() {
    if (typingFlag) return;
    const t = inp.value.trim();
    if (t.length === 0) { stopTyping(); return; }
    typingFlag = true;
    apiPost('api/messages.php?action=typing', { conversation_id: state.activeId, typing: true })
      .catch(() => {});
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 2500);
  }
  function stopTyping() {
    if (!typingFlag && !typingTimer) return;
    typingFlag = false;
    clearTimeout(typingTimer);
    typingTimer = null;
    const body = state.activeId ? { conversation_id: state.activeId, typing: false } : null;
    if (body) apiPost('api/messages.php?action=typing', body).catch(() => {});
  }
  window.__stopTyping = stopTyping;
}

async function appendIncoming(msg) {
  if (!msg) return;
  const convId = msg.conversation_id;
  state.messages = dedupeMessages([...state.messages, msg]);
  renderMessages();

  const conv = state.convs.find(c => c.id === convId);
  if (conv) {
    conv.last_message = { id: msg.id, sender_id: msg.sender_id, type: msg.type, text: msg.type === 'text' ? msg.content : (msg.type === 'image' ? '[Image]' : '[File]'), mine: msg.mine, created_at: msg.created_at };
    conv.updated_at = msg.created_at;
    state.lastConvJson = '';
    state.convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    renderConvList();
  }
}

/* ------------------------------------------------------------------ */
/* Polling                                                             */
/* ------------------------------------------------------------------ */

async function refreshConversations(silent) {
  try {
    const d = await apiGet('api/conversations.php');
    const prevIds = state.convs.map(c => c.id);
    const prevUnread = new Map(state.convs.map(c => [c.id, c.unread || 0]));
    state.convs = d.conversations || [];

    // detect new unread -> toast (only for convs not currently open)
    for (const c of state.convs) {
      const was = prevUnread.get(c.id) || 0;
      const is = c.unread || 0;
      if (is > was && c.id !== state.activeId && Date.now() - state.startedAt > 2500) {
        if (document.visibilityState === 'visible') {
          showIncomingToast(c);
        }
      }
    }
    if (state.activeId) {
      const active = state.convs.find(c => c.id === state.activeId);
      if (active && active.unread > 0 && document.visibilityState === 'visible') {
        markRead(state.activeId, true);
      }
    }
    renderConvList();
  } catch (e) {
    if (e.__authError) handleAuthError();
  }
}

function showIncomingToast(c) {
  const name = c.name || 'New message';
  const prev = c.last_message && c.last_message.text || 'New message';
  const type = c.type === 'group' ? 'group' : 'chat';
  toast(`${name}: ${prev.length > 60 ? prev.slice(0, 60) + '…' : prev}`, 'info');
}

let msgPollSeq = 0;
async function refreshActiveMessages() {
  if (!state.activeId) return;
  const seq = ++msgPollSeq;
  try {
    const d = await apiGet(`api/messages.php?conversation_id=${state.activeId}&limit=50`);
    if (seq !== msgPollSeq) return; // a newer poll finished; ignore stale
    const incomingIds = new Set(allMessages().map(m => m.id));
    const incomingNew = (d.messages || []).some(m => !incomingIds.has(m.id));

    // keep older paginated pages untouched; replace the latest page
    state.messages = dedupeMessages(d.messages || []);
    state.hasMore = d.has_more;
    state.typing = d.typing || [];

    if (incomingNew && !isNearBottom()) {
      state.newBelow = (state.newBelow || 0) + 1;
    }
    if (d.conversation) state.activeMeta = d.conversation;

    updateChatHeaderTyping();
    renderMessages();

    // auto mark read
    if (document.visibilityState === 'visible') {
      const conv = state.convs.find(c => c.id === state.activeId);
      if (conv && conv.unread > 0) markRead(state.activeId, true);
    }
  } catch (e) {
    if (e.__authError) handleAuthError();
  }
}

function isNearBottom() {
  const s = $('#msg-scroll');
  if (!s) return true;
  return s.scrollHeight - s.scrollTop - s.clientHeight < 140;
}

function updateChatHeaderTyping() {
  const sub = $('#chat-sub-label');
  if (!sub) return;
  const t = state.typing || [];
  const conv = state.convs.find(c => c.id === state.activeId) || {};
  if (t.length > 0) {
    sub.textContent = `${t.map(x => x.full_name).join(', ')} ${t.length > 1 ? 'are' : 'is'} typing…`;
    sub.classList.add('live');
  } else {
    if (conv.type === 'direct') {
      sub.textContent = conv.peer && conv.peer.online ? 'Online' : (conv.peer && conv.peer.last_seen ? 'Last seen ' + fmtAgo(conv.peer.last_seen) : 'Direct chat');
    } else {
      sub.textContent = 'Group chat';
    }
    sub.classList.remove('live');
  }
}

async function refreshNotifications(force) {
  if (!force && Date.now() - state.lastNotifFetch < 10000) return;
  state.lastNotifFetch = Date.now();
  try {
    const d = await apiGet('api/notifications.php');
    state.notifs = d.notifications || [];
    state.notifUnread = d.unread_count || 0;
    const b = $('#notif-badge');
    if (b) {
      if (state.notifUnread > 0) { b.textContent = state.notifUnread; b.classList.remove('hidden'); }
      else b.classList.add('hidden');
    }
    const list = $('#notif-list');
    if (list) renderNotifList();
  } catch (e) {
    if (e.__authError) handleAuthError();
  }
}

function handleAuthError() {
  stopPolling();
  renderAuth('login');
  toast('Your session expired. Please sign in again.', 'info');
}

function startPolling() {
  stopPolling();
  schedule(() => refreshConversations(), 2200);
  schedule(() => refreshActiveMessages(), 1500);
  schedule(() => refreshNotifications(), 15000);
}

/* ------------------------------------------------------------------ */
/* Info panel                                                          */
/* ------------------------------------------------------------------ */

function toggleInfoPanel(open) {
  state.infoOpen = open !== undefined ? open : !state.infoOpen;
  renderInfoPanel();
}

function renderInfoPanel() {
  const slot = $('#panel-slot');
  if (!slot) return;
  const old = $('#info-panel');
  const oldBackdrop = $('#panel-backdrop');
  if (old) old.remove();
  if (oldBackdrop) oldBackdrop.remove();

  let conv = state.convs.find(c => c.id === state.activeId);
  if (state.infoOpen && state.activeId && conv) {
    if (conv.type === 'direct') {
      renderDirectPanel(conv);
    } else {
      renderGroupPanel();
    }
  }
}

function renderDirectPanel(conv) {
  createPanelShell(`
    <div class="panel-scroll">
      <div class="panel-profile">
        <button style="background:none;border:0;cursor:pointer" id="pnl-avatar-open">
          ${avatarHTML(conv.peer || {}, 96, 'lg')}
        </button>
        <div>
          <h2 style="font-size:19px;letter-spacing:-0.3px">${esc(conv.peer ? conv.peer.full_name : (conv.name || ''))}</h2>
          <p class="muted" style="font-size:13px;margin-top:2px">@${esc(conv.peer ? conv.peer.username : '')}</p>
        </div>
        <span class="status-pill ${conv.peer && conv.peer.online ? '' : 'offline'}"><span class="dot"></span>${conv.peer && conv.peer.online ? 'Online' : 'Offline'}</span>
      </div>

      ${conv.peer && conv.peer.bio ? `<p style="font-size:13.5px;line-height:1.55;color:var(--on-surface-variant);text-align:center">${esc(conv.peer.bio)}</p>` : ''}

      <div class="panel-sec">
        <h3>About</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px">
          <div class="row-between"><span class="muted">Last seen</span><b>${conv.peer && conv.peer.last_seen ? fmtAgo(conv.peer.last_seen) + ' (' + fmtClock(conv.peer.last_seen) + ')' : 'Recently'}</b></div>
          <div class="row-between"><span class="muted">Username</span><b>@${esc(conv.peer ? conv.peer.username : '')}</b></div>
        </div>
      </div>

      <div class="panel-sec">
        <h3>Actions</h3>
        <div class="choice-grid">
          <button class="choice-pill full" id="pnl-search">${icon('search', 16)} Search in chat</button>
          <button class="choice-pill full danger" id="pnl-clear">${icon('trash', 16)} Clear chat</button>
        </div>
      </div>
    </div>
  `, conv.peer && conv.peer.online);

  if (conv.peer) {
    $('#pnl-avatar-open').addEventListener('click', () => fetchUserProfile(conv.peer.id));
  }
  $('#pnl-clear').addEventListener('click', () => {
    state.messages = [];
    state.olderBlocks = [];
    renderMessages();
    toast('Chat cleared', 'info');
  });
  $('#pnl-search').addEventListener('click', () => {
    closeOverlays();
    openChatSearch();
  });
}

function renderGroupPanel() {
  const conv = state.convs.find(c => c.id === state.activeId) || {};
  createPanelShell(`
    <div class="panel-scroll">
      <div class="panel-profile">
        ${avatarHTML({ full_name: conv.name || 'Group', username: 'group' }, 96, 'lg group')}
        <div>
          <h2 style="font-size:19px;letter-spacing:-0.3px">${esc(conv.name || 'Group')}</h2>
          <p class="muted" style="font-size:13px;margin-top:2px">Group</p>
        </div>
      </div>
      ${conv.description ? `<p style="font-size:13.5px;line-height:1.55;color:var(--on-surface-variant);text-align:center">${esc(conv.description)}</p>` : ''}

      <div class="panel-sec">
        <div class="row-between" style="margin-bottom:2px">
          <h3 style="margin-bottom:0">Members</h3>
          <button class="choice-pill" id="pnl-add-member" style="padding:6px 10px;font-size:12px">${icon('user', 14)} Add</button>
        </div>
        <div id="group-members">
          <div class="spinner" style="margin:10px auto" ></div>
        </div>
      </div>

      <div class="panel-sec">
        <h3>Actions</h3>
        <div class="choice-grid">
          <button class="choice-pill" id="pnl-participants">${icon('users', 16)} View all members</button>
          <button class="choice-pill" id="pnl-edit-group">${icon('edit', 16)} Edit group</button>
          ${conv.role === 'owner' || conv.role === 'admin' ? `<button class="choice-pill" id="pnl-rename">${icon('pencil', 16)} Rename</button>` : ''}
          <button class="choice-pill danger full" id="pnl-leave">${icon('leave', 16)} Leave group</button>
        </div>
      </div>
    </div>
  `, false);

  $('#pnl-add-member', document).addEventListener('click', () => openAddMemberSheet(conv));
  $('#pnl-edit-group', document).addEventListener('click', () => openEditGroupModal(conv));
  $('#pnl-participants', document).addEventListener('click', () => openMembersSheet(conv));
  $('#pnl-leave', document).addEventListener('click', () => leaveGroup(conv));

  fetchGroupMembers(conv.id);
}

function createPanelShell(innerHTML, hasStatus) {
  const slot = $('#panel-slot');
  const isMobile = window.innerWidth <= 1080;
  const panel = document.createElement('aside');
  panel.className = 'info-panel' + (isMobile ? ' overlay' : '');
  panel.id = 'info-panel';
  panel.innerHTML = innerHTML;
  slot.appendChild(panel);
  if (isMobile) {
    const backdrop = document.createElement('div');
    backdrop.id = 'panel-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:44';
    backdrop.addEventListener('click', () => closeOverlays());
    document.body.appendChild(backdrop);
    panel.setAttribute('data-overlay-close', '1');
  }
  const btn = document.createElement('div');
  btn.style.cssText = 'display:flex;justify-content:flex-end;padding:8px 8px 0';
  btn.innerHTML = `<button class="icon-btn" id="pnl-close" title="Close">${icon('x', 20)}</button>`;
  panel.insertBefore(btn, panel.firstChild);
  $('#pnl-close', panel).addEventListener('click', () => closeOverlays());
  void hasStatus;
}

async function fetchGroupMembers(convId) {
  try {
    const d = await apiGet('api/groups.php?conversation_id=' + convId);
    const g = d.group;
    state.activeMeta = { ...(state.activeMeta || {}), group: g, my_role: g.my_role };
    renderGroupMembers(g.members, g.my_role);
  } catch (e) {
    if (e.__authError) handleAuthError();
  }
}

function renderGroupMembers(members, myRole) {
  const cont = $('#group-members');
  if (!cont) return;
  const show = myRole === 'owner' || myRole === 'admin';
  cont.innerHTML = members.slice(0, 8).map(m => `
    <div class="member-row" data-member="${m.id}">
      <span class="avatar-wrap" style="cursor:pointer" data-profile="${m.id}">${avatarHTML(m, 40)}<span class="online-dot ${m.online ? '' : 'off'}"></span></span>
      <div class="mr-info" data-profile="${m.id}" style="cursor:pointer">
        <div class="mr-name">${esc(m.full_name)} ${m.role !== 'member' ? `<span class="role-tag">${m.role === 'owner' ? 'Owner' : 'Admin'}</span>` : ''}</div>
        <div class="mr-sub">@${esc(m.username)}</div>
      </div>
      ${show && m.id !== state.me.id ? `<button class="icon-btn role-menu-btn" data-role-menu="${m.id}" style="width:32px;height:32px">${icon('menu', 17)}</button>` : ''}
    </div>
  `).join('') || '<p class="muted">No members</p>';

  $$('[data-profile]', cont).forEach(el => el.addEventListener('click', () => {
    const me = Number(el.dataset.profile);
    fetchUserProfile(me);
  }));
  $$('[data-role-menu]', cont).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const uid = Number(btn.dataset.roleMenu);
      const member = members.find(m => m.id === uid);
      openMemberMenu(btn, member, myRole);
    });
  });
}

function openMemberMenu(anchor, member, myRole) {
  const items = [{ header: member.full_name }];
  items.push({ id: 'view', icon: 'user', label: 'View profile', onClick: () => fetchUserProfile(member.id) });
  if (myRole === 'owner' && member.role === 'member') {
    items.push({ id: 'admin', icon: 'crown', label: 'Make admin', onClick: () => changeRole(member, 'admin') });
  }
  if (myRole === 'owner' && member.role === 'admin') {
    items.push({ id: 'demote', icon: 'userMinus', label: 'Remove admin', onClick: () => changeRole(member, 'member') });
  }
  if (myRole === 'owner' || myRole === 'admin') {
    items.push({ id: 'remove', icon: 'trash', label: 'Remove from group', danger: true, onClick: () => removeMember(member) });
  }
  openMenu(anchor, items);
}

async function changeRole(member, role) {
  try {
    const d = await apiPost('api/groups.php?action=' + (role === 'admin' ? 'promote' : 'demote'), { conversation_id: state.activeId, user_id: member.id });
    toast(d.role === 'admin' ? `${member.full_name} is now an admin` : `${member.full_name} is no longer an admin`, 'success');
    await refreshGroupInfo();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeMember(member) {
  const yes = await confirmDialog({ title: 'Remove member', message: `Remove ${member.full_name} from the group?`, confirmText: 'Remove' });
  if (!yes) return;
  try {
    await apiPost('api/groups.php?action=remove_member', { conversation_id: state.activeId, user_id: member.id });
    toast(`${member.full_name} was removed`, 'success');
    await refreshGroupInfo();
  } catch (e) {
    toast(e.message || 'Could not remove member.', 'error');
  }
}

async function refreshGroupInfo() {
  await fetchGroupMembers(state.activeId);
  await refreshConversations(false);
  const panel = $('#info-panel');
  if (panel) {
    // re-render group panel to reflect role changes
    renderGroupPanel();
  }
}

async function leaveGroup(conv) {
  const yes = await confirmDialog({ title: 'Leave group', message: `Leave "${conv.name}"? You will stop receiving its messages.`, confirmText: 'Leave' });
  if (!yes) return;
  try {
    await apiPost('api/groups.php?action=leave', { conversation_id: conv.id });
    toast('You left the group', 'info');
    state.convs = state.convs.filter(c => c.id !== conv.id);
    state.lastConvJson = '';
    resetActiveConv();
    renderConvList();
  } catch (e) {
    toast(e.message || 'Could not leave the group.', 'error');
  }
}

/* ------------------------------------------------------------------ */
/* Profile (other users)                                               */
/* ------------------------------------------------------------------ */

async function fetchUserProfile(userId) {
  try {
    const d = await apiGet('api/users.php?id=' + userId);
    const u = d.user;
    const wrap = openModal(esc(u.full_name), `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:6px 0 2px">
        ${avatarHTML(u, 88, 'lg')}
        <div>
          <h3 style="font-size:18px">${esc(u.full_name)}</h3>
          <p class="muted" style="font-size:13px">@${esc(u.username)}</p>
        </div>
        <span class="status-pill ${u.online ? '' : 'offline'}"><span class="dot"></span>${u.online ? 'Online' : u.last_seen ? 'Last seen ' + u.last_seen : 'Offline'}</span>
      </div>
      ${u.bio ? `<p style="font-size:13.5px;line-height:1.55;color:var(--on-surface-variant);margin-top:4px">${esc(u.bio)}</p>` : ''}
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn-ghost" style="flex:1" data-close-modal>Close</button>
        ${u.self
          ? `<button class="btn-primary" style="flex:2" id="edit-me">${icon('settings', 17)} Edit profile</button>`
          : `<button class="btn-primary" style="flex:2" id="msg-them">${icon('chat', 17)} Send message</button>`}
      </div>
    `);
    if (u.self) {
      $('#edit-me', wrap).addEventListener('click', () => {
        wrap.remove();
        openSettingsModal();
      });
    } else {
      $('#msg-them', wrap).addEventListener('click', async () => {
        try {
          await startDirectChat(u.id);
          wrap.remove();
        } catch (e) { toast(e.message, 'error'); }
      });
    }
  } catch (e) {
    toast(e.message || 'Could not load profile.', 'error');
  }
}

/* ------------------------------------------------------------------ */
/* Group create/edit/add-member sheets                                 */
/* ------------------------------------------------------------------ */

let groupSearchCache = {};

function openCreateGroupModal() {
  const wrap = openModal('New group', `
    <div class="field">
      <label class="field-label">Group name</label>
      <div class="field-inner">${icon('group', 18)}<input id="gc-name" type="text" maxlength="100" placeholder="e.g. Weekend plans"></div>
    </div>
    <div class="field">
      <label class="field-label">Description <span class="muted tiny">(optional)</span></label>
      <div class="field-inner">${icon('edit', 18)}<textarea id="gc-desc" maxlength="500" placeholder="What's this group about?"></textarea></div>
    </div>
    <div style="font-size:13px;font-weight:700" id="gc-count">0 selected</div>
    <div style="position:relative">
      <div class="search-box">
        ${icon('search', 18)}
        <input id="gc-search" type="text" placeholder="Find people to add…">
      </div>
    </div>
    <div id="gc-results" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column"></div>
    <button class="btn-primary" id="gc-create" disabled>${icon('group', 17)} Create group</button>
  `);

  const selected = new Set();
  const results = $('#gc-results', wrap);
  const count = $('#gc-count', wrap);
  const createBtn = $('#gc-create', wrap);
  const searchInp = $('#gc-search', wrap);

  function renderResults(list) {
    if (!list || list.length === 0) {
      results.innerHTML = '<p class="muted" style="font-size:13px">Type at least 2 characters to search.</p>';
      return;
    }
    let html = '';
    const directIds = new Set(state.convs.filter(c => c.type === 'direct').map(c => c.peer && c.peer.id));
    for (const u of list) {
      const sel = selected.has(u.id);
      html += `<div class="people-row ${sel ? 'selected' : ''}" data-gid="${u.id}">
        <span class="avatar-wrap">${avatarHTML(u, 40, 'sm')}</span>
        <div class="pr-info"><div class="pr-name">${esc(u.full_name)}</div><div class="pr-sub">@${esc(u.username)}</div></div>
        <span class="checkbox">${icon('check', 14)}</span>
      </div>`;
    }
    results.innerHTML = html;
    $$('[data-gid]', results).forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.gid);
        if (selected.has(id)) { selected.delete(id); row.classList.remove('selected'); }
        else { selected.add(id); row.classList.add('selected'); }
        count.textContent = selected.size + ' selected';
        createBtn.disabled = selected.size === 0;
      });
    });
  }

  let t = null;
  searchInp.addEventListener('input', () => {
    clearTimeout(t);
    const q = searchInp.value.trim();
    if (q.length < 2) { results.innerHTML = '<p class="muted" style="font-size:13px">Type at least 2 characters to search.</p>'; return; }
    t = setTimeout(() => {
      apiGet('api/users.php?q=' + encodeURIComponent(q)).then(d => {
        const mine = (state.me && state.me.id) || 0;
        const list = (d.users || []).filter(u => u.id !== mine);
        renderResults(list);
      }).catch(() => {});
    }, 250);
  });

  createBtn.addEventListener('click', async () => {
    setLoading(createBtn, true);
    try {
      const d = await apiPost('api/groups.php?action=create', { name: $('#gc-name', wrap).value.trim(), description: $('#gc-desc', wrap).value.trim(), member_ids: Array.from(selected) });
      upsertConversation(d.conversation);
      closeModal();
      openConversation(d.conversation_id, true);
      toast('Group created', 'success');
    } catch (e) {
      setLoading(createBtn, false);
      toast(e.message, 'error');
    }
  });
  $('#gc-name', wrap).focus();
}

function openEditGroupModal(conv) {
  const wrap = openModal('Edit group', `
    <div class="field">
      <label class="field-label">Group name</label>
      <div class="field-inner">${icon('group', 18)}<input id="eg-name" type="text" maxlength="100" value="${esc(conv.name || '')}"></div>
    </div>
    <div class="field">
      <label class="field-label">Description</label>
      <div class="field-inner">${icon('edit', 18)}<textarea id="eg-desc" maxlength="500" placeholder="What's this group about?">${esc(conv.description || '')}</textarea></div>
    </div>
    <button class="btn-primary" id="eg-save">${icon('check', 17)} Save changes</button>
  `);
  $('#eg-save', wrap).addEventListener('click', async () => {
    const btn = $('#eg-save', wrap);
    setLoading(btn, true);
    try {
      await apiPost('api/groups.php?action=update', { conversation_id: conv.id, name: $('#eg-name', wrap).value.trim(), description: $('#eg-desc', wrap).value.trim() });
      closeModal();
      toast('Group updated', 'success');
      await refreshConversations(false);
      closeOverlays();
      renderChatPane();
    } catch (e) {
      setLoading(btn, false);
      toast(e.message, 'error');
    }
  });
}

function openAddMemberSheet(conv) {
  const shell = document.createElement('div');
  shell.className = 'modal-backdrop';
  shell.innerHTML = `
    <div class="sheet" style="max-width:520px">
      <div class="sheet-grip"></div>
      <div class="sheet-body">
        <h3 style="font-size:16px;margin:2px 0 10px">Add members to ${esc(conv.name || 'group')}</h3>
        <div class="search-box" style="margin-bottom:10px">
          ${icon('search', 18)}
          <input id="am-search" type="text" placeholder="Find people…" autofocus>
        </div>
        <div id="am-results" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column"></div>
        <button class="btn-primary" id="am-add" style="margin-top:12px" disabled>Add to group</button>
      </div>
    </div>
  `;
  shell.addEventListener('mousedown', e => { if (e.target === shell) shell.remove(); });
  $('#modal-container').appendChild(shell);

  const selected = new Set();
  const res = $('#am-results', shell);
  const addBtn = $('#am-add', shell);
  const sInp = $('#am-search', shell);

  function render(list) {
    if (!list || list.length === 0) { res.innerHTML = '<p class="muted" style="font-size:13px">No people found.</p>'; return; }
    res.innerHTML = list.map(u => `
      <div class="people-row ${selected.has(u.id) ? 'selected' : ''}" data-am="${u.id}">
        <span class="avatar-wrap">${avatarHTML(u, 40, 'sm')}</span>
        <div class="pr-info"><div class="pr-name">${esc(u.full_name)}</div><div class="pr-sub">@${esc(u.username)}</div></div>
        <span class="checkbox">${icon('check', 14)}</span>
      </div>`).join('');
    $$('[data-am]', res).forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.am);
        if (selected.has(id)) { selected.delete(id); row.classList.remove('selected'); }
        else { selected.add(id); row.classList.add('selected'); }
        addBtn.textContent = selected.size ? `Add ${selected.size} to group` : 'Add to group';
        addBtn.disabled = selected.size === 0;
      });
    });
  }

  let t = null;
  sInp.addEventListener('input', () => {
    clearTimeout(t);
    const q = sInp.value.trim();
    if (q.length < 2) { res.innerHTML = '<p class="muted" style="font-size:13px">Type at least 2 characters.</p>'; return; }
    t = setTimeout(() => {
      apiGet('api/users.php?q=' + encodeURIComponent(q)).then(d => {
        render((d.users || []).filter(u => u.id !== state.me.id));
      }).catch(() => {});
    }, 250);
  });

  addBtn.addEventListener('click', async () => {
    setLoading(addBtn, true);
    try {
      const d = await apiPost('api/groups.php?action=add_member', { conversation_id: conv.id, user_ids: Array.from(selected) });
      shell.remove();
      toast(d.added.length ? `Added ${d.added.length} member${d.added.length > 1 ? 's' : ''}` : 'Members already in the group', 'success');
      await refreshGroupInfo();
      closeOverlays();
      renderChatPane();
    } catch (e) {
      setLoading(addBtn, false);
      toast(e.message, 'error');
    }
  });
}

function openMembersSheet(conv) {
  const wrap = openModal('Group members', '<div id="gm-list"><div class="spinner" style="margin:0 auto"></div></div>');
  apiGet('api/groups.php?conversation_id=' + conv.id).then(d => {
    const g = d.group;
    const list = $('#gm-list', wrap);
    list.innerHTML = g.members.map(m => `
      <div class="member-row" data-member="${m.id}">
        <span class="avatar-wrap" data-profile="${m.id}" style="cursor:pointer">${avatarHTML(m, 42)}<span class="online-dot ${m.online ? '' : 'off'}"></span></span>
        <div class="mr-info" data-profile="${m.id}" style="cursor:pointer">
          <div class="mr-name">${esc(m.full_name)} ${m.role !== 'member' ? `<span class="role-tag">${m.role === 'owner' ? 'Owner' : 'Admin'}</span>` : ''}</div>
          <div class="mr-sub">@${esc(m.username)}</div>
        </div>
        ${dataRoleMenus(g, m)}
      </div>`).join('');
    $$('[data-profile]', list).forEach(el => el.addEventListener('click', () => {
      const uid = Number(el.dataset.profile);
      fetchUserProfile(uid);
    }));
    $$('[data-rm]', list).forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const uid = Number(btn.dataset.rm);
        const member = g.members.find(m => m.id === uid);
        openMemberMenu(btn, member, g.my_role);
      });
    });
  }).catch(() => {});
}

function dataRoleMenus(g, m) {
  const show = g.my_role === 'owner' || g.my_role === 'admin';
  if (show && m.id !== state.me.id) {
    return `<button class="icon-btn role-menu-btn" data-rm="${m.id}" style="width:32px;height:32px">${icon('menu', 17)}</button>`;
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Notifications panel                                                 */
/* ------------------------------------------------------------------ */

function renderNotifPanel() {
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.id = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-head">
      <h4>Notifications</h4>
      <button class="icon-btn" id="notif-markall" title="Mark all as read" style="width:32px;height:32px">${icon('doubleCheck', 16)}</button>
      <button class="icon-btn" id="notif-close" title="Close" style="width:32px;height:32px">${icon('x', 16)}</button>
    </div>
    <div class="notif-list" id="notif-list"></div>
  `;
  document.body.appendChild(panel);

  $('#notif-close', panel).addEventListener('click', () => panel.remove());
  $('#notif-markall', panel).addEventListener('click', async () => {
    try {
      await apiPost('api/notifications.php?action=read_all', {});
      state.notifUnread = 0;
      const b = $('#notif-badge'); if (b) b.classList.add('hidden');
      renderNotifList();
    } catch (e) {}
  });

  renderNotifList();
}

function notifIcon(type) {
  return type === 'group' ? icon('group', 17) : type === 'message' ? icon('chat', 17) : icon('bell', 17);
}

function openNotification(id) {
  const n = state.notifs.find(x => x.id === id);
  if (!n) return;
  if (!n.read) {
    apiPost('api/notifications.php?action=read', { id }).then(d => {
      state.notifUnread = d.unread_count;
      const b = $('#notif-badge');
      if (b) { if (d.unread_count > 0) { b.textContent = d.unread_count; b.classList.remove('hidden'); } else b.classList.add('hidden'); }
      renderNotifList();
    }).catch(() => {});
  }
  if (n.conversation_id) {
    closeNotifPanel();
    openConversation(n.conversation_id);
  }
}

function closeNotifPanel() {
  const p = $('#notif-panel');
  if (p) p.remove();
}

function renderNotifList() {
  const list = $('#notif-list');
  if (!list) return;
  if (state.notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">No notifications yet.<br>Group & message updates appear here.</div>';
    return;
  }
  list.innerHTML = state.notifs.slice(0, 30).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-nid="${n.id}">
      <span class="ni-icon">${notifIcon(n.type)}</span>
      <div style="flex:1;min-width:0">
        <div class="ni-title">${esc(n.title)}</div>
        <div class="ni-body">${esc(n.body || '')}</div>
        <div class="ni-time">${fmtAgo(n.created_at)}</div>
      </div>
      ${n.read ? '' : '<span style="width:7px;height:7px;border-radius:50%;background:var(--tertiary-container);margin-top:8px"></span>'}
    </div>`).join('');
  $$('[data-nid]', list).forEach(el => {
    el.addEventListener('click', () => openNotification(Number(el.dataset.nid)));
  });
}

/* ------------------------------------------------------------------ */
/* Settings modal                                                      */
/* ------------------------------------------------------------------ */

function openSettingsModal() {
  const me = state.me || {};
  const wrap = openModal('Settings', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:6px">
      <button id="set-avatar-btn" style="background:none;border:0;cursor:pointer;position:relative">
        ${avatarHTML(me, 84, 'lg')}
        <span style="position:absolute;bottom:0;right:0;width:30px;height:30px;border-radius:50%;background:var(--primary-container);color:var(--on-primary-container);display:grid;place-items:center;border:3px solid var(--surface)">${icon('camera', 14)}</span>
      </button>
      <div style="text-align:center">
        <h3 style="font-size:17px">${esc(me.full_name || '')}</h3>
        <p class="muted" style="font-size:12.5px">Click the photo to change it</p>
      </div>
    </div>
    <input type="file" id="set-avatar-file" accept="image/*" class="hidden">
    <div class="field">
      <label class="field-label">Full name</label>
      <div class="field-inner">${icon('user', 18)}<input id="set-name" value="${esc(me.full_name || '')}" maxlength="100"></div>
    </div>
    <div class="field">
      <label class="field-label">Username</label>
      <div class="field-inner">${icon('at', 18)}<input id="set-username" value="${esc(me.username || '')}" maxlength="30"></div>
    </div>
    <div class="field">
      <label class="field-label">Bio</label>
      <div class="field-inner">${icon('edit', 18)}<textarea id="set-bio" maxlength="500" placeholder="Tell people a little about yourself…">${esc(me.bio || '')}</textarea></div>
    </div>
    <div class="row-between" style="padding:8px 2px">
      <div>
        <b style="font-size:14px;display:block">Dark mode</b>
        <span class="muted" style="font-size:12.5px">Switch the interface theme</span>
      </div>
      <label class="switch">
        <input type="checkbox" id="set-theme" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
    <button class="btn-primary" id="set-save">${icon('check', 17)} Save changes</button>
    ${me.avatar ? `<button class="btn-ghost" id="set-remove-avatar" style="margin-top:8px">Remove photo</button>` : ''}
  `);

  $('#set-avatar-btn', wrap).addEventListener('click', () => $('#set-avatar-file', wrap).click());
  $('#set-avatar-file', wrap).addEventListener('change', async () => {
    const file = $('#set-avatar-file', wrap).files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const d = await apiPost('api/profile.php?action=avatar', fd, {});
      state.me = d.user;
      toast('Photo updated', 'success');
      closeModal();
      renderShell();
    } catch (e) {
      toast(e.message || 'Could not upload photo.', 'error');
    }
  });

  $('#set-remove-avatar', wrap)?.addEventListener('click', async () => {
    try {
      await apiPost('api/profile.php?action=remove_avatar', {});
      state.me = await apiGet('api/users.php?id=' + state.me.id).then(d => d.user);
      toast('Photo removed', 'info');
      closeModal();
      renderShell();
    } catch (e) { toast(e.message, 'error'); }
  });

  $('#set-save', wrap).addEventListener('click', async () => {
    const btn = $('#set-save', wrap);
    const theme = $('#set-theme', wrap).checked ? 'dark' : 'light';
    setLoading(btn, true);
    try {
      const d = await apiPost('api/profile.php', { action: 'update', full_name: $('#set-name', wrap).value.trim(), username: $('#set-username', wrap).value.trim(), bio: $('#set-bio', wrap).value.trim(), theme });
      state.me = d.user;
      applyTheme(theme);
      updateThemeIcon();
      closeModal();
      renderShell();
      toast('Profile updated', 'success');
    } catch (e) {
      setLoading(btn, false);
      toast(e.message || 'Could not save profile.', 'error');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Search in conversations                                             */
/* ------------------------------------------------------------------ */

window.addEventListener('focus-search', e => {
  const inp = $('#main-search');
  if (inp) { inp.focus(); if (e.detail && e.detail.q) inp.value = e.detail.q; }
  const shell = $('#app .shell');
  if (shell) {
    $$('#segmented button', shell).forEach(b => b.classList.toggle('active', b.dataset.tab === 'chats'));
    state.tab = 'chats';
  }
});

/* ------------------------------------------------------------------ */
/* Global click-to-close for emoji pop                                 */
/* ------------------------------------------------------------------ */

document.addEventListener('click', e => {
  if (e.target.closest('.emoji-btn') || e.target.closest('#emoji-pop')) return;
  const pop = $('#emoji-pop');
  if (pop && !pop.contains(e.target)) pop.remove();
});

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */

function play() {
  // no-op placeholder for micro-interactions hook
}

async function boot() {
  initTheme();
  try {
    const d = await apiGet('api/session.php');
    state.csrf = d.session.csrf || CSRF;
    if (d.session.authenticated && d.session.user) {
      state.me = d.session.user;
      applyTheme(state.me.theme || localStorage.getItem('pulse_theme') || 'dark');
      renderShell();
      startPolling();
      refreshConversations(true);
      refreshNotifications(true);
    } else {
      renderAuth('login');
    }
  } catch (e) {
    renderAuth('login');
  }
}

document.addEventListener('DOMContentLoaded', boot);
window.addEventListener('beforeunload', () => {
  try { if (window.__stopTyping) window.__stopTyping(); } catch (_) {}
});

/* keep state visible for debugging */
window.__app = { state };