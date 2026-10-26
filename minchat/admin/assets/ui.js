/* ==================================================================
   Pulse Chat - Admin Dashboard
   ui.js - reusable list scaffolding + user management actions
   ================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* Cross-view navigation helpers                                       */
/* ------------------------------------------------------------------ */

/** Re-render the current route (used after a mutation). */
function reloadView() {
  if (typeof navigate === 'function') navigate(state.route, { force: true });
}

/** Open message moderation filtered to one sender. */
function gotoUserMessages(senderId) {
  state.search.messages = Object.assign({}, state.search.messages, {
    q: '', page: 1, per_page: 20, deleted: '', conversation_id: '', sender_id: senderId,
  });
  location.hash = '#/messages';
}

/** Open message moderation filtered to one conversation. */
function gotoConversationMessages(convId) {
  state.search.messages = Object.assign({}, state.search.messages, {
    q: '', page: 1, per_page: 20, deleted: '', sender_id: '', conversation_id: convId,
  });
  location.hash = '#/messages';
}

/** Open the user list filtered to one id via the search box. */
function gotoUserSearch(username) {
  state.search.users = Object.assign({}, state.search.users, {
    q: username || '', page: 1, per_page: 20, status: '', role: '',
  });
  location.hash = '#/users';
}

/* ------------------------------------------------------------------ */
/* Generic list view                                                   */
/* ------------------------------------------------------------------ */

/**
 * Builds a consistent management page: search + filter toolbar, a data
 * table with server-side pagination, row action menus and detail modals.
 *
 * cfg = {
 *   endpoint, stateKey, filters, columns, renderRow, rowActions,
 *   onRowClick, buildQuery, extraToolbar, wireExtra, chips,
 *   emptyIcon, emptyTitle, emptyMessage, perPage, toolbarActions
 * }
 */
function createListView(cfg) {
  const key = cfg.stateKey || cfg.endpoint;
  const st = Object.assign({
    q: '', page: 1, per_page: cfg.perPage || 20,
    status: '', role: '', type: '', target_type: '',
    deleted: '', conversation_id: '', sender_id: '', admin_id: '', action: '',
  }, cfg.initial || {}, state.search[key] || {});
  state.search[key] = st;

  const searchFilter = (cfg.filters || []).find(f => f.type === 'search');
  const selects = (cfg.filters || []).filter(f => f.type === 'select');
  let root = null;

  function hasActiveFilter() {
    if (st.q) return true;
    for (let i = 0; i < selects.length; i++) {
      if (st[selects[i].key]) return true;
    }
    return Object.keys(st).some(k =>
      ['deleted', 'conversation_id', 'sender_id', 'admin_id', 'action'].indexOf(k) !== -1 && st[k]);
  }

  function toolbarHTML() {
    return (searchFilter
      ? '<div class="search-box">' + icon('search', 17) +
        '<input type="text" id="lv-q" placeholder="' + esc(searchFilter.placeholder || 'Search...') +
        '" value="' + esc(st.q) + '" autocomplete="off">' +
        '<button class="search-clear' + (st.q ? ' show' : '') + '" id="lv-clear" aria-label="Clear search">' + icon('x', 14) + '</button>' +
        '</div>'
      : '') +
      selects.map(f =>
        '<span class="select-wrap"><select class="input" data-filter="' + f.key + '">' +
        f.options.map(o =>
          '<option value="' + esc(o[0]) + '"' + (String(st[f.key]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'
        ).join('') +
        '</select>' + icon('arrowDown', 15) + '</span>'
      ).join('') +
      (cfg.extraToolbar ? cfg.extraToolbar(st) : '') +
      '<div class="spacer"></div>' +
      (cfg.toolbarActions ? cfg.toolbarActions(st) : '') +
      '<span class="tiny muted nowrap" id="lv-count"></span>';
  }

  function paint() {
    root.innerHTML =
      '<div class="view">' +
        '<div class="toolbar">' + toolbarHTML() + '</div>' +
        (cfg.chips ? '<div class="filter-chips" id="lv-chips">' + cfg.chips(st) + '</div>' : '') +
        '<div class="panel">' +
          '<div id="lv-skeleton">' + skeletonRows(cfg.skeleton || 6) + '</div>' +
          '<div class="table-wrap" id="lv-table" style="display:none"></div>' +
          '<div id="lv-state" style="display:none"></div>' +
          '<div class="panel-foot" id="lv-foot" style="display:none"></div>' +
        '</div>' +
      '</div>';
  }

  function thead() {
    return '<thead><tr>' +
      cfg.columns.map(c => '<th' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + esc(c.label) + '</th>').join('') +
      '<th style="width:1%"></th></tr></thead>';
  }

  function remount() {
    paint();
    bind();
    load();
  }

  function resetFilters() {
    st.q = '';
    selects.forEach(f => { st[f.key] = ''; });
    st.deleted = ''; st.conversation_id = ''; st.sender_id = ''; st.admin_id = ''; st.action = '';
    st.page = 1;
    remount();
  }

  function wireRows(table, items) {
    table.addEventListener('click', e => {
      const menuBtn = e.target.closest('[data-menu]');
      if (menuBtn) {
        e.stopPropagation();
        const item = items.find(i => String(i.id) === menuBtn.dataset.menu);
        if (item && cfg.rowActions) {
          const acts = cfg.rowActions(item, st).filter(a => !a.hidden);
          if (acts.length) openMenu(menuBtn, acts);
        }
        return;
      }
      if (cfg.onRowClick) {
        const tr = e.target.closest('tr.clickable');
        if (tr) {
          const item = items.find(i => String(i.id) === tr.dataset.id);
          if (item) cfg.onRowClick(item, st);
        }
      }
    });
  }

  function renderEmpty(stateBox) {
    const filtered = hasActiveFilter();
    stateBox.innerHTML = filtered
      ? emptyState({
          icon: 'search', title: 'No matches found',
          message: 'No records match the current filters. Try widening your search.',
          action: '<button class="btn btn-ghost btn-sm" id="lv-reset">' + icon('refresh', 15) + 'Clear filters</button>',
        })
      : emptyState({
          icon: cfg.emptyIcon || 'inbox',
          title: cfg.emptyTitle || 'Nothing here yet',
          message: cfg.emptyMessage || '',
        });
    const rb = $('#lv-reset', stateBox);
    if (rb) rb.addEventListener('click', resetFilters);
  }

  async function load() {
    const skel = $('#lv-skeleton', root);
    const table = $('#lv-table', root);
    const foot = $('#lv-foot', root);
    const stateBox = $('#lv-state', root);
    const countEl = $('#lv-count', root);
    if (!skel) return;

    skel.style.display = '';
    table.style.display = 'none';
    stateBox.style.display = 'none';
    foot.style.display = 'none';

    let d;
    try {
      const query = cfg.buildQuery ? cfg.buildQuery(st) : st;
      d = await apiGet(cfg.endpoint + qs(query));
    } catch (err) {
      skel.style.display = 'none';
      stateBox.style.display = '';
      stateBox.innerHTML = errorState(err.message, 'lv-retry');
      const rb = $('[data-lv-retry]', stateBox);
      if (rb) rb.addEventListener('click', load);
      return;
    }
    if (d.__authError) return;
    if ($('#lv-skeleton', root) !== skel) return; /* view changed while loading */

    skel.style.display = 'none';

    if (!d.items || !d.items.length) {
      renderEmpty(stateBox);
      if (countEl) countEl.textContent = '';
      if (cfg.chips) {
        const chips = $('#lv-chips', root);
        if (chips) chips.innerHTML = cfg.chips(st);
      }
      return;
    }

    table.style.display = '';
    table.innerHTML = '<table class="data">' + thead() +
      '<tbody>' + d.items.map(it => cfg.renderRow(it, st)).join('') + '</tbody></table>';

    foot.style.display = '';
    foot.innerHTML =
      '<span id="lv-range"></span>' +
      '<div class="spacer"></div>' +
      '<span class="select-wrap"><select class="input" id="lv-per" style="height:33px;font-size:12px">' +
        [10, 20, 50, 100].map(n =>
          '<option value="' + n + '"' + (Number(st.per_page) === n ? ' selected' : '') + '>' + n + ' / page</option>'
        ).join('') +
      '</select></span>' +
      pagerHTML(d.page, d.pages);

    const from = (d.page - 1) * d.per_page + 1;
    const to = Math.min(d.total, d.page * d.per_page);
    $('#lv-range', foot).textContent = 'Showing ' + fmtNum(from) + '-' + fmtNum(to) + ' of ' + fmtNum(d.total);
    if (countEl) countEl.textContent = fmtNum(d.total) + ' record' + (d.total === 1 ? '' : 's');
    if (cfg.chips) {
      const chips = $('#lv-chips', root);
      if (chips) chips.innerHTML = cfg.chips(st);
    }

    const per = $('#lv-per', foot);
    if (per) per.addEventListener('change', () => {
      st.per_page = parseInt(per.value, 10);
      st.page = 1;
      load();
    });
    wirePager(foot, p => {
      st.page = p;
      load();
      const c = $('#content');
      if (c) c.scrollTop = 0;
    });
    wireRows(table, d.items);
  }

  function bind() {
    const qIn = $('#lv-q', root);
    const clear = $('#lv-clear', root);
    if (qIn) {
      qIn.addEventListener('input', debounce(() => {
        st.q = qIn.value;
        st.page = 1;
        if (clear) clear.classList.toggle('show', !!st.q);
        load();
      }));
    }
    if (clear) {
      clear.addEventListener('click', () => {
        if (!qIn) return;
        qIn.value = '';
        st.q = '';
        st.page = 1;
        clear.classList.remove('show');
        load();
      });
    }
    selects.forEach(f => {
      const sel = $('[data-filter="' + f.key + '"]', root);
      if (sel) {
        sel.addEventListener('change', () => {
          st[f.key] = sel.value;
          st.page = 1;
          load();
        });
      }
    });
    if (cfg.wireExtra) cfg.wireExtra(st, { root, load, remount, resetFilters });
  }

  return function mount(el) {
    root = el;
    paint();
    bind();
    load();
  };
}

/** Small helper for "active filter" chips. */
function chipRow(chips) {
  if (!chips.length) return '';
  return chips.map(c =>
    '<span class="pill brand" style="height:26px">' + esc(c.label) + ' ' +
    '<button data-chip="' + esc(c.key) + '" aria-label="Remove filter" style="display:flex;color:inherit;opacity:.75">' +
    icon('x', 12) + '</button></span>'
  ).join('');
}

function wireChips(root, st, onClear) {
  const box = $('#lv-chips', root);
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    onClear(b.dataset.chip, st);
  });
}

/* ------------------------------------------------------------------ */
/* User management                                                     */
/* ------------------------------------------------------------------ */

function userActions(u) {
  const me = state.me;
  const self = me && Number(me.id) === Number(u.id);
  const acts = [{ id: 'view', label: 'View profile', icon: 'eye', onClick: () => openUserDetail(u.id) }];

  if (self) {
    acts.push({ id: 'self', label: 'This is your account', icon: 'info', disabled: true });
    return acts;
  }
  if (can('users.edit')) acts.push({ id: 'edit', label: 'Edit details', icon: 'edit', onClick: () => openUserEdit(u) });
  if (can('users.warn')) acts.push({ id: 'warn', label: 'Send warning', icon: 'warning', onClick: () => openUserWarn(u) });

  if (can('users.suspend')) {
    acts.push(u.status === 'suspended'
      ? { id: 'unsuspend', label: 'Lift suspension', icon: 'unlock', onClick: () => unsuspendUser(u) }
      : { id: 'suspend', label: 'Suspend account', icon: 'clock', onClick: () => openUserSuspend(u) });
  }
  if (can('users.block')) {
    acts.push(u.status === 'blocked'
      ? { id: 'unblock', label: 'Unblock account', icon: 'unlock', onClick: () => setUserBlock(u, false) }
      : { id: 'block', label: 'Block account', icon: 'ban', danger: true, onClick: () => openUserBlock(u) });
  }
  if (can('users.edit')) acts.push({ id: 'resetpw', label: 'Reset password', icon: 'key', onClick: () => resetUserPassword(u) });
  if (can('roles.assign')) acts.push({ id: 'role', label: 'Change role', icon: 'crown', onClick: () => openRoleChange(u) });
  if (can('users.delete')) {
    acts.push({ sep: true });
    acts.push({ id: 'delete', label: 'Delete account', icon: 'trash', danger: true, onClick: () => deleteUser(u) });
  }
  return acts;
}

async function openUserDetail(id) {
  const w = openModal({
    title: 'Loading profile...', icon: 'user', size: 'lg',
    body: loadingBlock('Fetching account activity'),
  });
  let d;
  try {
    d = await apiGet('api/users.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load profile', err.message));
    return;
  }
  if (d.__authError) return;

  const u = d.user;
  const s = d.stats || {};
  const online = isOnlineRow(u);
  const lm = (s.last_messages || [])[0];

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon('user', 19) + '</div>' +
        '<div class="mh-meta"><h3>' + esc(u.full_name || u.username) + '</h3>' +
        '<p>@' + esc(u.username) + ' &middot; account #' + u.id + '</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row mb-2" style="gap:14px">' +
          avatarHTML(u, 56) +
          '<div style="flex:1;min-width:0">' +
            '<div class="row row-wrap" style="gap:6px">' + rolePill(u.role) + statusPill(u.status) +
            (online ? '<span class="pill ok"><i class="dot"></i>online</span>' : '') +
            (Number(u.warn_count) > 0 ? '<span class="pill warn">' + icon('warning', 12) + u.warn_count + ' warning' + (Number(u.warn_count) === 1 ? '' : 's') + '</span>' : '') +
            '</div>' +
            '<div class="tiny muted" style="margin-top:6px">' + esc(u.email) + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-stats" style="gap:10px;margin-bottom:18px">' +
          [['Messages', s.messages], ['Conversations', s.conversations], ['Groups', s.groups],
           ['Reports against', s.reports_against], ['Warnings', u.warn_count]]
          .map(p => '<div class="stat" style="--acc:var(--grad-primary);padding:12px 14px">' +
            '<div class="stat-val" style="font-size:20px;margin-top:0">' + fmtNum(p[1]) + '</div>' +
            '<div class="stat-key">' + esc(p[0]) + '</div></div>').join('') +
        '</div>' +

        '<div class="section-title">' + icon('info', 16) + 'Account information</div>' +
        '<dl class="deflist mb-2">' +
          '<dt>Full name</dt><dd>' + esc(u.full_name || '-') + '</dd>' +
          '<dt>Email</dt><dd>' + esc(u.email) + '</dd>' +
          '<dt>Registered</dt><dd>' + esc(fmtDateTime(u.created_at)) + '</dd>' +
          '<dt>Last seen</dt><dd>' + (u.last_seen_at ? esc(fmtDateTime(u.last_seen_at)) + ' <span class="muted tiny">(' + esc(fmtAgo(u.last_seen_at)) + ')</span>' : 'never') + '</dd>' +
          '<dt>Last updated</dt><dd>' + esc(fmtDateTime(u.updated_at)) + '</dd>' +
          (u.suspended_until ? '<dt>Suspended until</dt><dd>' + esc(fmtDateTime(u.suspended_until)) + '</dd>' : '') +
          '<dt>Bio</dt><dd>' + (u.bio ? esc(u.bio) : '<span class="muted">-</span>') + '</dd>' +
        '</dl>' +

        (u.moderation_note
          ? '<div class="section-title mt-2">' + icon('gavel', 16) + 'Latest moderation note</div>' +
            '<div class="quote-box">' + esc(u.moderation_note) + '</div>'
          : '') +

        '<div class="section-title mt-2">' + icon('message', 16) + 'Most recent message</div>' +
        (lm
          ? '<div class="msg-row" style="border:0;padding-bottom:4px">' +
              '<div class="msg-bubble' + (Number(lm.deleted) ? ' deleted' : '') + '">' +
              esc(lm.content || (Number(lm.deleted) ? 'This message was deleted' : '[' + lm.type + ' attachment]')) +
              '</div></div>' +
            '<div class="tiny muted">' + (lm.conv_name ? 'in ' + esc(lm.conv_name) : 'in a direct chat') +
            ' &middot; ' + esc(fmtDateTime(lm.created_at)) + '</div>'
          : '<p class="muted small">This user has not sent any messages yet.</p>') +
      '</div>' +
      '<div class="modal-foot">' +
        (can('messages.view') ? '<button class="btn btn-ghost btn-sm" data-msg-user="' + u.id + '">' + icon('message', 15) + 'Their messages</button>' : '') +
        (can('users.edit') ? '<button class="btn btn-ghost btn-sm" data-edit-user="' + u.id + '">' + icon('edit', 15) + 'Edit</button>' : '') +
        '<div class="spacer"></div>' +
        '<button class="btn btn-ghost btn-sm" data-close>Close</button>' +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const m = e.target.closest('[data-msg-user]');
    if (m) { closeAllModals(); gotoUserMessages(m.dataset.msgUser); return; }
    const ed = e.target.closest('[data-edit-user]');
    if (ed) { closeAllModals(); openUserEdit(u); }
  });
}

function modalError(title, message) {
  return '<div class="modal sm">' +
    '<div class="modal-head danger"><div class="mh-ico">' + icon('alert', 19) + '</div>' +
    '<div class="mh-meta"><h3>' + esc(title) + '</h3></div>' +
    '<button class="icon-btn" data-close>' + icon('x', 19) + '</button></div>' +
    '<div class="modal-body"><p class="small muted">' + esc(message) + '</p></div>' +
    '<div class="modal-foot"><div class="spacer"></div><button class="btn btn-ghost" data-close>Close</button></div>' +
  '</div>';
}

function openUserEdit(u) {
  openModal({
    title: 'Edit user',
    subtitle: '@' + esc(u.username) + ' &middot; account #' + u.id,
    icon: 'edit',
    body:
      '<div class="field"><label class="field-label" for="e-name">Full name</label>' +
        '<input class="input" id="e-name" type="text" maxlength="100" value="' + esc(u.full_name || '') + '"></div>' +
      '<div class="field"><label class="field-label" for="e-user">Username</label>' +
        '<input class="input" id="e-user" type="text" maxlength="30" value="' + esc(u.username || '') + '">' +
        '<div class="field-hint">3-30 characters. Letters, numbers and underscores only.</div></div>' +
      '<div class="field"><label class="field-label" for="e-mail">Email</label>' +
        '<input class="input" id="e-mail" type="email" maxlength="190" value="' + esc(u.email || '') + '"></div>' +
      '<div class="field"><label class="field-label" for="e-bio">Bio</label>' +
        '<textarea class="input" id="e-bio" maxlength="500" placeholder="Short profile description">' + esc(u.bio || '') + '</textarea></div>' +
      '<div id="e-alert"></div>',
    foot: '<div class="spacer"></div><button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-primary" id="e-save">' + icon('check', 16) + 'Save changes</button>',
    onMount(w, close) {
      $('#e-save', w).addEventListener('click', () => withBusy($('#e-save', w), async () => {
        try {
          await apiPost('api/users.php', {
            action: 'edit', id: u.id,
            full_name: $('#e-name', w).value.trim(),
            username: $('#e-user', w).value.trim(),
            email: $('#e-email', w).value.trim(),
            bio: $('#e-bio', w).value.trim(),
          });
          toast('User details updated.', 'success');
          close();
          reloadView();
        } catch (err) {
          $('#e-alert', w).innerHTML = '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(err.message) + '</span></div>';
        }
      }));
    },
  });
}

function openUserWarn(u) {
  openModal({
    title: 'Warn user',
    subtitle: '@' + esc(u.username),
    icon: 'warning',
    body:
      '<div class="alert warn">' + icon('warning', 18) +
      '<span>This increments their warning counter, sends them a notification and is recorded in the audit log.</span></div>' +
      '<div class="field"><label class="field-label" for="w-note">Reason <span class="req">*</span></label>' +
      '<textarea class="input" id="w-note" maxlength="500" placeholder="Explain which rule was broken..."></textarea>' +
      '<div class="field-hint">Up to 500 characters. The user sees this exact text.</div></div>' +
      '<div id="w-alert"></div>',
    foot: '<div class="spacer"></div><button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-danger" id="w-save">' + icon('warning', 16) + 'Send warning</button>',
    onMount(w, close) {
      $('#w-save', w).addEventListener('click', () => withBusy($('#w-save', w), async () => {
        try {
          const d = await apiPost('api/users.php', { action: 'warn', id: u.id, note: $('#w-note', w).value.trim() });
          toast('Warning sent. This is warning #' + d.warn_count + '.', 'success');
          close();
          reloadView();
        } catch (err) {
          $('#w-alert', w).innerHTML = '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(err.message) + '</span></div>';
        }
      }));
    },
  });
}

function openUserSuspend(u) {
  const in7 = new Date(Date.now() + 7 * 86400000);
  const def = toLocalInput(in7.toISOString().replace('T', ' ').slice(0, 19) + 'Z').slice(0, 16);
  openModal({
    title: 'Suspend account',
    subtitle: '@' + esc(u.username),
    icon: 'clock',
    body:
      '<div class="alert warn">' + icon('info', 18) +
      '<span>The account is blocked from the chat app until the suspension expires, then reactivated automatically.</span></div>' +
      '<div class="field"><label class="field-label" for="s-reason">Reason <span class="req">*</span></label>' +
      '<textarea class="input" id="s-reason" maxlength="500" placeholder="Why is this account being suspended?"></textarea></div>' +
      '<div class="field"><label class="checkline"><input type="checkbox" id="s-perm">' +
      '<span>Suspend indefinitely (must be lifted manually)</span></label></div>' +
      '<div class="field" id="s-until-wrap"><label class="field-label" for="s-until">Suspend until</label>' +
      '<input class="input" id="s-until" type="datetime-local" value="' + esc(def) + '">' +
      '<div class="field-hint">Defaults to one week from now. The account reactivates on its own.</div></div>' +
      '<div id="s-alert"></div>',
    foot: '<div class="spacer"></div><button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-danger" id="s-save">' + icon('ban', 16) + 'Suspend account</button>',
    onMount(w, close) {
      const perm = $('#s-perm', w);
      perm.addEventListener('change', () => { $('#s-until-wrap', w).style.display = perm.checked ? 'none' : ''; });
      $('#s-save', w).addEventListener('click', () => withBusy($('#s-save', w), async () => {
        try {
          await apiPost('api/users.php', {
            action: 'suspend',
            id: u.id,
            reason: $('#s-reason', w).value.trim(),
            suspended_until: perm.checked ? null : fromLocalInput($('#s-until', w).value),
          });
          toast('@' + u.username + ' has been suspended.', 'success');
          close();
          reloadView();
        } catch (err) {
          $('#s-alert', w).innerHTML = '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(err.message) + '</span></div>';
        }
      }));
    },
  });
}

async function unsuspendUser(u) {
  const ok = await confirmDialog({
    title: 'Lift this suspension?',
    message: '@' + u.username + ' will regain full access to the chat app immediately.',
    confirmText: 'Lift suspension', danger: false, icon: 'unlock',
  });
  if (!ok) return;
  try {
    await apiPost('api/users.php', { action: 'suspend', id: u.id, reason: 'Suspension lifted by administrator' });
    toast('Suspension lifted.', 'success');
  } catch (e) { /* api already surfaced the error */ }
  reloadView();
}

function openUserBlock(u) {
  openModal({
    title: 'Block account', danger: true, icon: 'ban',
    subtitle: '@' + esc(u.username),
    body:
      '<div class="alert error">' + icon('alert', 18) +
      '<span>Blocking removes all access to the chat app. Unblock at any time to restore it.</span></div>' +
      '<div class="field"><label class="field-label" for="b-reason">Reason (optional)</label>' +
      '<textarea class="input" id="b-reason" maxlength="500" placeholder="Stored on the account and in the audit log"></textarea></div>' +
      '<div id="b-alert"></div>',
    foot: '<div class="spacer"></div><button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-danger" id="b-save">' + icon('ban', 16) + 'Block account</button>',
    onMount(w, close) {
      $('#b-save', w).addEventListener('click', () => withBusy($('#b-save', w), async () => {
        try {
          await apiPost('api/users.php', { action: 'block', id: u.id, reason: $('#b-reason', w).value.trim() });
          toast('@' + u.username + ' has been blocked.', 'success');
          close();
          reloadView();
        } catch (err) {
          $('#b-alert', w).innerHTML = '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(err.message) + '</span></div>';
        }
      }));
    },
  });
}

async function setUserBlock(u, block) {
  const ok = await confirmDialog({
    title: block ? 'Block this account?' : 'Unblock this account?',
    message: block
      ? '@' + u.username + ' will lose access to the chat app.'
      : '@' + u.username + ' will regain access to the chat app immediately.',
    confirmText: block ? 'Block account' : 'Unblock account',
    icon: block ? 'ban' : 'unlock',
    danger: block,
  });
  if (!ok) return;
  try {
    await apiPost('api/users.php', { action: block ? 'block' : 'unblock', id: u.id, reason: '' });
    toast(block ? 'Account blocked.' : 'Account unblocked.', 'success');
  } catch (e) { /* api surfaced it */ }
  reloadView();
}

async function resetUserPassword(u) {
  const ok = await confirmDialog({
    title: 'Reset this password?',
    message: 'A new random password will be generated for @' + u.username +
      '. Their current password stops working immediately. Share it through a secure channel.',
    confirmText: 'Reset password', icon: 'key',
  });
  if (!ok) return;
  let d;
  try {
    d = await apiPost('api/users.php', { action: 'reset_password', id: u.id });
  } catch (e) { return; }

  openModal({
    title: 'New password generated',
    subtitle: '@' + esc(d.username),
    icon: 'key', size: 'sm',
    body:
      '<div class="alert warn">' + icon('warning', 18) + '<span>This password is shown only once. Copy it now.</span></div>' +
      '<div class="secret-box"><code>' + esc(d.new_password) + '</code>' +
      '<button class="btn btn-sm btn-ghost" id="rp-copy">' + icon('copy', 15) + 'Copy</button></div>',
    foot: '<div class="spacer"></div><button class="btn btn-primary" data-close>Done</button>',
    onMount(w) {
      $('#rp-copy', w).addEventListener('click', () => copyText(d.new_password, 'Password copied'));
    },
  });
  reloadView();
}

async function deleteUser(u) {
  const ok = await confirmDialog({
    title: 'Delete @' + u.username + '?',
    message: 'This permanently removes the account along with its messages, conversations and memberships. It cannot be undone.',
    confirmText: 'Delete permanently',
  });
  if (!ok) return;
  try {
    await apiPost('api/users.php', { action: 'delete', id: u.id });
    toast('Account deleted.', 'success');
  } catch (e) { /* api surfaced it */ }
  reloadView();
}

/**
 * Role change dialog. The server enforces a privilege ceiling: only a
 * super admin may grant or revoke admin-level roles.
 */
function openRoleChange(u) {
  const current = u.role;
  const options = isSuper()
    ? ['user', 'moderator', 'admin', 'super_admin']
    : ['user', 'moderator', 'admin'];
  openModal({
    title: 'Change role',
    subtitle: '@' + esc(u.username) + ' &middot; currently ' + esc(String(current).replace(/_/g, ' ')),
    icon: 'crown',
    body:
      (isSuper() ? '' : '<div class="alert info">' + icon('info', 18) +
        '<span>As an admin you can grant up to <b>admin</b>. Only a super admin can assign the super admin role.</span></div>') +
      '<div class="radio-cards" id="rc-cards">' +
        options.map(r =>
          '<label class="radio-card' + (r === current ? ' sel' : '') + '">' +
          '<input type="radio" name="ur-role" value="' + r + '"' + (r === current ? ' checked' : '') + '>' +
          '<span class="rc-meta"><b>' + esc(r.replace(/_/g, ' ')) + '</b>' +
          '<small>' + esc(ROLE_DESC[r] || '') + '</small></span></label>'
        ).join('') +
      '</div>' +
      '<div class="divider"></div>' +
      '<label class="field-label" for="rc-note">Audit note (optional)</label>' +
      '<input class="input" id="rc-note" maxlength="200" placeholder="Reason for this role change">' +
      '<div id="rc-alert"></div>',
    foot: '<div class="spacer"></div><button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-primary" id="rc-save">' + icon('check', 16) + 'Update role</button>',
    onMount(w, close) {
      $$('#rc-cards .radio-card', w).forEach(card => {
        card.addEventListener('click', () => {
          $$('#rc-cards .radio-card', w).forEach(c => c.classList.remove('sel'));
          card.classList.add('sel');
        });
      });
      $('#rc-save', w).addEventListener('click', () => withBusy($('#rc-save', w), async () => {
        const picked = $('input[name="ur-role"]:checked', w);
        if (!picked) return;
        try {
          await apiPost('api/users.php', {
            action: 'set_role',
            id: u.id,
            role: picked.value,
            note: $('#rc-note', w).value.trim(),
          });
          toast('@' + u.username + ' is now ' + picked.value.replace(/_/g, ' ') + '.', 'success');
          close();
          reloadView();
        } catch (err) {
          $('#rc-alert', w).innerHTML = '<div class="alert error">' + icon('alert', 18) + '<span>' + esc(err.message) + '</span></div>';
        }
      }));
    },
  });
}

const ROLE_DESC = {
  super_admin: 'Full access, including administrator accounts and roles.',
  admin: 'Manages users, content, reports and announcements.',
  moderator: 'Reviews content, groups and reports. No user or role actions.',
  user: 'Standard chat account with no admin access.',
};
