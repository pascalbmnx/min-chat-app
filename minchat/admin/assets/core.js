/* ==================================================================
   Pulse Chat - Admin Dashboard
   core.js - helpers, formatting, API, permissions, UI primitives
   ================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* DOM helpers                                                          */
/* ------------------------------------------------------------------ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** HTML-escape. Every value interpolated into markup must go through this. */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ------------------------------------------------------------------ */
/* Icons (inline SVG - no external icon library)                        */
/* ------------------------------------------------------------------ */

const PATHS = {
  shield:    '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  grid:      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users:     '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.8 20a6.5 6.5 0 0 0-3.3-5.7"/>',
  chat:      '<path d="M12 3C7 3 3 6.6 3 11c0 2.1.9 4 2.3 5.5-.2 1.2-.8 2.4-1.8 3.4 1.4.1 2.8-.3 3.9-1 1.4.5 3 .8 4.6.8 5 0 9-3.6 9-8S17 3 12 3z"/>',
  message:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  group:     '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17.5 5.2a3.5 3.5 0 0 1-.2 6M21 20a6.5 6.5 0 0 0-4-6"/>',
  flag:      '<path d="M4 22V4c0-.6.4-1 1-1h9.5l-1 3.5L14.5 10H5"/><path d="M5 22h14"/>',
  bell:      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 1 1-3.4 0"/>',
  list:      '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  search:    '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x:         '<path d="M18 6 6 18M6 6l12 12"/>',
  check:     '<path d="M20 6 9 17l-5-5"/>',
  moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  refresh:   '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  dots:      '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  trash:     '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  edit:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  ban:       '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  warning:   '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  unlock:    '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  key:       '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8.3-8.3M17 6l2.5 2.5M14.5 8.5 17 11"/>',
  eye:       '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:    '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a19.7 19.7 0 0 1 5.2-6.1M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a19.7 19.7 0 0 1-3.6 4.6"/><path d="m3 3 18 18"/>',
  plus:      '<path d="M12 5v14M5 12h14"/>',
  chevronL:  '<path d="m15 6-6 6 6 6"/>',
  chevronR:  '<path d="m9 6 6 6-6 6"/>',
  arrowR:    '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  arrowUp:   '<path d="m5 12 7-7 7 7M12 19V5"/>',
  arrowDown: '<path d="M12 5v14m-7-8 7 8 7-8"/>',
  crown:     '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
  userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  userPlus:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 11 2 2 4-4"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send:      '<path d="M3.4 20.4l17.6-8.4L3.4 3.6l1.8 7.4 7.6.9-7.6.9-1.8 7.6z"/>',
  calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  copy:      '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  alert:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/>',
  activity:  '<path d="M22 12h-4l-3 8-6-16-3 8H2"/>',
  file:      '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M13 2v6h6"/>',
  image:     '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-4 4 4"/>',
  pin:       '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>',
  restore:   '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 3v6h6"/>',
  lock:      '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  link:      '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  hash:      '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  gavel:     '<path d="m14 2-8 8 4 4 8-8z"/><path d="m6 12-3 3 6 6 3-3"/><path d="M10 18h11"/>',
  inbox:     '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  menu:      '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  external:  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  note:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M13 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  filter:    '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  paperclip: '<path d="M21 11.5 12 20.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>',
  replyArrow:'<path d="m9 15-5-5 5-5"/><path d="M4 10h9a7 7 0 0 1 7 7v3"/>',
  menuBtn:   '<path d="M4 6h16M4 12h16M4 18h16"/>',
  report:    '<path d="M5 21V4h9l1 3 4-1v9h-5l-1-2H8v8z"/>',
  mute:      '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  block:     '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 12 12l6.4 6.4M12 3a9 9 0 0 1 6.4 2.6L5.6 18.4A9 9 0 0 1 12 3z"/>',
  spinner:   '<path d="M12 3a9 9 0 0 1 9 9" />',
  print:     '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 15h12v6H6z"/>',
  download:  '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 19h16"/>',
};

function icon(name, size) {
  const s = size || 20;
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s +
    '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (PATHS[name] || '') + '</svg>';
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

const toDate = s => {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
};

function fmtAgo(s) {
  const d = toDate(s);
  if (!d) return 'never';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDateTime(s) {
  const d = toDate(s);
  if (!d) return '—';
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(s) {
  const d = toDate(s);
  return d ? d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function dayShort(s) {
  const d = toDate(s);
  return d ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
}

function fmtSize(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString();
}

/** Is this user considered online right now? */
function isOnlineRow(u) {
  if (!u) return false;
  if (Number(u.is_online) !== 1) return false;
  const d = toDate(u.last_seen_at);
  if (!d) return false;
  return (Date.now() - d.getTime()) < 90000;
}

/** ISO-ish string suitable for <input type="datetime-local"> (browser local time). */
function toLocalInput(s) {
  const d = toDate(s);
  if (!d) return '';
  const p = v => String(v).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** <input type="datetime-local"> value (browser local) -> MySQL UTC datetime string. */
function fromLocalInput(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  const p = x => String(x).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
         ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':00';
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

let CSRF = window.PULSE_CSRF || '';

async function api(path, opts) {
  const o = Object.assign({ headers: {} }, opts || {});
  if (o.body && typeof o.body !== 'string' && !(o.body instanceof FormData)) {
    o.headers['Content-Type'] = 'application/json';
    o.body = JSON.stringify(o.body);
  }
  const method = (o.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') o.headers['X-CSRF-Token'] = CSRF;

  let res;
  try {
    res = await fetch(path, o);
  } catch (e) {
    throw new Error('Network error. Check your connection.');
  }
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON body */ }

  if (res.status === 401) {
    if (typeof sessionLost === 'function') sessionLost();
    return { __authError: true };
  }
  if (res.status === 419) {
    throw new Error(data && data.error ? data.error : 'Your security token expired. Please reload the page.');
  }
  if (!res.ok || !data || data.ok !== true) {
    const err = new Error((data && data.error) || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

const apiGet  = (p, o) => api(p, o);
const apiPost = (p, body) => api(p, { method: 'POST', body: body || {} });

/** Build a query string, skipping empty values. */
function qs(obj) {
  const p = new URLSearchParams();
  Object.keys(obj || {}).forEach(k => {
    const v = obj[k];
    if (v !== '' && v !== null && v !== undefined) p.set(k, v);
  });
  const s = p.toString();
  return s ? '?' + s : '';
}

/* ------------------------------------------------------------------ */
/* Permissions - mirrors the server-side ROLE_PERMISSIONS map.          */
/* The server re-checks every action; this only drives the UI.         */
/* ------------------------------------------------------------------ */

const PERMS = {
  super_admin: ['*'],
  admin: [
    'dashboard', 'users.view', 'users.edit', 'users.warn', 'users.suspend', 'users.block', 'users.delete',
    'roles.assign', 'convs.view', 'convs.remove',
    'messages.view', 'messages.remove',
    'groups.view', 'groups.remove', 'groups.members_remove',
    'reports.view', 'reports.handle',
    'announcements.create', 'announcements.send', 'announcements.delete',
    'admins.view', 'logs.view',
  ],
  moderator: [
    'dashboard', 'users.view',
    'convs.view', 'messages.view', 'messages.remove',
    'groups.view', 'groups.remove', 'groups.members_remove',
    'reports.view', 'reports.handle',
  ],
};

const PERM_GROUPS = [
  ['Dashboard', ['dashboard']],
  ['Users', ['users.view', 'users.edit', 'users.warn', 'users.suspend', 'users.block', 'users.delete', 'roles.assign']],
  ['Conversations', ['convs.view', 'convs.remove']],
  ['Messages', ['messages.view', 'messages.remove']],
  ['Groups', ['groups.view', 'groups.remove', 'groups.members_remove']],
  ['Reports', ['reports.view', 'reports.handle']],
  ['Announcements', ['announcements.create', 'announcements.send', 'announcements.delete']],
  ['Administrators', ['admins.view']],
  ['Audit log', ['logs.view']],
];

function can(perm) {
  const list = PERMS[(state.me && state.me.role) || ''] || [];
  return list.indexOf('*') !== -1 || list.indexOf(perm) !== -1;
}

function isSuper() {
  return !!(state.me && state.me.role === 'super_admin');
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  me: null,
  csrf: CSRF,
  route: 'dashboard',
  badges: { reports: 0 },
  search: {},
  sessionLost: false,
};

let pollers = [];
function stopPolling() {
  pollers.forEach(c => clearInterval(c));
  pollers = [];
}
function schedule(fn, ms) { pollers.push(setInterval(fn, ms)); }

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const TICON = { success: 'check', error: 'x', info: 'info' };

function toast(message, type, ttl) {
  const wrap = $('#toast-container');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.innerHTML = icon(TICON[type] || 'info', 18) + '<span>' + esc(message) + '</span>';
  wrap.appendChild(t);
  const life = ttl || 3600;
  setTimeout(() => {
    t.classList.add('leaving');
    setTimeout(() => t.remove(), 240);
  }, life);
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function openModal(opts) {
  const o = opts || {};
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';

  let foot = o.foot || '';
  if (!foot && o.confirmText) {
    foot = '<div class="spacer"></div>' +
      '<button class="btn btn-ghost" data-mc-cancel>' + esc(o.cancelText || 'Cancel') + '</button>' +
      '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-mc-ok>' + esc(o.confirmText) + '</button>';
  }

  wrap.innerHTML = '<div class="modal ' + (o.size || '') + '">' +
    '<div class="modal-head' + (o.danger ? ' danger' : '') + '">' +
      '<div class="mh-ico">' + icon(o.icon || 'shield', 19) + '</div>' +
      '<div class="mh-meta">' +
        '<h3>' + (o.title || '') + '</h3>' +
        (o.subtitle ? '<p>' + o.subtitle + '</p>' : '') +
      '</div>' +
      '<button class="icon-btn" data-close aria-label="Close">' + icon('x', 19) + '</button>' +
    '</div>' +
    '<div class="modal-body' + (o.flush ? ' flush' : '') + '">' + (o.body || '') + '</div>' +
    (foot ? '<div class="modal-foot">' + foot + '</div>' : '') +
  '</div>';

  function close() {
    document.removeEventListener('keydown', onKey);
    wrap.remove();
  }
  function onKey(ev) { if (ev.key === 'Escape' && !wiring) close(); }

  let wiring = false;
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target.closest('[data-close]') || e.target.closest('[data-mc-cancel]')) close();
  });
  document.addEventListener('keydown', onKey);

  $('#modal-container').appendChild(wrap);
  if (o.onConfirm) {
    wiring = true;
    const ok = $('[data-mc-ok]', wrap);
    if (ok) {
      ok.addEventListener('click', ev => {
        if (ok.disabled) return;
        o.onConfirm(ok, wrap, close);
        ev.preventDefault();
      });
      const input = $('input, textarea, select', $('.modal-body', wrap));
      if (input) {
        input.addEventListener('keydown', ev => {
          if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
            ev.preventDefault();
            if (!ok.disabled) ok.click();
          }
        });
      }
    }
  }

  if (o.onMount) o.onMount(wrap, close);
  return wrap;
}

function confirmDialog(opts) {
  const o = opts || {};
  return new Promise(resolve => {
    let settled = false;
    const w = openModal({
      title: esc(o.title || 'Are you sure?'),
      icon: o.icon || 'warning',
      size: 'sm',
      danger: o.danger !== false,
      body: '<p class="small muted" style="line-height:1.6">' + esc(o.message || '') + '</p>',
      foot: '<div class="spacer"></div>' +
            '<button class="btn btn-ghost" data-no>Cancel</button>' +
            '<button class="btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger') + '" data-yes>' + esc(o.confirmText || 'Confirm') + '</button>',
    });
    function done(v) {
      if (settled) return;
      settled = true;
      w.remove();
      resolve(v);
    }
    w.addEventListener('click', e => {
      if (e.target.closest('[data-yes]')) done(true);
      else if (e.target.closest('[data-no]') || e.target === w || e.target.closest('[data-close]')) done(false);
    });
  });
}

/** Replace a modal's inner panel (used when async content arrives). */
function replaceModal(wrap, html) {
  const modal = $('.modal', wrap);
  if (modal) modal.outerHTML = html;
}

function closeAllModals() {
  $$('#modal-container .modal-backdrop').forEach(m => m.remove());
}

/* ------------------------------------------------------------------ */
/* Dropdown menus                                                       */
/* ------------------------------------------------------------------ */

let activeMenu = null;
function closeMenus() {
  if (activeMenu) { activeMenu.remove(); activeMenu = null; }
}

function openMenu(anchor, items) {
  closeMenus();
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map(it => {
    if (it.header) return '<div class="menu-head">' + esc(it.header) + '</div>';
    if (it.sep) return '<hr>';
    return '<button class="' + (it.danger ? 'danger' : '') + (it.disabled ? ' disabled' : '') +
      '" data-act="' + esc(it.id) + '">' + icon(it.icon || 'dots', 16) + '<span>' + esc(it.label) + '</span></button>';
  }).join('');
  document.body.appendChild(m);
  activeMenu = m;

  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - mw - 8);
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = Math.max(8, left) + 'px';
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
    window.addEventListener('resize', closeMenus, { once: true });
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('pulse_admin_theme', theme); } catch (_) {}
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(cur);
  renderThemeBtn();
  toast(cur === 'light' ? 'Light theme enabled' : 'Dark theme enabled', 'info', 1600);
}

function renderThemeBtn() {
  const b = $('#btn-theme');
  if (!b) return;
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  b.innerHTML = icon(light ? 'moon' : 'sun', 19);
  b.title = light ? 'Switch to dark mode' : 'Switch to light mode';
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('pulse_admin_theme'); } catch (_) {}
  applyTheme(saved || (state.me && state.me.theme) || 'dark');
}

/* ------------------------------------------------------------------ */
/* Avatars                                                             */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ['#5b5ef5', '#00a572', '#e05cab', '#e07b39', '#2f9bc2', '#8b5cf6', '#3f9d5e', '#c2456b'];

function avatarHTML(user, size, cls, online) {
  const u = user || {};
  const sz = size || 38;
  const name = u.full_name || u.username || '?';
  const initial = String(name).trim().charAt(0).toUpperCase() || '?';
  const style = 'width:' + sz + 'px;height:' + sz + 'px;font-size:' + Math.round(sz * 0.4) + 'px';
  let inner;
  if (u.avatar) {
    inner = '<img src="' + esc(u.avatar) + '" alt="" onerror="this.parentElement.textContent=\'' + esc(initial) + '\';this.remove()">';
  } else {
    let h = 0;
    const s = u.username || u.full_name || '';
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    const color = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
    inner = '<span style="background:' + color + '">' + esc(initial) + '</span>';
  }
  let dot = '';
  if (online === true) dot = '<i class="online-dot"></i>';
  else if (online === false) dot = '<i class="online-dot" style="background:var(--outline)"></i>';
  return '<span class="avatar ' + (cls || '') + '" style="' + style + '">' + inner + dot + '</span>';
}

/* ------------------------------------------------------------------ */
/* Pills & states                                                      */
/* ------------------------------------------------------------------ */

const STATUS_TONE = {
  active: 'ok', suspended: 'warn', blocked: 'danger',
  draft: 'mute', scheduled: 'info', sent: 'ok', cancelled: 'mute',
  open: 'danger', in_review: 'warn', resolved: 'ok', rejected: 'mute',
};

function statusPill(s) {
  const label = String(s || '').replace(/_/g, ' ');
  return '<span class="pill ' + (STATUS_TONE[s] || '') + '"><i class="dot"></i>' + esc(label) + '</span>';
}

function rolePill(r) {
  return '<span class="pill role-pill role-' + esc(r) + '">' + esc(String(r || '').replace(/_/g, ' ')) + '</span>';
}

function typePill(t) {
  if (t === 'group') return '<span class="pill brand">' + icon('group', 12) + 'group</span>';
  if (t === 'direct') return '<span class="pill mute">' + icon('chat', 12) + 'direct</span>';
  return '<span class="pill mute">' + esc(t || '') + '</span>';
}

function msgTypePill(t) {
  if (t === 'image') return '<span class="pill violet">' + icon('image', 12) + 'image</span>';
  if (t === 'file') return '<span class="pill info">' + icon('file', 12) + 'file</span>';
  return '<span class="pill mute">text</span>';
}

function catPill(c) {
  return '<span class="pill cat-pill mute">' + esc(String(c || 'other').replace(/_/g, ' ')) + '</span>';
}

function emptyState(o) {
  const c = o || {};
  return '<div class="empty">' +
    '<div class="e-ico">' + icon(c.icon || 'inbox', 28) + '</div>' +
    '<h4>' + esc(c.title || 'Nothing here') + '</h4>' +
    (c.message ? '<p>' + esc(c.message) + '</p>' : '') +
    (c.action || '') +
  '</div>';
}

function errorState(message, retryAttr) {
  return '<div class="empty error">' +
    '<div class="e-ico">' + icon('alert', 28) + '</div>' +
    '<h4>Could not load this section</h4>' +
    '<p>' + esc(message) + '</p>' +
    (retryAttr ? '<button class="btn btn-ghost btn-sm" data-' + retryAttr + '>' + icon('refresh', 15) + 'Try again</button>' : '') +
  '</div>';
}

function loadingBlock(label) {
  return '<div class="loading-block"><div class="spinner"></div><p>' + esc(label || 'Loading...') + '</p></div>';
}

function skeletonRows(n) {
  const count = n || 6;
  let out = '';
  for (let i = 0; i < count; i++) {
    out += '<div class="skel skel-row" style="animation-delay:' + (i * 60) + 'ms"></div>';
  }
  return out;
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle('btn-loading', !!on);
  btn.disabled = !!on;
}

async function withBusy(btn, fn) {
  setLoading(btn, true);
  try {
    return await fn();
  } finally {
    setLoading(btn, false);
  }
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(label || 'Copied to clipboard', 'success', 1900);
  } catch (e) {
    toast('Could not copy automatically.', 'error');
  }
}

function debounce(fn, ms) {
  let t = null;
  return function () {
    const args = arguments;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms || 330);
  };
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

function pagerHTML(page, pages) {
  if (!pages || pages <= 1) return '';
  function b(label, target, o) {
    const c = o || {};
    if (c.gap) return '<span class="pg-gap">...</span>';
    const inner = c.ico ? icon(c.ico, 15) : esc(String(label));
    return '<button data-page="' + target + '" class="' + (c.cur ? 'cur' : '') + '"' +
      (c.disabled ? ' disabled' : '') + '>' + inner + '</button>';
  }
  let out = b('', page - 1, { disabled: page <= 1, ico: 'chevronL' });
  const nums = [];
  const push = n => { if (n >= 1 && n <= pages && nums.indexOf(n) === -1) nums.push(n); };
  push(1); push(2);
  for (let i = page - 1; i <= page + 1; i++) push(i);
  push(pages - 1); push(pages);
  nums.sort((a, c) => a - c);
  let prev = 0;
  nums.forEach(n => {
    if (prev && n - prev > 1) out += b('', 0, { gap: true });
    out += b(n, n, { cur: n === page });
    prev = n;
  });
  out += b('', page + 1, { disabled: page >= pages, ico: 'chevronR' });
  return '<div class="pager">' + out + '</div>';
}

function wirePager(root, onPage) {
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    onPage(parseInt(btn.dataset.page, 10));
  });
}

/* ------------------------------------------------------------------ */
/* Charts - hand rolled SVG so no chart library is required            */
/* ------------------------------------------------------------------ */

const CHART_W = 760;
const CHART_H = 230;
const CHART_PAD = { t: 16, r: 14, b: 28, l: 38 };

function chartScale(series) {
  let max = 1;
  series.forEach(p => { const v = Number(p.count) || 0; if (v > max) max = v; });
  const step = Math.max(1, Math.ceil(max / 4));
  return { top: step * 4, step: step };
}

function smoothPath(pts, minY, maxY) {
  if (!pts.length) return '';
  const cl = v => Math.min(maxY, Math.max(minY, v));
  let d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = cl(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = cl(p2.y - (p3.y - p1.y) / 6);
    d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' +
         c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' +
         p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
  }
  return d;
}

function chartGrid(series) {
  const innerH = CHART_H - CHART_PAD.t - CHART_PAD.b;
  const sc = chartScale(series);
  let out = '';
  for (let i = 0; i <= 4; i++) {
    const y = CHART_PAD.t + (innerH / 4) * i;
    const v = sc.top - sc.step * i;
    out += '<line class="chart-grid-line" x1="' + CHART_PAD.l + '" y1="' + y.toFixed(1) +
      '" x2="' + (CHART_W - CHART_PAD.r) + '" y2="' + y.toFixed(1) + '"></line>';
    out += '<text class="chart-axis-text" x="' + (CHART_PAD.l - 9) + '" y="' + (y + 3.5).toFixed(1) +
      '" text-anchor="end">' + (v >= 1000 ? (v / 1000) + 'k' : v) + '</text>';
  }
  return out;
}

function chartXLabels(series, xAt) {
  const n = series.length;
  let out = '';
  series.forEach((p, i) => {
    if (n > 8 && i % 3 !== 0 && i !== n - 1) return;
    out += '<text class="chart-axis-text" x="' + xAt(i).toFixed(1) + '" y="' + (CHART_H - 8) +
      '" text-anchor="middle">' + esc(dayShort(p.date)) + '</text>';
  });
  return out;
}

/** Smooth area chart with gradient fill, grid lines and hover tooltips. */
function renderAreaChart(wrap, series, opts) {
  if (!wrap) return;
  const o = opts || {};
  const color = o.color || 'var(--primary-container)';
  const gradId = o.gradId || 'ag' + Math.random().toString(36).slice(2, 8);
  const data = series || [];
  const innerW = CHART_W - CHART_PAD.l - CHART_PAD.r;
  const innerH = CHART_H - CHART_PAD.t - CHART_PAD.b;
  const sc = chartScale(data);
  const n = data.length;
  const xAt = i => CHART_PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = v => CHART_PAD.t + innerH - (Math.min(Number(v) || 0, sc.top) / sc.top) * innerH;

  const pts = data.map((p, i) => ({ x: xAt(i), y: yAt(p.count), row: p }));
  const line = smoothPath(pts, CHART_PAD.t, CHART_PAD.t + innerH);
  const area = pts.length
    ? line + ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + (CHART_PAD.t + innerH) +
      ' L' + pts[0].x.toFixed(1) + ',' + (CHART_PAD.t + innerH) + ' Z'
    : '';
  const slot = innerW / (n || 1);

  let hits = '';
  pts.forEach((pt, i) => {
    hits += '<rect class="chart-hit" data-i="' + i + '" x="' + (pt.x - slot / 2).toFixed(1) +
      '" y="' + CHART_PAD.t + '" width="' + slot.toFixed(1) + '" height="' + innerH + '"></rect>';
  });

  wrap.classList.add('chart-wrap');
  wrap.innerHTML =
    '<svg viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" aria-label="' + esc(o.label || 'Trend') + '">' +
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity=".42"></stop>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"></stop>' +
      '</linearGradient></defs>' +
      chartGrid(data) +
      (area ? '<path d="' + area + '" fill="url(#' + gradId + ')"></path>' : '') +
      (line ? '<path class="chart-line" d="' + line + '" style="stroke:' + color + '"></path>' : '') +
      '<line class="chart-hover-line" x1="0" y1="' + CHART_PAD.t + '" x2="0" y2="' + (CHART_PAD.t + innerH) + '" style="display:none"></line>' +
      '<circle class="chart-dot" r="4.5" style="fill:' + color + ';display:none"></circle>' +
      chartXLabels(data, xAt) +
      hits +
    '</svg>' +
    '<div class="chart-tip" style="display:none"></div>';

  const svg = $('svg', wrap);
  const hover = $('.chart-hover-line', wrap);
  const dot = $('.chart-dot', wrap);
  const tip = $('.chart-tip', wrap);

  $$('.chart-hit', wrap).forEach((rect, i) => {
    rect.addEventListener('mouseenter', () => {
      const pt = pts[i];
      if (!pt) return;
      hover.setAttribute('x1', pt.x); hover.setAttribute('x2', pt.x);
      hover.style.display = '';
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      dot.style.display = '';
      const r = svg.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      const scale = r.width / CHART_W;
      tip.innerHTML = '<b>' + fmtNum(pt.row.count) + '</b><small>' + esc(fmtDate(pt.row.date)) + '</small>';
      tip.style.left = Math.max(52, Math.min(wr.width - 52, pt.x * scale + (r.left - wr.left))) + 'px';
      tip.style.top = (pt.y * scale + (r.top - wr.top)) + 'px';
      tip.style.display = '';
    });
  });
  svg.addEventListener('mouseleave', () => {
    hover.style.display = 'none';
    dot.style.display = 'none';
    tip.style.display = 'none';
  });
}

/** Bar chart with hover tooltips. */
function renderBarChart(wrap, series, opts) {
  if (!wrap) return;
  const o = opts || {};
  const color = o.color || 'var(--secondary)';
  const data = series || [];
  const innerW = CHART_W - CHART_PAD.l - CHART_PAD.r;
  const innerH = CHART_H - CHART_PAD.t - CHART_PAD.b;
  const sc = chartScale(data);
  const n = data.length || 1;
  const slot = innerW / n;
  const bw = Math.max(4, Math.min(30, slot * 0.58));

  let bars = '';
  data.forEach((p, i) => {
    const v = Math.min(Number(p.count) || 0, sc.top);
    const h = (v / sc.top) * innerH;
    const x = CHART_PAD.l + slot * i + (slot - bw) / 2;
    const y = CHART_PAD.t + innerH - h;
    bars += '<rect class="bar" data-i="' + i + '" x="' + x.toFixed(1) + '" y="' +
      (h < 1 ? CHART_PAD.t + innerH - 1 : y).toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + Math.max(h, 1).toFixed(1) + '" rx="4" fill="' + color + '" opacity=".82"></rect>';
  });

  wrap.classList.add('chart-wrap');
  wrap.innerHTML =
    '<svg viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" aria-label="' + esc(o.label || 'Trend') + '">' +
      chartGrid(data) + bars + chartXLabels(data, i => CHART_PAD.l + slot * i + slot / 2) +
    '</svg>' +
    '<div class="chart-tip" style="display:none"></div>';

  const svg = $('svg', wrap);
  const tip = $('.chart-tip', wrap);
  $$('.bar', wrap).forEach(bar => {
    bar.addEventListener('mouseenter', () => {
      const p = data[parseInt(bar.dataset.i, 10)];
      if (!p) return;
      const r = svg.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      const scale = r.width / CHART_W;
      const cx = (parseFloat(bar.getAttribute('x')) + bw / 2) * scale + (r.left - wr.left);
      const cy = parseFloat(bar.getAttribute('y')) * scale + (r.top - wr.top);
      tip.innerHTML = '<b>' + fmtNum(p.count) + '</b><small>' + esc(fmtDate(p.date)) + '</small>';
      tip.style.left = Math.max(52, Math.min(wr.width - 52, cx)) + 'px';
      tip.style.top = Math.max(26, cy) + 'px';
      tip.style.display = '';
      bar.setAttribute('opacity', '1');
    });
    bar.addEventListener('mouseleave', () => {
      tip.style.display = 'none';
      bar.setAttribute('opacity', '.82');
    });
  });
}

/** Donut chart with a centred figure. */
function renderDonut(wrap, slices, centerValue, centerSub) {
  if (!wrap) return;
  const size = 168, cx = size / 2, cy = size / 2, r = 62, thick = 20;
  let total = 0;
  slices.forEach(s => { total += Number(s.value) || 0; });
  const circ = 2 * Math.PI * r;
  let offset = 0;
  let rings = '';
  if (total <= 0) {
    rings = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--surface-high)" stroke-width="' + thick + '"></circle>';
  } else {
    slices.forEach(s => {
      const v = Number(s.value) || 0;
      if (v <= 0) return;
      const frac = v / total;
      rings += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color +
        '" stroke-width="' + thick + '" stroke-dasharray="' + (frac * circ - 2).toFixed(2) + ' ' + circ.toFixed(2) +
        '" stroke-dashoffset="' + (-offset * circ).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>' + esc(s.label) + ': ' + fmtNum(v) + '</title></circle>';
      offset += frac;
    });
  }
  wrap.innerHTML =
    '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px;max-width:100%">' +
      rings +
      '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="26" font-weight="800" fill="var(--on-surface)">' + esc(centerValue) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 21) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--outline)">' + esc(centerSub || '') + '</text>' +
    '</svg>';
}

/** Circular progress gauge. */
function renderGauge(wrap, pct, color, centerText) {
  if (!wrap) return;
  const size = 128, cx = size / 2, cy = size / 2, r = 52, thick = 12;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  wrap.innerHTML =
    '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<circle class="gauge-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke-width="' + thick + '"></circle>' +
      '<circle class="gauge-val" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color +
        '" stroke-width="' + thick + '" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + circ.toFixed(2) +
        '" transform="rotate(-90 ' + cx + ' ' + cy + '"></circle>' +
      '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="26" font-weight="800" fill="var(--on-surface)">' +
        esc(centerText != null ? centerText : v + '%') + '</text>' +
    '</svg>';
  const val = $('.gauge-val', wrap);
  requestAnimationFrame(() => {
    val.style.strokeDashoffset = (circ * (1 - v / 100)).toFixed(2);
  });
}

/* ------------------------------------------------------------------ */
/* Audit log action metadata                                           */
/* ------------------------------------------------------------------ */

const LOG_ACTIONS = {
  admin_login: 'Signed in', admin_logout: 'Signed out',
  warn_user: 'Warned user', suspend_user: 'Suspended user', block_user: 'Blocked user',
  unblock_user: 'Unblocked user', delete_user: 'Deleted user', edit_user: 'Edited user',
  reset_password: 'Reset password', set_user_role: 'Changed user role',
  update_admin_role: 'Changed admin role', add_admin: 'Granted admin role',
  remove_admin: 'Revoked admin role',
  remove_message: 'Removed message', restore_message: 'Restored message',
  remove_conversation: 'Removed conversation', remove_group: 'Removed group',
  remove_group_member: 'Removed group member',
  report_assign: 'Assigned report', report_note: 'Added report note',
  report_resolve: 'Resolved report', report_reject: 'Rejected report',
  report_action_remove_message: 'Removed reported message',
  report_action_suspend_user: 'Suspended reported user',
  create_announcement: 'Created announcement', send_announcement: 'Sent announcement',
  cancel_announcement: 'Cancelled announcement', delete_announcement: 'Deleted announcement',
  send_scheduled_announcement: 'Sent scheduled announcement',
};

const LOG_TONE = {
  admin_login: 'ok', unblock_user: 'ok', restore_message: 'ok', report_resolve: 'ok', send_announcement: 'ok',
  warn_user: 'warn', suspend_user: 'warn', report_assign: 'warn', report_note: 'info',
  report_reject: 'mute', block_user: 'danger', delete_user: 'danger', remove_message: 'danger',
  remove_conversation: 'danger', remove_group: 'danger', remove_group_member: 'warn',
  report_action_remove_message: 'danger', report_action_suspend_user: 'danger',
  update_admin_role: 'brand', add_admin: 'brand', set_user_role: 'brand', create_announcement: 'brand',
  send_scheduled_announcement: 'brand', remove_admin: 'warn',
  cancel_announcement: 'mute', delete_announcement: 'danger',
};

function logLabel(action) {
  return LOG_ACTIONS[action] || String(action || '').replace(/_/g, ' ');
}

function logPill(action) {
  return '<span class="pill ' + (LOG_TONE[action] || '') + '">' + esc(logLabel(action)) + '</span>';
}

const LOG_ACTION_KEYS = Object.keys(LOG_ACTIONS);

const LOG_ICONS = {
  admin_login: 'logout', admin_logout: 'logout',
  warn_user: 'warning', suspend_user: 'clock', block_user: 'ban', unblock_user: 'unlock',
  delete_user: 'trash', edit_user: 'edit', reset_password: 'key',
  set_user_role: 'crown', update_admin_role: 'crown', add_admin: 'userPlus', remove_admin: 'userMinus',
  remove_message: 'trash', restore_message: 'restore',
  remove_conversation: 'trash', remove_group: 'trash', remove_group_member: 'userMinus',
  report_assign: 'userCheck', report_note: 'note', report_resolve: 'check', report_reject: 'x',
  report_action_remove_message: 'trash', report_action_suspend_user: 'clock',
  create_announcement: 'bell', send_announcement: 'send', cancel_announcement: 'x',
  delete_announcement: 'trash', send_scheduled_announcement: 'send',
};

function logTone(action) {
  return LOG_TONE[action] || 'mute';
}

function logIcon(action) {
  return LOG_ICONS[action] || 'activity';
}
