/* ==================================================================
   Pulse Chat - Admin Dashboard
   admin.js - authentication, shell, router, boot
   ================================================================== */
'use strict';

/* ================================================================== */
/* Navigation model                                                    */
/* ================================================================== */

const ROUTES = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', perm: 'dashboard',
      title: 'Dashboard', sub: 'Platform health at a glance' },
  ]},
  { group: 'Moderation', items: [
    { id: 'users', label: 'Users', icon: 'users', perm: 'users.view',
      title: 'Users', sub: 'Accounts, warnings and suspensions' },
    { id: 'reports', label: 'Reports', icon: 'flag', perm: 'reports.view', badge: 'reports',
      title: 'Reports', sub: 'Moderation queue' },
    { id: 'messages', label: 'Messages', icon: 'message', perm: 'messages.view',
      title: 'Messages', sub: 'Review and remove platform messages' },
    { id: 'conversations', label: 'Conversations', icon: 'chat', perm: 'convs.view',
      title: 'Conversations', sub: 'Direct chats and group threads' },
    { id: 'groups', label: 'Groups', icon: 'group', perm: 'groups.view',
      title: 'Groups', sub: 'Group membership and ownership' },
  ]},
  { group: 'Communication', items: [
    { id: 'announcements', label: 'Announcements', icon: 'bell',
      perm: 'announcements.create', altPerm: 'announcements.send',
      title: 'Announcements', sub: 'Publish platform-wide notifications' },
  ]},
  { group: 'System', items: [
    { id: 'admins', label: 'Administrators', icon: 'shield', perm: 'admins.view',
      title: 'Administrators', sub: 'Who can access this console' },
    { id: 'logs', label: 'Audit log', icon: 'list', perm: 'logs.view',
      title: 'Audit log', sub: 'Every administrative action on record' },
  ]},
];

function routeAllowed(r) {
  return can(r.perm) || (r.altPerm ? can(r.altPerm) : false);
}

function findRoute(id) {
  for (const g of ROUTES) {
    for (const r of g.items) if (r.id === id) return r;
  }
  return null;
}

function firstAllowedRoute() {
  for (const g of ROUTES) {
    for (const r of g.items) if (routeAllowed(r)) return r.id;
  }
  return 'dashboard';
}

/* ================================================================== */
/* Topbar actions                                                      */
/* ================================================================== */

function setTopbarActions(actions) {
  const host = $('#topbar-actions');
  if (!host) return;
  host.innerHTML = (actions || []).map(a =>
    '<button class="icon-btn' + (a.primary ? ' primary' : '') + '" data-tb-act="' + esc(a.id) + '"' +
    ' title="' + esc(a.label) + '" aria-label="' + esc(a.label) + '">' + icon(a.icon || 'dots', 19) + '</button>'
  ).join('');

  host.onclick = e => {
    const b = e.target.closest('[data-tb-act]');
    if (!b) return;
    const act = (actions || []).find(a => a.id === b.dataset.tbAct);
    if (act && act.onClick) act.onClick();
  };
}

/* ================================================================== */
/* Login screen                                                        */
/* ================================================================== */

function renderLogin(message) {
  const app = $('#app');
  app.innerHTML =
    '<div class="auth-wrap">' +
      '<div class="auth-card">' +
        '<div class="auth-logo">' + icon('shield', 26) + '</div>' +
        '<h1>Admin console</h1>' +
        '<p class="auth-sub">Sign in with an account that holds administrative access to ' +
        esc(APP_NAME || 'Pulse Chat') + '.</p>' +
        (message ? '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(message) + '</span></div>' : '') +
        '<form id="login-form" autocomplete="on">' +
          '<div class="field"><label for="lg-id">Username or email</label>' +
            '<input class="input" id="lg-id" name="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
          '<div class="field"><label for="lg-pw">Password</label>' +
            '<div class="field-inner row" style="gap:8px;align-items:center">' +
              '<input class="input" id="lg-pw" name="password" type="password" autocomplete="current-password" style="flex:1" required>' +
              '<button class="icon-btn" type="button" id="lg-eye" aria-label="Show password">' + icon('eye', 18) + '</button>' +
            '</div></div>' +
          '<button class="btn btn-primary btn-block" type="submit" id="lg-submit">' + icon('logout', 17) + 'Sign in</button>' +
        '</form>' +
        '<div class="auth-foot">' +
          '<span>Protected area</span>' +
          '<a href="../index.php">Back to the app</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  const form = $('#login-form');
  const pw = $('#lg-pw');
  const eye = $('#lg-eye');

  if (eye) {
    eye.addEventListener('click', () => {
      const showing = pw.type === 'text';
      pw.type = showing ? 'password' : 'text';
      eye.innerHTML = icon(showing ? 'eye' : 'eyeOff', 18);
      pw.focus();
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#lg-submit');
    const identifier = $('#lg-id').value.trim();
    const password = pw.value;
    if (!identifier || !password) return;
    setLoading(btn, true);
    try {
      const r = await apiPost('api/auth.php', { action: 'login', identifier: identifier, password: password });
      state.me = r.user;
      state.csrf = r.csrf || CSRF;
      CSRF = state.csrf;
      await bootShell();
    } catch (err) {
      renderLogin(err.message);
    }
  });

  const first = $('#lg-id');
  if (first) first.focus();
}

/* ================================================================== */
/* Application shell                                                   */
/* ================================================================== */

function renderShell() {
  const app = $('#app');
  app.innerHTML =
    '<div class="shell">' +
      '<aside class="aside" id="aside">' +
        '<div class="aside-head">' +
          '<div class="aside-logo">' + icon('shield', 20) + '</div>' +
          '<div class="aside-title"><b>' + esc(APP_NAME || 'Pulse Chat') + '</b><span>Admin</span></div>' +
          '<div class="spacer"></div>' +
          '<button class="icon-btn" id="btn-close-nav" aria-label="Close menu" style="display:none">' + icon('x', 18) + '</button>' +
        '</div>' +
        '<nav class="aside-nav" id="nav"></nav>' +
        '<div class="aside-foot">' +
          '<button class="user-card" id="user-card">' +
            '<span id="uc-avatar"></span>' +
            '<span class="uc-meta"><b id="uc-name"></b><span id="uc-role"></span></span>' +
            icon('dots', 17) +
          '</button>' +
        '</div>' +
      '</aside>' +
      '<main class="main">' +
        '<header class="topbar">' +
          '<button class="icon-btn" id="btn-menu" aria-label="Open menu">' + icon('menu', 20) + '</button>' +
          '<div class="tb-title"><h1 id="tb-title">Dashboard</h1><p id="tb-sub"></p></div>' +
          '<div class="topbar-actions" id="topbar-actions"></div>' +
          '<button class="icon-btn" id="btn-theme" aria-label="Toggle theme"></button>' +
        '</header>' +
        '<div class="content" id="content"></div>' +
      '</main>' +
    '</div>';

  renderThemeBtn();

  const closeBtn = $('#btn-close-nav');
  if (closeBtn && window.matchMedia('(max-width: 1180px)').matches) closeBtn.style.display = '';

  $('#btn-menu').addEventListener('click', openNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  $('#btn-theme').addEventListener('click', () => { toggleTheme(); });

  const card = $('#user-card');
  if (card) {
    card.addEventListener('click', () => {
      openMenu(card, [
        { id: 'me', label: 'My profile', icon: 'user', onClick: () => openUserDetail(state.me.id) },
        { id: 'pw', label: 'My account', icon: 'key', onClick: openSelfPassword },
        { sep: true },
        { id: 'out', label: 'Sign out', icon: 'logout', danger: true, onClick: doLogout },
      ]);
    });
  }

  renderNav();
  renderUserCard();
}

function renderNav() {
  const nav = $('#nav');
  if (!nav) return;

  let html = '';
  for (const g of ROUTES) {
    const items = g.items.filter(routeAllowed);
    if (!items.length) continue;
    html += '<div class="nav-label">' + esc(g.group) + '</div>';
    for (const r of items) {
      const badge = r.badge && state.badges[r.badge] ? state.badges[r.badge] : 0;
      html += '<button class="nav-item' + (state.route === r.id ? ' active' : '') + '" data-nav="' + r.id + '">' +
        icon(r.icon, 18) + '<span>' + esc(r.label) + '</span>' +
        (badge ? '<span class="nav-badge">' + (badge > 99 ? '99+' : badge) + '</span>' : '') +
        '</button>';
    }
  }
  nav.innerHTML = html;

  nav.onclick = e => {
    const b = e.target.closest('[data-nav]');
    if (!b) return;
    location.hash = '#/' + b.dataset.nav;
    closeNav();
  };
}

function renderUserCard() {
  const me = state.me || {};
  const av = $('#uc-avatar');
  if (av) av.outerHTML = avatarHTML(me, 34, '', true);
  const n = $('#uc-name');
  if (n) n.textContent = me.full_name || me.username || 'Admin';
  const r = $('#uc-role');
  if (r) r.textContent = String(me.role || '').replace(/_/g, ' ');
}

function openNav() {
  const aside = $('#aside');
  if (!aside) return;
  aside.classList.add('open');
  if (!$('#aside-scrim')) {
    const s = document.createElement('div');
    s.className = 'aside-scrim';
    s.id = 'aside-scrim';
    s.addEventListener('click', closeNav);
    document.body.appendChild(s);
  }
}

function closeNav() {
  const aside = $('#aside');
  if (aside) aside.classList.remove('open');
  const s = $('#aside-scrim');
  if (s) s.remove();
}

/* ================================================================== */
/* Router                                                              */
/* ================================================================== */

let currentRoute = null;

function routeFromHash() {
  const raw = String(location.hash || '').replace(/^#\/?/, '').split('?')[0].trim();
  return raw || firstAllowedRoute();
}

async function navigate() {
  stopPolling();
  closeAllModals();
  closeMenus();
  closeNav();

  let id = routeFromHash();
  let route = findRoute(id);

  if (!route || !routeAllowed(route)) {
    const fallback = firstAllowedRoute();
    if (id !== fallback) {
      location.replace('#/' + fallback);
      return;
    }
    route = findRoute(fallback);
  }

  if (currentRoute !== id) {
    state.search = {};
  }
  state.route = id;
  currentRoute = id;

  const title = $('#tb-title');
  const sub = $('#tb-sub');
  if (title) title.textContent = route.title;
  if (sub) sub.textContent = route.sub || '';
  setTopbarActions([]);

  renderNav();
  document.title = route.title + ' - ' + (APP_NAME || 'Pulse Chat') + ' Admin';

  const content = $('#content');
  if (!content) return;
  content.scrollTop = 0;
  content.innerHTML = '<div class="view">' + loadingBlock('Loading ' + route.label.toLowerCase()) + '</div>';

  const fn = Views[id];
  if (!fn) {
    content.innerHTML = '<div class="view">' +
      emptyState({ icon: 'alert', title: 'View unavailable', message: 'This section has not been implemented yet.' }) + '</div>';
    return;
  }
  await fn(content);
}

function reloadView() {
  if (currentRoute) navigate();
}

/* ================================================================== */
/* Session actions                                                     */
/* ================================================================== */

async function doLogout() {
  const ok = await confirmDialog({
    title: 'Sign out of the admin console?',
    message: 'You will need to sign in again to continue moderating.',
    confirmText: 'Sign out',
    icon: 'logout',
  });
  if (!ok) return;
  try { await apiPost('api/auth.php', { action: 'logout' }); } catch (e) { /* ignore */ }
  stopPolling();
  state.me = null;
  location.hash = '';
  renderLogin();
}

function openSelfPassword() {
  const me = state.me || {};
  openModal({
    title: 'My password',
    icon: 'key',
    body: '<p class="small muted mb-2">Ask a super admin to reset your password if you have lost access to it.</p>' +
      '<dl class="deflist"><dt>Account</dt><dd>@' + esc(me.username) + '</dd>' +
      '<dt>Role</dt><dd>' + esc(String(me.role || '').replace(/_/g, ' ')) + '</dd></dl>',
    confirmText: 'Close',
    onConfirm: (btn) => closeAllModals(),
  });
}

/* ================================================================== */
/* Session watchdog                                                    */
/* ================================================================== */

function watchSession() {
  schedule(async () => {
    if (state.sessionLost) return;
    if (!document.body.contains($('#content'))) return;
    try {
      const d = await apiGet('api/auth.php');
      if (d && d.authenticated === false) sessionLost();
    } catch (e) {
      /* transient network errors should not kick the admin out */
    }
  }, 120000);
}

function sessionLost() {
  if (state.sessionLost) return;
  state.sessionLost = true;
  stopPolling();
  toast('Your session expired. Please sign in again.', 'error', 5000);
  setTimeout(() => {
    state.me = null;
    location.hash = '';
    renderLogin('Your session expired. Please sign in again.');
  }, 900);
}

/* ================================================================== */
/* Boot                                                                */
/* ================================================================== */

async function bootShell() {
  state.sessionLost = false;
  renderShell();
  await navigate();
  watchSession();
}

async function boot() {
  initTheme();
  try {
    const d = await apiGet('api/auth.php');
    if (d && d.authenticated && d.user) {
      state.me = d.user;
      state.csrf = d.csrf || CSRF;
      CSRF = state.csrf;
      await bootShell();
      return;
    }
  } catch (e) {
    renderLogin('Could not reach the server. Check that PHP and MySQL are running, then reload.');
    return;
  }
  renderLogin();
}

window.addEventListener('hashchange', () => {
  if (state.me) navigate();
});

window.addEventListener('keydown', e => {
  if (state.me) {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const q = $('#lv-q');
      if (q) q.focus();
      return;
    }
    if (e.key === 'Escape') closeMenus();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
