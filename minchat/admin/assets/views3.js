/* ==================================================================
   Pulse Chat - Admin Dashboard
   views3.js - administrators, audit log
   ================================================================== */
'use strict';

/* ================================================================== */
/* ADMINISTRATORS                                                      */
/* ================================================================== */

Views.admins = function adminsView(root) {
  const actions = [{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => adminsView(root) }];
  if (isSuper()) actions.push({ id: 'add', label: 'Promote user', icon: 'userPlus', primary: true, onClick: () => openPromoteUser() });
  setTopbarActions(actions);

  root.innerHTML =
    '<div class="view">' +
      '<div id="ad-skel">' + skeletonRows(4) + '</div>' +
      '<div id="ad-body" style="display:none"></div>' +
    '</div>';

  load();

  async function load() {
    let d;
    try {
      d = await apiGet('api/admins.php');
    } catch (err) {
      $('#ad-skel', root).innerHTML = errorState(err.message, 'ad-retry');
      const rb = $('[data-ad-retry]', root) || $('[data-lv-retry]', root);
      if (rb) rb.addEventListener('click', () => adminsView(root));
      return;
    }
    if (d.__authError) return;

    const items = d.items || [];
    const skel = $('#ad-skel', root);
    const body = $('#ad-body', root);
    if (!skel || !body) return;
    skel.style.display = 'none';
    body.style.display = '';

    if (!items.length) {
      body.innerHTML = emptyState({
        icon: 'shield', title: 'No administrators',
        message: 'No accounts currently hold an administrative role.',
      });
      return;
    }

    body.innerHTML =
      '<div class="grid grid-cards">' +
        items.map(u => {
          const self = state.me && Number(state.me.id) === Number(u.id);
          return '<div class="card admin-card">' +
            '<div class="ac-top">' + avatarHTML(u, 46, '', isOnlineRow(u)) +
              '<div class="ac-meta"><b>' + esc(u.full_name || u.username) + '</b>' +
              '<small>@' + esc(u.username) + '</small></div>' +
              '<button class="icon-act" data-adm-menu="' + u.id + '" aria-label="Actions">' + icon('dots', 16) + '</button>' +
            '</div>' +
            '<div class="ac-pills">' + rolePill(u.role) + statusPill(u.status) + (self ? '<span class="pill brand">you</span>' : '') + '</div>' +
            '<div class="ac-foot">' +
              '<span class="tiny muted">' + icon('calendar', 12) + ' since ' + esc(fmtDate(u.created_at)) + '</span>' +
              (self || !isSuper()
                ? ''
                : '<button class="btn btn-ghost btn-xs" data-adm-remove="' + u.id + '">' + icon('userMinus', 13) + 'Remove</button>') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="info-note mt-2">' + icon('shield', 15) +
        '<span>Administrators can only act inside the permissions of their role. ' +
        (isSuper() ? 'As a super admin you can promote or demote other admins.' : 'Only a super admin can change these accounts.') + '</span></div>';

    body.addEventListener('click', e => {
      const m = e.target.closest('[data-adm-menu]');
      if (m) {
        const u = items.find(x => String(x.id) === m.dataset.admMenu);
        if (u) openMenu(m, adminActions(u));
        return;
      }
      const r = e.target.closest('[data-adm-remove]');
      if (r) {
        const u = items.find(x => String(x.id) === r.dataset.admRemove);
        if (u) demoteUser(u);
      }
    });
  }
};

function adminActions(u) {
  const self = state.me && Number(state.me.id) === Number(u.id);
  const acts = [{ id: 'view', label: 'View profile', icon: 'eye', onClick: () => openUserDetail(u.id) }];
  if (self) {
    acts.push({ id: 'self', label: 'This is your account', icon: 'info', disabled: true });
    return acts;
  }
  if (isSuper()) {
    acts.push({ id: 'role', label: 'Change role', icon: 'crown', onClick: () => openRoleChange(u) });
    acts.push({ id: 'demote', label: 'Remove admin access', icon: 'userMinus', danger: true, onClick: () => demoteUser(u) });
  }
  return acts;
}

async function demoteUser(u) {
  const ok = await confirmDialog({
    title: 'Remove admin access?',
    message: '@' + u.username + ' will become a regular user and lose access to this console. Their account and messages are kept.',
    confirmText: 'Remove access',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/admins.php', { action: 'remove', user_id: u.id });
    toast('@' + u.username + ' is no longer an administrator.', 'success');
  } catch (e) { /* surfaced */ }
  reloadView();
}

async function openPromoteUser() {
  let picked = null;

  openModal({
    title: 'Promote a user',
    icon: 'userPlus',
    body:
      '<p class="small muted mb-2">Find an existing account and give it administrative access. Use the least powerful role that fits.</p>' +
      '<div class="field"><label>Username</label>' +
        '<div class="field-inner row" style="gap:8px;border:0;padding:0;background:none">' +
          '<input id="pu-user" placeholder="exact username, without @" autocomplete="off" style="flex:1">' +
          '<button class="btn btn-ghost btn-sm" id="pu-find">' + icon('search', 15) + 'Find</button>' +
        '</div>' +
        '<small class="tiny muted">Search the users list for the account you want to promote.</small></div>' +
      '<div id="pu-result" class="mb-2"></div>' +
      '<div class="field"><label>Role</label>' +
        '<span class="select-wrap"><select class="input" id="pu-role">' +
          '<option value="moderator">Moderator - warn users and review reports</option>' +
          '<option value="admin">Admin - full moderation, no role management</option>' +
        '</select>' + icon('arrowDown', 15) + '</span></div>' +
      '<div class="info-note">' + icon('info', 15) +
        '<span>Super admin status can only be granted from the users list by an existing super admin.</span></div>',
    confirmText: 'Grant access',
    onConfirm: async (btn, wrap) => {
      if (!picked) { toast('Find and select a user first.', 'error'); return; }
      setLoading(btn, true);
      try {
        await apiPost('api/admins.php', { action: 'add', user_id: picked.id, role: $('#pu-role', wrap).value });
        toast('@' + picked.username + ' is now an administrator.', 'success');
        closeAllModals();
        reloadView();
      } catch (e) {
        setLoading(btn, false);
      }
    },
  });

  const wrap = $('#modal-container');
  if (!wrap) return;

  const input = $('#pu-user', wrap);
  const out = $('#pu-result', wrap);

  async function find() {
    const q = input.value.trim().replace(/^@/, '');
    if (!q) { toast('Enter a username to search for.', 'error'); return; }
    let d;
    try {
      d = await apiGet('api/users.php' + qs({ q: q, per_page: 6 }));
    } catch (e) { return; }
    if (d.__authError) return;

    const rows = (d.items || []).slice(0, 6);
    picked = null;
    if (!rows.length) {
      out.innerHTML = '<div class="info-note">' + icon('search', 15) + '<span>No account matches "' + esc(q) + '".</span></div>';
      return;
    }
    out.innerHTML =
      '<div class="list-plain">' + rows.map(u =>
        '<button class="list-item pick" data-pick="' + u.id + '" style="width:100%;text-align:left;cursor:pointer">' +
          avatarHTML(u, 32) +
          '<div class="li-meta"><b>' + esc(u.full_name || u.username) + '</b>' +
          '<small>@' + esc(u.username) + ' &middot; ' + esc(u.email) + '</small></div>' +
          rolePill(u.role) + statusPill(u.status) +
        '</button>').join('') + '</div>' +
      '<small class="tiny muted">Click the account you want to promote.</small>';

    out.addEventListener('click', ev => {
      const b = ev.target.closest('[data-pick]');
      if (!b) return;
      picked = (d.items || []).find(x => String(x.id) === b.dataset.pick) || null;
      $$('.pick', out).forEach(el => el.classList.toggle('picked', el === b));
    });
  }

  const fb = $('#pu-find', wrap);
  if (fb) fb.addEventListener('click', find);
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
    input.addEventListener('input', debounce(find, 350));
  }
}

/* ================================================================== */
/* AUDIT LOG                                                           */
/* ================================================================== */

Views.logs = function logsView(root) {
  const list = createListView({
    endpoint: 'api/logs.php',
    stateKey: 'logs',
    perPage: 25,
    emptyIcon: 'list',
    emptyTitle: 'Audit log is empty',
    emptyMessage: 'Administrative actions will be recorded here.',
    filters: [
      { type: 'select', key: 'action', options: [['', 'All actions']].concat(LOG_ACTION_KEYS.map(a => [a, logLabel(a)])) },
    ],
    columns: [
      { label: 'Administrator', width: '22%' },
      { label: 'Action' },
      { label: 'Target' },
      { label: 'Details' },
      { label: 'When' },
    ],
    renderRow: l =>
      '<tr>' +
        '<td><div class="cell-main">' + avatarHTML(l, 32) +
          '<div style="min-width:0"><b>' + esc(l.admin_full_name || l.admin_username) + '</b>' +
          '<small>@' + esc(l.admin_username) + '</small></div></div></td>' +
        '<td><span class="pill ' + logTone(l.action) + '">' + icon(logIcon(l.action), 12) + esc(logLabel(l.action)) + '</span></td>' +
        '<td class="small">' + (l.target_type
            ? esc(l.target_type) + ' <span class="mono muted">#' + esc(l.target_id) + '</span>'
            : '<span class="muted tiny">-</span>') + '</td>' +
        '<td><span class="cell-clip muted small">' + esc(l.details || '') + '</span></td>' +
        '<td class="nowrap small muted" title="' + esc(fmtDateTime(l.created_at)) + '">' + esc(fmtAgo(l.created_at)) + '</td>' +
      '</tr>',
    chips: st => chipRow([
      st.action ? { key: 'action', label: logLabel(st.action) } : null,
    ].filter(Boolean)),
  });

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => logsView(root) }]);
  list(root);
  wireChips(root, null, key => {
    const st = state.search.logs;
    st[key] = '';
    st.page = 1;
    logsView(root);
  });
};
