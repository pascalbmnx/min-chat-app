/* ==================================================================
   Pulse Chat - Admin Dashboard
   views.js - dashboard, users, conversations, messages
   ================================================================== */
'use strict';

const Views = {};

/* ================================================================== */
/* DASHBOARD                                                           */
/* ================================================================== */

Views.dashboard = function dashboardView(root) {
  root.innerHTML =
    '<div class="view">' +
      '<div class="grid grid-stats" id="d-skeleton">' +
        Array.from({ length: 6 }, (_, i) => '<div class="stat skel-card skel" style="animation-delay:' + (i * 55) + 'ms"></div>').join('') +
      '</div>' +
      '<div class="grid grid-2 mt-2">' +
        '<div class="panel"><div class="panel-body">' + loadingBlock('Loading analytics') + '</div></div>' +
        '<div class="panel"><div class="panel-body">' + loadingBlock('Loading analytics') + '</div></div>' +
      '</div>' +
    '</div>';

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => dashboardView(root) }]);

  const skel = $('#d-skeleton', root);

  async function load() {
    let d;
    try {
      d = await apiGet('api/dashboard.php');
    } catch (err) {
      if ($('#d-skeleton', root) !== skel) return;
      root.innerHTML = '<div class="view">' + errorState(err.message, 'd-retry') + '</div>';
      const rb = $('[data-d-retry]', root);
      if (rb) rb.addEventListener('click', () => dashboardView(root));
      return;
    }
    if (d.__authError) return;
    if ($('#d-skeleton', root) !== skel) return; /* view changed while loading */

    state.badges.reports = d.unread_reports || 0;
    renderNav();

    const totalUsers = d.total_users || 0;
    const online = d.online_users || 0;
    const onlinePct = totalUsers ? Math.round((online / totalUsers) * 100) : 0;
    const msgs = d.chart_messages_14d || [];
    const regs = d.chart_registrations_14d || [];
    const msgTotal = msgs.reduce((a, b) => a + (Number(b.count) || 0), 0);
    const regTotal = regs.reduce((a, b) => a + (Number(b.count) || 0), 0);
    const lastMsg = msgs.length ? Number(msgs[msgs.length - 1].count) || 0 : 0;
    const prevMsg = msgs.length > 1 ? Number(msgs[msgs.length - 2].count) || 0 : 0;
    const delta = prevMsg ? Math.round(((lastMsg - prevMsg) / prevMsg) * 100) : null;

    const cards = [
      { key: 'Total users', val: totalUsers, ico: 'users', acc: 'var(--grad-primary)', sub: fmtNum(d.active_users || 0) + ' active right now', href: 'users' },
      { key: 'Online now', val: online, ico: 'activity', acc: 'var(--grad-cool)', sub: onlinePct + '% of all accounts' },
      { key: 'Conversations', val: d.total_conversations, ico: 'chat', acc: 'var(--grad-violet)', sub: fmtNum(d.total_groups || 0) + ' of them are groups', href: 'conversations' },
      { key: 'Groups', val: d.total_groups, ico: 'group', acc: 'var(--grad-warm)', sub: 'Shared group chats', href: 'groups' },
      { key: 'Messages', val: d.total_messages, ico: 'message', acc: 'var(--grad-primary)', sub: fmtNum(msgTotal) + ' sent in 14 days', href: 'messages' },
      { key: 'Open reports', val: d.unread_reports, ico: 'flag', acc: 'var(--grad-warm)', sub: 'Awaiting moderation', href: 'reports', alert: (d.unread_reports || 0) > 0 },
    ];

    const recentUsers = (d.recent_users || []).map(u =>
      '<div class="list-item">' +
        avatarHTML(u, 34, '', isOnlineRow(u)) +
        '<div class="li-meta"><b>' + esc(u.full_name || u.username) + '</b>' +
        '<small>@' + esc(u.username) + ' &middot; joined ' + esc(fmtAgo(u.created_at)) + '</small></div>' +
        rolePill(u.role) + statusPill(u.status) +
      '</div>').join('');

    const recentMsgs = (d.recent_messages || []).map(m =>
      '<div class="list-item">' +
        avatarHTML(m.sender, 34) +
        '<div class="li-meta"><b>' + esc(m.sender.full_name || m.sender.username) + '</b>' +
        '<small class="truncate" style="max-width:230px;display:inline-block;vertical-align:bottom">' + esc(m.preview) + '</small></div>' +
        '<span class="pill mute">' + esc(m.conversation.type === 'group' ? (m.conversation.name || 'group') : 'direct') + '</span>' +
        '<span class="tiny muted nowrap">' + esc(fmtAgo(m.created_at)) + '</span>' +
      '</div>').join('');

    const activity = (d.recent_activity || []).map(l =>
      '<div class="feed-item">' +
        '<div class="feed-ico">' + icon('shield', 15) + '</div>' +
        '<div class="feed-body"><b>' + esc(l.admin_full_name || l.admin_username) + '</b>' +
        '<p>' + esc(l.details || logLabel(l.action)) + '</p></div>' +
        '<span class="feed-time">' + esc(fmtAgo(l.created_at)) + '</span>' +
      '</div>').join('');

    root.innerHTML =
      '<div class="view">' +
        '<div class="grid grid-stats" id="d-stats">' +
          cards.map((c, i) =>
            '<div class="stat" style="--acc:' + c.acc + ';animation-delay:' + (i * 45) + 'ms' + (c.href ? ';cursor:pointer' : '') + '"' +
            (c.href ? ' data-goto="' + c.href + '" role="button" tabindex="0"' : '') + '>' +
              '<div class="stat-top"><div class="stat-ico">' + icon(c.ico, 20) + '</div>' +
              (c.alert ? '<span class="pill danger"><i class="dot"></i>action needed</span>' : '') + '</div>' +
              '<div class="stat-val">' + fmtNum(c.val) + '</div>' +
              '<div class="stat-key">' + esc(c.key) + '</div>' +
              '<div class="stat-sub">' + esc(c.sub) + '</div>' +
            '</div>').join('') +
        '</div>' +

        '<div class="grid grid-2 mt-2">' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('message', 17) + '</div>' +
            '<div><h3>Messages sent</h3><p>Last 14 days &middot; ' +
            (delta === null ? 'no day-on-day comparison' : (delta >= 0 ? 'up ' + delta + '% vs yesterday' : 'down ' + Math.abs(delta) + '% vs yesterday')) +
            '</p></div><div class="spacer"></div>' +
            '<span class="pill brand">' + fmtNum(msgTotal) + ' in 14d</span></div>' +
            '<div class="panel-body"><div id="d-chart-msg"></div></div>' +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('userPlus', 17) + '</div>' +
            '<div><h3>New registrations</h3><p>Last 14 days</p></div><div class="spacer"></div>' +
            '<span class="pill ok">' + fmtNum(regTotal) + ' in 14d</span></div>' +
            '<div class="panel-body"><div id="d-chart-reg"></div></div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-2 mt-2">' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('userPlus', 17) + '</div>' +
            '<div><h3>Recent registrations</h3><p>Newest accounts on the platform</p></div><div class="spacer"></div>' +
            (can('users.view') ? '<button class="btn btn-ghost btn-sm" data-goto="users">View all' + icon('chevronR', 14) + '</button>' : '') +
            '</div>' +
            '<div class="panel-body">' +
              (recentUsers ? '<div class="list-plain">' + recentUsers + '</div>' : emptyState({ icon: 'users', title: 'No registrations yet' })) +
            '</div>' +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('activity', 17) + '</div>' +
            '<div><h3>Presence</h3><p>Online in the last 90 seconds</p></div></div>' +
            '<div class="panel-body center">' +
              '<div id="d-donut" style="display:flex;justify-content:center"></div>' +
              '<div class="chart-legend" style="justify-content:center;margin-top:16px">' +
                '<span><i style="background:var(--secondary)"></i>Online (' + fmtNum(online) + ')</span>' +
                '<span><i style="background:var(--surface-highest)"></i>Offline (' + fmtNum(Math.max(0, totalUsers - online)) + ')</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-2 mt-2">' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('message', 17) + '</div>' +
            '<div><h3>Latest messages</h3><p>Newest 10 across the platform</p></div><div class="spacer"></div>' +
            (can('messages.view') ? '<button class="btn btn-ghost btn-sm" data-goto="messages">Moderate' + icon('chevronR', 14) + '</button>' : '') +
            '</div>' +
            '<div class="panel-body">' +
              (recentMsgs ? '<div class="list-plain">' + recentMsgs + '</div>' : emptyState({ icon: 'message', title: 'No messages yet' })) +
            '</div>' +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-head"><div class="ph-ico">' + icon('list', 17) + '</div>' +
            '<div><h3>Recent admin activity</h3><p>Last 15 audited actions</p></div><div class="spacer"></div>' +
            (can('logs.view') ? '<button class="btn btn-ghost btn-sm" data-goto="logs">Full log' + icon('chevronR', 14) + '</button>' : '') +
            '</div>' +
            '<div class="panel-body">' +
              (!can('logs.view')
                ? emptyState({ icon: 'lock', title: 'Audit log restricted', message: 'Your role cannot view administrative activity.' })
                : (activity ? '<div class="feed">' + activity + '</div>' : emptyState({ icon: 'list', title: 'No admin activity yet' }))) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    renderAreaChart($('#d-chart-msg', root), msgs, { color: 'var(--primary-container)', gradId: 'dmsg', label: 'Messages sent per day' });
    renderBarChart($('#d-chart-reg', root), regs, { color: 'var(--secondary)', label: 'New registrations per day' });
    renderDonut($('#d-donut', root),
      [{ label: 'Online', value: online, color: 'var(--secondary)' },
       { label: 'Offline', value: Math.max(0, totalUsers - online), color: 'var(--surface-highest)' }],
      onlinePct + '%', 'ONLINE');

    root.addEventListener('click', e => {
      const g = e.target.closest('[data-goto]');
      if (g) location.hash = '#/' + g.dataset.goto;
    });
  }

  load();
  schedule(load, 60000);
};

/* ================================================================== */
/* USERS                                                               */
/* ================================================================== */

Views.users = function usersView(root) {
  const list = createListView({
    endpoint: 'api/users.php',
    stateKey: 'users',
    emptyIcon: 'users',
    emptyTitle: 'No users found',
    emptyMessage: 'No accounts match the current filters.',
    filters: [
      { type: 'search', placeholder: 'Search name, username or email...' },
      { type: 'select', key: 'status', options: [['', 'All statuses'], ['active', 'Active'], ['suspended', 'Suspended'], ['blocked', 'Blocked']] },
      { type: 'select', key: 'role', options: [['', 'All roles'], ['user', 'User'], ['moderator', 'Moderator'], ['admin', 'Admin'], ['super_admin', 'Super admin']] },
    ],
    columns: [
      { label: 'User', width: '30%' },
      { label: 'Status' },
      { label: 'Role' },
      { label: 'Warnings' },
      { label: 'Last seen' },
      { label: 'Joined' },
    ],
    renderRow: u => {
      const online = isOnlineRow(u);
      return '<tr class="clickable" data-id="' + u.id + '">' +
        '<td><div class="cell-main">' + avatarHTML(u, 36, '', online) +
          '<div style="min-width:0"><b>' + esc(u.full_name || u.username) + '</b>' +
          '<small>@' + esc(u.username) + ' &middot; ' + esc(u.email) + '</small></div>' +
        '</div></td>' +
        '<td>' + statusPill(u.status) +
          (u.status === 'suspended' && u.suspended_until
            ? '<div class="tiny muted" style="margin-top:3px">until ' + esc(fmtDateTime(u.suspended_until)) + '</div>' : '') +
        '</td>' +
        '<td>' + rolePill(u.role) + '</td>' +
        '<td class="num">' + (Number(u.warn_count) > 0
          ? '<span class="pill warn">' + icon('warning', 12) + u.warn_count + '</span>'
          : '<span class="muted tiny">0</span>') + '</td>' +
        '<td class="nowrap small">' + (online
          ? '<span class="pill ok"><i class="dot"></i>online</span>'
          : '<span class="muted">' + esc(fmtAgo(u.last_seen_at)) + '</span>') + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtDate(u.created_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + u.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>';
    },
    rowActions: u => userActions(u),
    onRowClick: u => openUserDetail(u.id),
  });

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => usersView(root) }]);
  list(root);
};

/* ================================================================== */
/* CONVERSATIONS                                                       */
/* ================================================================== */

Views.conversations = function conversationsView(root) {
  const list = createListView({
    endpoint: 'api/conversations.php',
    stateKey: 'conversations',
    emptyIcon: 'chat',
    emptyTitle: 'No conversations',
    emptyMessage: 'No conversations match the current filters.',
    filters: [
      { type: 'search', placeholder: 'Search group or participant name...' },
      { type: 'select', key: 'type', options: [['', 'All types'], ['direct', 'Direct'], ['group', 'Group']] },
    ],
    columns: [
      { label: 'Conversation', width: '30%' },
      { label: 'Type' },
      { label: 'Members' },
      { label: 'Last message', width: '28%' },
      { label: 'Updated' },
    ],
    renderRow: c => {
      const lm = c.last_message;
      return '<tr class="clickable" data-id="' + c.id + '">' +
        '<td><div class="cell-main">' +
          '<span class="avatar rounded" style="width:36px;height:36px;background:var(--surface-high);color:var(--on-surface-variant)">' +
            icon(c.type === 'group' ? 'group' : 'chat', 17) + '</span>' +
          '<div style="min-width:0"><b>' + esc(c.title) + '</b>' +
          '<small>#' + c.id + ' &middot; created by ' + esc(c.created_by_name || 'unknown') + '</small></div>' +
        '</div></td>' +
        '<td>' + typePill(c.type) + '</td>' +
        '<td class="num">' + fmtNum(c.member_count) + '</td>' +
        '<td>' + (lm
          ? '<span class="cell-clip muted small">' + esc(lm.preview) + '</span>' +
            '<div class="tiny muted" style="margin-top:2px">' + esc(lm.sender_name || 'unknown') + ' &middot; ' + esc(fmtAgo(lm.created_at)) + '</div>'
          : '<span class="muted tiny">No messages</span>') + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtAgo(c.updated_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + c.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>';
    },
    rowActions: c => conversationActions(c),
    onRowClick: c => openConversationDetail(c.id),
  });

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => conversationsView(root) }]);
  list(root);
};

function conversationActions(c) {
  const acts = [
    { id: 'view', label: 'View conversation', icon: 'eye', onClick: () => openConversationDetail(c.id) },
    { id: 'msgs', label: 'Browse its messages', icon: 'message', onClick: () => gotoConversationMessages(c.id) },
  ];
  if (can('convs.remove')) {
    acts.push({ sep: true });
    acts.push({ id: 'remove', label: 'Delete conversation', icon: 'trash', danger: true, onClick: () => removeConversation(c) });
  }
  return acts;
}

async function removeConversation(c) {
  const ok = await confirmDialog({
    title: 'Delete this conversation?',
    message: 'Conversation "' + c.title + '" (#' + c.id + ') and all of its messages will be permanently deleted. This cannot be undone.',
    confirmText: 'Delete conversation',
  });
  if (!ok) return;
  try {
    await apiPost('api/conversations.php', { action: 'remove', id: c.id });
    toast('Conversation deleted.', 'success');
  } catch (e) { /* api surfaced it */ }
  reloadView();
}

async function openConversationDetail(id) {
  const w = openModal({ title: 'Loading conversation...', icon: 'chat', size: 'lg', body: loadingBlock('Fetching conversation') });
  let d;
  try {
    d = await apiGet('api/conversations.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load conversation', err.message));
    return;
  }
  if (d.__authError) return;

  const c = d.conversation;
  const members = d.members || [];
  const msgs = d.recent_messages || [];

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon(c.type === 'group' ? 'group' : 'chat', 19) + '</div>' +
        '<div class="mh-meta"><h3>' + esc(c.title) + '</h3>' +
        '<p>Conversation #' + c.id + ' &middot; ' + esc(fmtNum(members.length)) + ' member' + (members.length === 1 ? '' : 's') + '</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row row-wrap mb-2" style="gap:6px">' + typePill(c.type) +
        '<span class="pill mute">' + icon('clock', 12) + 'created ' + esc(fmtDate(c.created_at)) + '</span>' +
        '<span class="pill mute">' + icon('clock', 12) + 'active ' + esc(fmtAgo(c.updated_at)) + '</span></div>' +
        (c.description ? '<div class="quote-box mb-2">' + esc(c.description) + '</div>' : '') +
        '<div class="section-title">' + icon('users', 16) + 'Members</div>' +
        '<div class="list-plain mb-2">' + (members.length ? members.map(m =>
          '<div class="list-item">' + avatarHTML(m, 32, '', isOnlineRow(m)) +
          '<div class="li-meta"><b>' + esc(m.full_name || m.username) + '</b>' +
          '<small>@' + esc(m.username) + ' &middot; joined ' + esc(fmtAgo(m.joined_at)) + '</small></div>' +
          (m.member_role ? '<span class="pill mute">' + esc(m.member_role) + '</span>' : '') +
          statusPill(m.status) + '</div>').join('')
          : '<p class="muted small">No members found.</p>') + '</div>' +

        '<div class="section-title">' + icon('message', 16) + 'Recent messages</div>' +
        (msgs.length ? msgs.map(m =>
          '<div class="msg-row">' + avatarHTML(m, 30) +
          '<div style="flex:1;min-width:0">' +
          '<div class="msg-bubble' + (Number(m.deleted) ? ' deleted' : '') + '">' +
          esc(m.content || (Number(m.deleted) ? 'This message was deleted' : '[' + m.type + ' attachment]')) + '</div>' +
          '<div class="msg-meta"><b>' + esc(m.sender_full_name || m.sender_username) + '</b>' +
          '<span>#' + m.id + '</span><span>' + esc(fmtDateTime(m.created_at)) + '</span>' +
          (Number(m.pinned) ? '<span class="pill brand">' + icon('pin', 11) + 'pinned</span>' : '') + '</div>' +
          '</div></div>').join('')
          : '<p class="muted small">No messages in this conversation.</p>') +
      '</div>' +
      '<div class="modal-foot">' +
        (can('messages.view') ? '<button class="btn btn-ghost btn-sm" data-conv-msgs="' + c.id + '">' + icon('message', 15) + 'Browse messages</button>' : '') +
        (can('convs.remove') ? '<button class="btn btn-danger-soft btn-sm" data-conv-del="' + c.id + '">' + icon('trash', 15) + 'Delete</button>' : '') +
        '<div class="spacer"></div><button class="btn btn-ghost btn-sm" data-close>Close</button>' +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const m = e.target.closest('[data-conv-msgs]');
    if (m) { closeAllModals(); gotoConversationMessages(m.dataset.convMsgs); return; }
    const del = e.target.closest('[data-conv-del]');
    if (del) { closeAllModals(); removeConversation({ id: c.id, title: c.title }); }
  });
}

/* ================================================================== */
/* MESSAGES                                                            */
/* ================================================================== */

Views.messages = function messagesView(root) {
  const list = createListView({
    endpoint: 'api/messages.php',
    stateKey: 'messages',
    emptyIcon: 'message',
    emptyTitle: 'No messages found',
    emptyMessage: 'No messages match the current filters.',
    filters: [
      { type: 'search', placeholder: 'Search message content...' },
      { type: 'select', key: 'deleted', options: [['', 'All messages'], ['0', 'Visible only'], ['1', 'Removed only']] },
    ],
    columns: [
      { label: 'Sender', width: '18%' },
      { label: 'Content', width: '34%' },
      { label: 'Conversation' },
      { label: 'Type' },
      { label: 'Sent' },
    ],
    renderRow: m => {
      const del = Number(m.deleted) === 1;
      return '<tr class="clickable" data-id="' + m.id + '">' +
        '<td><div class="cell-main">' + avatarHTML(m.sender, 32) +
          '<div style="min-width:0"><b>' + esc(m.sender.full_name || m.sender.username) + '</b>' +
          '<small>@' + esc(m.sender.username) + '</small></div></div></td>' +
        '<td><span class="cell-clip' + (del ? ' muted' : '') + '">' + esc(m.content_preview) + '</span>' +
          (Number(m.pinned) ? ' <span class="pill brand">' + icon('pin', 11) + '</span>' : '') +
          (del ? ' <span class="pill danger">removed</span>' : '') + '</td>' +
        '<td><span class="small">' + esc(m.conversation.type === 'group' ? (m.conversation.name || 'Group #' + m.conversation_id) : 'Direct chat') + '</span>' +
          '<div class="tiny muted">#' + m.conversation_id + '</div></td>' +
        '<td>' + msgTypePill(m.type) + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtAgo(m.created_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + m.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>';
    },
    rowActions: m => messageActions(m),
    onRowClick: m => openMessageDetail(m.id),
    extraToolbar: st =>
      '<button class="btn btn-ghost btn-sm" id="lv-adv">' + icon('filter', 15) + 'More filters</button>' +
      '<span class="toolbar-row" id="lv-advrow"' + (st.conversation_id || st.sender_id ? '' : ' hidden') + '>' +
        '<input class="input" id="lv-conv" type="number" min="1" placeholder="Conversation ID" value="' + esc(st.conversation_id) + '" style="max-width:190px">' +
        '<input class="input" id="lv-sender" type="number" min="1" placeholder="Sender user ID" value="' + esc(st.sender_id) + '" style="max-width:190px">' +
        '<button class="btn btn-ghost btn-sm" id="lv-advapply">' + icon('check', 15) + 'Apply</button>' +
      '</span>',
    wireExtra: (st, ctx) => {
      const row = $('#lv-advrow', ctx.root) || $('.toolbar-row', ctx.root);
      const btn = $('#lv-adv', ctx.root);
      if (btn) btn.addEventListener('click', () => { if (row) row.hidden = !row.hidden; });
      const apply = $('#lv-advapply', ctx.root);
      if (apply) {
        apply.addEventListener('click', () => {
          const conv = $('#lv-conv', ctx.root);
          const snd = $('#lv-sender', ctx.root);
          st.conversation_id = conv ? conv.value.trim() : '';
          st.sender_id = snd ? snd.value.trim() : '';
          st.page = 1;
          ctx.load();
        });
      }
    },
    chips: st => chipRow([
      st.conversation_id ? { key: 'conversation_id', label: 'conversation #' + st.conversation_id } : null,
      st.sender_id ? { key: 'sender_id', label: 'sender #' + st.sender_id } : null,
      st.deleted ? { key: 'deleted', label: st.deleted === '1' ? 'removed only' : 'visible only' } : null,
    ].filter(Boolean)),
  });

  /* chips are rendered before the table, so bind them once after paint */
  const origMount = list;
  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => messagesView(root) }]);
  origMount(root);
  wireChips(root, null, (key) => {
    const st = state.search.messages;
    st[key] = '';
    st.page = 1;
    messagesView(root);
  });
};

function messageActions(m) {
  const acts = [{ id: 'view', label: 'View message details', icon: 'eye', onClick: () => openMessageDetail(m.id) }];
  acts.push({ id: 'sender', label: 'Messages by this sender', icon: 'users', onClick: () => gotoUserMessages(m.sender_id) });
  if (can('messages.remove')) {
    acts.push({ sep: true });
    if (Number(m.deleted) === 1) {
      acts.push({ id: 'restore', label: 'Restore message', icon: 'restore', onClick: () => setMessageRemoved(m, false) });
    } else {
      acts.push({ id: 'remove', label: 'Remove message', icon: 'trash', danger: true, onClick: () => setMessageRemoved(m, true) });
    }
  }
  return acts;
}

async function setMessageRemoved(m, remove) {
  const ok = await confirmDialog({
    title: remove ? 'Remove this message?' : 'Restore this message?',
    message: remove
      ? 'Message #' + m.id + ' will be marked as deleted for every participant. The content stays in the database and the action is audited.'
      : 'Message #' + m.id + ' will become visible to participants again.',
    confirmText: remove ? 'Remove message' : 'Restore message',
    icon: remove ? 'trash' : 'restore',
    danger: remove,
  });
  if (!ok) return;
  try {
    await apiPost('api/messages.php', { action: remove ? 'remove' : 'restore', id: m.id });
    toast(remove ? 'Message removed.' : 'Message restored.', 'success');
  } catch (e) { /* api surfaced it */ }
  reloadView();
}

async function openMessageDetail(id) {
  const w = openModal({ title: 'Loading message...', icon: 'message', size: 'lg', body: loadingBlock('Fetching message metadata') });
  let d;
  try {
    d = await apiGet('api/messages.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load message', err.message));
    return;
  }
  if (d.__authError) return;

  const m = d.message;
  const s = d.sender;
  const c = d.conversation;
  const att = d.attachment;
  const reply = d.reply_to;
  const readBy = d.read_by || [];
  const del = Number(m.deleted) === 1;

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon('message', 19) + '</div>' +
        '<div class="mh-meta"><h3>Message #' + m.id + '</h3>' +
        '<p>Sent ' + esc(fmtDateTime(m.created_at)) + ' &middot; ' + esc(fmtAgo(m.created_at)) + '</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row mb-2" style="gap:11px">' + avatarHTML(s, 40) +
        '<div style="flex:1;min-width:0"><b>' + esc(s.full_name || s.username) + '</b>' +
        '<div class="tiny muted">@' + esc(s.username) + ' &middot; user #' + s.id + '</div></div>' +
        msgTypePill(m.type) +
        (del ? statusPill('blocked') : '') +
        (Number(m.pinned) ? '<span class="pill brand">' + icon('pin', 12) + 'pinned</span>' : '') +
        '</div>' +

        '<div class="quote-box' + (del ? ' deleted' : '') + '">' +
        esc(del ? 'This message was deleted' : (m.content || '[' + m.type + ' attachment, no text content]')) + '</div>' +
        (del ? '<div class="tiny muted mt-1">Removed ' + esc(fmtDateTime(m.deleted_at)) + '</div>' : '') +

        (reply
          ? '<div class="section-title mt-2">' + icon('replyArrow' in PATHS ? 'replyArrow' : 'link', 16) + 'Reply to #' + reply.id + '</div>' +
            '<div class="quote-box"><b>' + esc(reply.sender.full_name || reply.sender.username) + '</b><br>' +
            esc(Number(reply.deleted) ? 'This message was deleted' : (reply.content || '[' + reply.type + ']')) + '</div>'
          : '') +

        (att
          ? '<div class="section-title mt-2">' + icon('paperclip' in PATHS ? 'paperclip' : 'link', 16) + 'Attachment</div>' +
            '<dl class="deflist"><dt>File name</dt><dd>' + esc(att.original_name) + '</dd>' +
            '<dt>Type</dt><dd>' + esc(att.mime_type) + '</dd>' +
            '<dt>Size</dt><dd>' + esc(fmtSize(att.size)) + '</dd>' +
            '<dt>Path</dt><dd class="mono">' + esc(att.url_path) + '</dd></dl>'
          : '') +

        '<div class="section-title mt-2">' + icon('info', 16) + 'Metadata</div>' +
        '<dl class="deflist">' +
          '<dt>Conversation</dt><dd>' + esc(c.type === 'group' ? (c.name || 'Group #' + c.id) : 'Direct chat') +
            ' <span class="muted tiny">(#' + c.id + ')</span></dd>' +
          '<dt>Message ID</dt><dd class="mono">' + m.id + '</dd>' +
          '<dt>Type</dt><dd>' + esc(m.type) + '</dd>' +
          (m.reply_to ? '<dt>Reply to</dt><dd class="mono">#' + m.reply_to + '</dd>' : '') +
          '<dt>Sent</dt><dd>' + esc(fmtDateTime(m.created_at)) + '</dd>' +
          '<dt>Read by</dt><dd>' + (readBy.length ? readBy.length + ' participant' + (readBy.length === 1 ? '' : 's') : 'nobody yet') + '</dd>' +
        '</dl>' +

        (readBy.length
          ? '<div class="section-title mt-2">' + icon('userCheck', 16) + 'Read receipts</div>' +
            '<div class="list-plain">' + readBy.map(r =>
              '<div class="list-item">' + avatarHTML(r, 28) +
              '<div class="li-meta"><b>' + esc(r.full_name || r.username) + '</b>' +
              '<small>@' + esc(r.username) + ' &middot; ' + esc(fmtAgo(r.read_at)) + '</small></div></div>').join('') + '</div>'
          : '') +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn btn-ghost btn-sm" data-msg-sender="' + s.id + '">' + icon('users', 15) + 'All their messages</button>' +
        (can('messages.view') ? '<button class="btn btn-ghost btn-sm" data-msg-conv="' + c.id + '">' + icon('chat', 15) + 'Conversation messages</button>' : '') +
        (can('messages.remove')
          ? (del
              ? '<button class="btn btn-ghost btn-sm" data-msg-restore="' + m.id + '">' + icon('restore', 15) + 'Restore</button>'
              : '<button class="btn btn-danger-soft btn-sm" data-msg-remove="' + m.id + '">' + icon('trash', 15) + 'Remove</button>')
          : '') +
        '<div class="spacer"></div><button class="btn btn-ghost btn-sm" data-close>Close</button>' +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const a = e.target.closest('[data-msg-sender]');
    if (a) { closeAllModals(); gotoUserMessages(a.dataset.msgSender); return; }
    const b = e.target.closest('[data-msg-conv]');
    if (b) { closeAllModals(); gotoConversationMessages(b.dataset.msgConv); return; }
    const r = e.target.closest('[data-msg-remove]');
    if (r) { closeAllModals(); setMessageRemoved({ id: m.id }, true); return; }
    const rs = e.target.closest('[data-msg-restore]');
    if (rs) { closeAllModals(); setMessageRemoved({ id: m.id }, false); }
  });
}
