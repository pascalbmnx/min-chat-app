/* ==================================================================
   Pulse Chat - Admin Dashboard
   views2.js - groups, reports, announcements
   ================================================================== */
'use strict';

/* ================================================================== */
/* GROUPS                                                              */
/* ================================================================== */

Views.groups = function groupsView(root) {
  const list = createListView({
    endpoint: 'api/groups.php',
    stateKey: 'groups',
    emptyIcon: 'group',
    emptyTitle: 'No groups found',
    emptyMessage: 'No group conversations exist yet.',
    filters: [{ type: 'search', placeholder: 'Search group names...' }],
    columns: [
      { label: 'Group', width: '38%' },
      { label: 'Members' },
      { label: 'Created by' },
      { label: 'Last activity' },
    ],
    renderRow: g => {
      const photo = g.photo
        ? '<span class="avatar" style="width:36px;height:36px;background-image:url(' + esc(g.photo) + ');background-size:cover;background-position:center"></span>'
        : '<span class="avatar rounded" style="width:36px;height:36px;background:var(--surface-high);color:var(--on-surface-variant)">' + icon('group', 17) + '</span>';
      return '<tr class="clickable" data-id="' + g.id + '">' +
        '<td><div class="cell-main">' + photo +
          '<div style="min-width:0"><b>' + esc(g.name || 'Untitled group') + '</b>' +
          '<small>#' + g.id + (g.description ? ' &middot; ' + esc(g.description) : '') + '</small></div>' +
        '</div></td>' +
        '<td class="num">' + fmtNum(g.member_count) + '</td>' +
        '<td class="small">' + esc(g.created_by_name || 'unknown') + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtAgo(g.updated_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + g.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>';
    },
    rowActions: g => groupActions(g),
    onRowClick: g => openGroupDetail(g.id),
  });

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => groupsView(root) }]);
  list(root);
};

function groupActions(g) {
  const acts = [
    { id: 'view', label: 'View group', icon: 'eye', onClick: () => openGroupDetail(g.id) },
    { id: 'msgs', label: 'Browse its messages', icon: 'message', onClick: () => gotoConversationMessages(g.id) },
  ];
  if (can('groups.remove')) {
    acts.push({ sep: true });
    acts.push({ id: 'remove', label: 'Delete group', icon: 'trash', danger: true, onClick: () => removeGroup(g) });
  }
  return acts;
}

async function removeGroup(g) {
  const ok = await confirmDialog({
    title: 'Delete this group?',
    message: '"' + (g.name || 'Untitled group') + '" (#' + g.id + ') and all of its messages will be permanently removed. This cannot be undone.',
    confirmText: 'Delete group',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/groups.php', { action: 'remove_group', id: g.id });
    toast('Group deleted.', 'success');
  } catch (e) { /* surfaced */ }
  reloadView();
}

async function removeGroupMember(group, user) {
  const ok = await confirmDialog({
    title: 'Remove this member?',
    message: String(user.full_name || user.username) + ' will lose access to "' + String(group.name || 'this group') +
      '" immediately. Their message history stays in the database.',
    confirmText: 'Remove member',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/groups.php', { action: 'remove_member', group_id: group.id, user_id: user.id });
    toast('Member removed from group.', 'success');
  } catch (e) { /* surfaced */ }
  closeAllModals();
  openGroupDetail(group.id);
}

async function openGroupDetail(id) {
  const w = openModal({ title: 'Loading group...', icon: 'group', size: 'lg', body: loadingBlock('Fetching group') });
  let d;
  try {
    d = await apiGet('api/groups.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load group', err.message));
    return;
  }
  if (d.__authError) return;

  const g = d.group;
  const members = d.members || [];
  const creator = g.creator || {};
  const photo = g.photo
    ? '<span class="avatar" style="width:52px;height:52px;background-image:url(' + esc(g.photo) + ');background-size:cover;background-position:center"></span>'
    : '<span class="avatar rounded" style="width:52px;height:52px;background:var(--surface-high);color:var(--on-surface-variant)">' + icon('group', 24) + '</span>';

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon('group', 19) + '</div>' +
        '<div class="mh-meta"><h3>' + esc(g.name || 'Untitled group') + '</h3>' +
        '<p>Group #' + g.id + ' &middot; ' + fmtNum(members.length) + ' members</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row mb-2" style="gap:13px">' + photo +
        '<div style="flex:1;min-width:0">' +
          '<div class="row row-wrap" style="gap:6px">' +
            '<span class="pill mute">' + icon('users', 12) + fmtNum(members.length) + ' members</span>' +
            '<span class="pill mute">' + icon('message', 12) + fmtNum(d.message_count) + ' messages</span>' +
            '<span class="pill mute">' + icon('clock', 12) + 'active ' + esc(fmtAgo(g.updated_at)) + '</span>' +
          '</div>' +
          (g.description ? '<p class="small muted" style="margin:8px 0 0">' + esc(g.description) + '</p>' : '') +
        '</div></div>' +
        '<dl class="deflist">' +
          '<dt>Created by</dt><dd>' + esc(creator.full_name || creator.username || 'unknown') +
            (creator.username ? ' <span class="muted tiny">@' + esc(creator.username) + '</span>' : '') + '</dd>' +
          '<dt>Created</dt><dd>' + esc(fmtDateTime(g.created_at)) + '</dd>' +
        '</dl>' +
        '<div class="section-title mt-2">' + icon('users', 16) + 'Members' +
          (can('groups.members_remove') ? '<span class="tiny muted" style="font-weight:400;margin-left:6px">owners cannot be removed by you</span>' : '') +
        '</div>' +
        '<div class="list-plain">' + (members.length ? members.map(m =>
          '<div class="list-item">' + avatarHTML(m, 34, '', isOnlineRow(m)) +
            '<div class="li-meta"><b>' + esc(m.full_name || m.username) + '</b>' +
            '<small>@' + esc(m.username) + ' &middot; joined ' + esc(fmtAgo(m.joined_at)) + '</small></div>' +
            (m.member_role === 'owner' ? '<span class="pill brand">' + icon('crown', 12) + 'owner</span>' : '') +
            statusPill(m.status) +
            (can('groups.members_remove') && m.member_role !== 'owner'
              ? '<button class="icon-act" data-rm-member="' + m.id + '" title="Remove member" aria-label="Remove member">' + icon('userMinus', 15) + '</button>'
              : '') +
          '</div>').join('')
          : '<p class="muted small">No members found.</p>') + '</div>' +
      '</div>' +
      '<div class="modal-foot">' +
        (can('messages.view') ? '<button class="btn btn-ghost btn-sm" data-g-msgs="' + g.id + '">' + icon('message', 15) + 'Browse messages</button>' : '') +
        (can('groups.remove') ? '<button class="btn btn-danger-soft btn-sm" data-g-del="' + g.id + '">' + icon('trash', 15) + 'Delete group</button>' : '') +
        '<div class="spacer"></div><button class="btn btn-ghost btn-sm" data-close>Close</button>' +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const m = e.target.closest('[data-rm-member]');
    if (m) {
      const uid = Number(m.dataset.rmMember);
      const user = members.find(x => String(x.id) === String(uid)) || { id: uid };
      removeGroupMember(g, user);
      return;
    }
    const b = e.target.closest('[data-g-msgs]');
    if (b) { closeAllModals(); gotoConversationMessages(b.dataset.gMsgs); return; }
    const del = e.target.closest('[data-g-del]');
    if (del) { closeAllModals(); removeGroup({ id: g.id, name: g.name }); }
  });
}

/* ================================================================== */
/* REPORTS                                                             */
/* ================================================================== */

const REPORT_STATUS = {
  open:      { cls: 'warn',   label: 'Open' },
  in_review: { cls: 'brand',  label: 'In review' },
  resolved:  { cls: 'ok',     label: 'Resolved' },
  rejected:  { cls: 'mute',   label: 'Rejected' },
};

const REPORT_TYPES = ['user', 'message', 'group', 'profile', 'other'];

function reportStatusPill(s) {
  const m = REPORT_STATUS[s] || { cls: 'mute', label: s || 'unknown' };
  return '<span class="pill ' + m.cls + '">' + esc(m.label) + '</span>';
}

function reportTargetLabel(r) {
  if (r.target_user) return '@' + (r.target_user.username || 'user');
  if (r.target_message) return 'message #' + r.target_message.id;
  if (r.target_conversation) return (r.target_conversation.name || 'group') + ' #' + r.target_conversation.id;
  return 'unknown target';
}

Views.reports = function reportsView(root) {
  const list = createListView({
    endpoint: 'api/reports.php',
    stateKey: 'reports',
    emptyIcon: 'flag',
    emptyTitle: 'No reports',
    emptyMessage: 'There are no reports to review right now. Nice and quiet.',
    filters: [
      { type: 'select', key: 'status', options:
        [['', 'All statuses'], ['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['rejected', 'Rejected']] },
      { type: 'select', key: 'target_type', options: [['', 'All targets']].concat(REPORT_TYPES.map(t => [t, t.charAt(0).toUpperCase() + t.slice(1)])) },
    ],
    columns: [
      { label: 'Report', width: '30%' },
      { label: 'Target' },
      { label: 'Status' },
      { label: 'Assignee' },
      { label: 'Filed' },
    ],
    renderRow: r => {
      const reporter = r.reporter || {};
      return '<tr class="clickable" data-id="' + r.id + '">' +
        '<td><div class="cell-main">' + avatarHTML(reporter, 34) +
          '<div style="min-width:0"><b>#' + r.id + ' &middot; ' + esc(r.category || 'other') + '</b>' +
          '<small>by ' + esc(reporter.full_name || reporter.username) + '</small>' +
          '<div class="tiny muted clamp-1">' + esc(r.details || '') + '</div></div></div></td>' +
        '<td>' + catPill(r.target_type) + '<div class="tiny muted" style="margin-top:3px">' + esc(reportTargetLabel(r)) + '</div></td>' +
        '<td>' + reportStatusPill(r.status) + '</td>' +
        '<td class="small">' + (r.assignee ? esc(r.assignee.full_name || r.assignee.username) : '<span class="muted tiny">unassigned</span>') + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtAgo(r.created_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + r.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>';
    },
    rowActions: r => reportActions(r),
    onRowClick: r => openReportDetail(r.id),
    chips: st => chipRow([
      st.status ? { key: 'status', label: REPORT_STATUS[st.status] ? REPORT_STATUS[st.status].label.toLowerCase() : st.status } : null,
      st.target_type ? { key: 'target_type', label: st.target_type } : null,
    ].filter(Boolean)),
  });

  setTopbarActions([{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => reportsView(root) }]);
  list(root);
  wireChips(root, null, key => {
    const st = state.search.reports;
    st[key] = '';
    st.page = 1;
    reportsView(root);
  });
};

function reportActions(r) {
  const acts = [{ id: 'view', label: 'Review report', icon: 'eye', onClick: () => openReportDetail(r.id) }];
  if (!can('reports.handle')) return acts;
  const closed = r.status === 'resolved' || r.status === 'rejected';
  if (!closed) {
    acts.push({ id: 'assign', label: 'Assign to me', icon: 'userCheck', onClick: () => reportAction(r, 'assign', 'Assign report to yourself?') });
  }
  if (r.target_message) {
    acts.push({ id: 'msg', label: 'Open reported message', icon: 'message', onClick: () => openMessageDetail(r.target_message.id) });
    acts.push({ id: 'remove_msg', label: 'Remove reported message', icon: 'trash', danger: true, hidden: closed,
      onClick: () => reportAction(r, 'action_remove_message', 'Remove the reported message and resolve this report?') });
  }
  if (r.target_user) {
    acts.push({ id: 'user', label: 'Open reported user', icon: 'user', onClick: () => openUserDetail(r.target_user.id) });
    acts.push({ id: 'suspend', label: 'Suspend reported user', icon: 'clock', danger: true, hidden: closed,
      onClick: () => reportSuspendUser(r) });
  }
  if (closed) return acts;
  acts.push({ sep: true });
  acts.push({ id: 'resolve', label: 'Resolve report', icon: 'check', onClick: () => openReportResolve(r, 'resolve') });
  acts.push({ id: 'reject', label: 'Reject report', icon: 'x', danger: true, onClick: () => openReportResolve(r, 'reject') });
  return acts;
}

async function reportAction(r, action, question) {
  const ok = await confirmDialog({ title: question, message: 'Report #' + r.id + ' will be updated and the action will be recorded in the audit log.', confirmText: 'Confirm', danger: true });
  if (!ok) return;
  try {
    await apiPost('api/reports.php', { action: action, id: r.id });
    toast('Report updated.', 'success');
  } catch (e) { /* surfaced */ }
  closeAllModals();
  reloadView();
}

function openReportResolve(r, mode) {
  const title = mode === 'resolve' ? 'Resolve report' : 'Reject report';
  const body =
    '<div class="field"><label>Moderator note (optional)</label>' +
    '<div class="field-inner"><textarea id="rr-note" rows="4" placeholder="Add context for the audit log..."></textarea></div></div>';

  openModal({
    title: title,
    icon: mode === 'resolve' ? 'check' : 'x',
    body: '<p class="small muted mb-2">Report #' + r.id + ' filed by @' + esc(r.reporter.username) +
      ' about <b>' + esc(reportTargetLabel(r)) + '</b>.</p>' + body,
    confirmText: mode === 'resolve' ? 'Resolve' : 'Reject',
    danger: mode !== 'resolve',
    onConfirm: async (btn, wrap) => {
      setLoading(btn, true);
      try {
        await apiPost('api/reports.php', { action: mode, id: r.id, note: $('#rr-note', wrap).value.trim() });
        toast('Report ' + mode + 'd.', 'success');
        closeAllModals();
        reloadView();
      } catch (e) {
        setLoading(btn, false);
      }
    },
  });
}

async function reportSuspendUser(r) {
  const ok = await confirmDialog({
    title: 'Suspend the reported user?',
    message: '@' + r.target_user.username + ' will be suspended indefinitely and report #' + r.id + ' will be resolved.',
    confirmText: 'Suspend user',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/reports.php', {
      action: 'action_suspend_user', id: r.id,
      reason: 'Suspended after report #' + r.id + ' (' + (r.category || 'other') + ')',
      suspended_until: null,
    });
    toast('User suspended and report resolved.', 'success');
  } catch (e) { /* surfaced */ }
  closeAllModals();
  reloadView();
}

async function openReportDetail(id) {
  const w = openModal({ title: 'Loading report...', icon: 'flag', size: 'lg', body: loadingBlock('Fetching report') });
  let d;
  try {
    d = await apiGet('api/reports.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load report', err.message));
    return;
  }
  if (d.__authError) return;

  const r = d.report;
  const target = d.target || {};
  const closed = r.status === 'resolved' || r.status === 'rejected';
  const notes = (r.moderation_note || '').trim();

  let targetBlock = '';
  if (target.user) {
    const u = target.user;
    targetBlock =
      '<div class="row mb-2" style="gap:11px">' + avatarHTML(u, 40) +
      '<div style="flex:1;min-width:0"><b>' + esc(u.full_name || u.username) + '</b>' +
      '<div class="tiny muted">@' + esc(u.username) + ' &middot; user #' + u.id + '</div></div>' +
      rolePill(u.role) + statusPill(u.status) +
      (Number(u.warn_count) > 0 ? '<span class="pill warn">' + icon('warning', 12) + u.warn_count + '</span>' : '') +
      '</div>';
  } else if (target.message) {
    const m = target.message;
    const conv = m.conversation || {};
    targetBlock =
      '<div class="row mb-2" style="gap:11px">' +
      '<span class="avatar rounded" style="width:40px;height:40px;background:var(--surface-high);color:var(--on-surface-variant)">' + icon('message', 18) + '</span>' +
      '<div style="flex:1;min-width:0"><b>Message #' + m.id + '</b>' +
      '<div class="tiny muted">' + esc(conv.name || 'conversation #' + (m.conversation_id || '?')) + ' &middot; ' + esc(m.type) + '</div></div>' +
      msgTypePill(m.type) +
      (Number(m.deleted) ? statusPill('blocked') : '') + '</div>' +
      '<div class="quote-box' + (Number(m.deleted) ? ' deleted' : '') + '">' +
      esc(Number(m.deleted) ? 'This message was deleted' : (m.content_preview || m.content || 'no content')) + '</div>';
  } else if (target.group) {
    const g = target.group;
    targetBlock =
      '<div class="row mb-2" style="gap:11px">' +
      '<span class="avatar rounded" style="width:40px;height:40px;background:var(--surface-high);color:var(--on-surface-variant)">' + icon('group', 18) + '</span>' +
      '<div style="flex:1;min-width:0"><b>' + esc(g.name || 'Untitled group') + '</b>' +
      '<div class="tiny muted">#' + g.id + ' &middot; ' + fmtNum(g.member_count) + ' members</div></div>' +
      typePill(g.type) + '</div>';
  }

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon('flag', 19) + '</div>' +
        '<div class="mh-meta"><h3>Report #' + r.id + '</h3>' +
        '<p>Filed ' + esc(fmtDateTime(r.created_at)) + ' by @' + esc(r.reporter.username) + '</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row row-wrap mb-2" style="gap:6px">' +
          reportStatusPill(r.status) + catPill(r.target_type) +
          '<span class="pill mute">' + icon('clock', 12) + esc(fmtAgo(r.created_at)) + '</span>' +
          (r.assignee ? '<span class="pill brand">' + icon('userCheck', 12) + esc(r.assignee.full_name || r.assignee.username) + '</span>' : '') +
          (r.resolved_by ? '<span class="pill ok">' + icon('check', 12) + 'by ' + esc(r.resolved_by.username) + '</span>' : '') +
        '</div>' +

        '<div class="section-title">' + icon('target', 16) + 'Reported content</div>' +
        '<div class="quote-box mb-2">' + esc(r.details || 'No description was provided.') + '</div>' +
        targetBlock +

        (notes
          ? '<div class="section-title mt-2">' + icon('note', 16) + 'Moderation log</div>' +
            '<pre class="pre-box">' + esc(notes) + '</pre>'
          : '') +

        (r.resolved_at ? '<p class="tiny muted mt-2">Closed ' + esc(fmtDateTime(r.resolved_at)) + '.</p>' : '') +
      '</div>' +
      '<div class="modal-foot">' +
        (can('reports.handle')
          ? (closed
              ? ''
              : '<button class="btn btn-ghost btn-sm" data-r-assign="' + r.id + '">' + icon('userCheck', 15) + 'Assign to me</button>' +
                (target.message ? '<button class="btn btn-danger-soft btn-sm" data-r-rmmsg="' + r.id + '">' + icon('trash', 15) + 'Remove message</button>' : '') +
                (target.user ? '<button class="btn btn-danger-soft btn-sm" data-r-suspend="' + r.id + '">' + icon('clock', 15) + 'Suspend user</button>' : ''))
          : '<span class="tiny muted">' + icon('lock', 13) + 'Your role can view but not handle reports</span>') +
        (target.user ? '<button class="btn btn-ghost btn-sm" data-r-user="' + (target.user.id) + '">' + icon('user', 15) + 'Open user</button>' : '') +
        (target.message ? '<button class="btn btn-ghost btn-sm" data-r-msg="' + (target.message.id) + '">' + icon('message', 15) + 'Open message</button>' : '') +
        '<div class="spacer"></div>' +
        (can('reports.handle') && !closed
          ? '<button class="btn btn-ghost btn-sm" data-r-reject="' + r.id + '">Reject</button>' +
            '<button class="btn btn-primary btn-sm" data-r-resolve="' + r.id + '">' + icon('check', 15) + 'Resolve</button>'
          : '<button class="btn btn-ghost btn-sm" data-close>Close</button>') +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const as = e.target.closest('[data-r-assign]');
    if (as) { reportAction(r, 'assign', 'Assign this report to yourself?'); return; }
    const rm = e.target.closest('[data-r-rmmsg]');
    if (rm) { reportAction(r, 'action_remove_message', 'Remove the reported message and resolve this report?'); return; }
    const su = e.target.closest('[data-r-suspend]');
    if (su) { closeAllModals(); reportSuspendUser(r); return; }
    const rs = e.target.closest('[data-r-resolve]');
    if (rs) { closeAllModals(); openReportResolve(r, 'resolve'); return; }
    const rj = e.target.closest('[data-r-reject]');
    if (rj) { closeAllModals(); openReportResolve(r, 'reject'); return; }
    const u = e.target.closest('[data-r-user]');
    if (u) { closeAllModals(); openUserDetail(u.dataset.rUser); return; }
    const m = e.target.closest('[data-r-msg]');
    if (m) { closeAllModals(); openMessageDetail(m.dataset.rMsg); }
  });
}

/* ================================================================== */
/* ANNOUNCEMENTS                                                       */
/* ================================================================== */

const ANN_STATUS = {
  draft:     { cls: 'mute',   label: 'Draft' },
  scheduled: { cls: 'brand',  label: 'Scheduled' },
  sent:      { cls: 'ok',     label: 'Sent' },
  cancelled: { cls: 'danger', label: 'Cancelled' },
};

function annStatusPill(s) {
  const m = ANN_STATUS[s] || { cls: 'mute', label: s || 'unknown' };
  return '<span class="pill ' + m.cls + '">' + esc(m.label) + '</span>';
}

function annTargetLabel(a) {
  if (a.target_type === 'all') return 'Everyone';
  if (a.target_type === 'role') return 'Role: ' + (a.target_value || '?');
  return 'User #' + (a.target_value || '?');
}

Views.announcements = function announcementsView(root) {
  const actions = [{ id: 'refresh', label: 'Refresh', icon: 'refresh', onClick: () => announcementsView(root) }];
  if (can('announcements.create')) {
    actions.push({ id: 'new', label: 'New announcement', icon: 'plus', primary: true, onClick: () => openAnnouncementComposer() });
  }
  setTopbarActions(actions);

  const list = createListView({
    endpoint: 'api/announcements.php',
    stateKey: 'announcements',
    emptyIcon: 'bell',
    emptyTitle: 'No announcements yet',
    emptyMessage: 'Publish an announcement to notify your users.',
    filters: [
      { type: 'select', key: 'status', options:
        [['', 'All statuses'], ['draft', 'Draft'], ['scheduled', 'Scheduled'], ['sent', 'Sent'], ['cancelled', 'Cancelled']] },
    ],
    columns: [
      { label: 'Announcement', width: '36%' },
      { label: 'Audience' },
      { label: 'Status' },
      { label: 'Reach' },
      { label: 'Created' },
    ],
    renderRow: a =>
      '<tr class="clickable" data-id="' + a.id + '">' +
        '<td><div style="min-width:0"><b>' + esc(a.title) + '</b>' +
          '<small class="clamp-1">' + esc(a.body || '') + '</small></div></td>' +
        '<td class="small">' + esc(annTargetLabel(a)) + '</td>' +
        '<td>' + annStatusPill(a.status) +
          (a.status === 'scheduled' && a.scheduled_at
            ? '<div class="tiny muted" style="margin-top:3px">' + esc(fmtDateTime(a.scheduled_at)) + '</div>' : '') + '</td>' +
        '<td class="small">' + (a.status === 'sent'
          ? fmtNum(a.delivered_count) + ' <span class="muted tiny">/ ' + fmtNum(a.read_count) + ' read</span>'
          : '<span class="muted tiny">-</span>') + '</td>' +
        '<td class="nowrap small muted">' + esc(fmtAgo(a.created_at)) + '</td>' +
        '<td class="actions"><button class="icon-act" data-menu="' + a.id + '" aria-label="Actions">' + icon('dots', 16) + '</button></td>' +
      '</tr>',
    rowActions: a => announcementActions(a),
    onRowClick: a => openAnnouncementDetail(a.id),
    chips: st => chipRow(st.status ? [{ key: 'status', label: (ANN_STATUS[st.status] || {}).label || st.status }] : []),
  });

  list(root);
  wireChips(root, null, key => {
    const st = state.search.announcements;
    st[key] = '';
    st.page = 1;
    announcementsView(root);
  });
};

function announcementActions(a) {
  const acts = [{ id: 'view', label: 'View announcement', icon: 'eye', onClick: () => openAnnouncementDetail(a.id) }];
  if (a.status === 'sent' && can('announcements.send')) {
    acts.push({ id: 'resend', label: 'Send again', icon: 'send', onClick: () => sendAnnouncement(a, true) });
  }
  if (a.status === 'draft' || a.status === 'scheduled') {
    if (can('announcements.send')) acts.push({ id: 'send', label: 'Send now', icon: 'send', onClick: () => sendAnnouncement(a, false) });
    if (a.status === 'scheduled' && can('announcements.send')) acts.push({ id: 'cancel', label: 'Cancel schedule', icon: 'x', danger: true, onClick: () => cancelAnnouncement(a) });
    if (a.status === 'draft' && can('announcements.create')) acts.push({ id: 'edit', label: 'Edit', icon: 'edit', onClick: () => openAnnouncementComposer(a) });
  }
  if (can('announcements.delete')) {
    acts.push({ sep: true });
    acts.push({ id: 'delete', label: 'Delete announcement', icon: 'trash', danger: true, onClick: () => deleteAnnouncement(a) });
  }
  return acts;
}

async function sendAnnouncement(a, isResend) {
  const ok = await confirmDialog({
    title: isResend ? 'Send this announcement again?' : 'Send this announcement now?',
    message: '"' + a.title + '" will be delivered to ' + annTargetLabel(a).toLowerCase() + ' immediately. Every recipient gets a notification.',
    confirmText: 'Send now',
    danger: isResend,
  });
  if (!ok) return;
  try {
    const r = await apiPost('api/announcements.php', { action: 'send', id: a.id });
    toast('Sent to ' + fmtNum((r && r.delivered) || 0) + ' user' + (((r && r.delivered) || 0) === 1 ? '' : 's') + '.', 'success');
  } catch (e) { /* surfaced */ }
  reloadView();
}

async function cancelAnnouncement(a) {
  const ok = await confirmDialog({
    title: 'Cancel this scheduled announcement?',
    message: '"' + a.title + '" will no longer be sent. You can publish it again later.',
    confirmText: 'Cancel schedule',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/announcements.php', { action: 'cancel', id: a.id });
    toast('Scheduled announcement cancelled.', 'success');
  } catch (e) { /* surfaced */ }
  reloadView();
}

async function deleteAnnouncement(a) {
  const ok = await confirmDialog({
    title: 'Delete this announcement?',
    message: '"' + a.title + '" will be removed permanently along with its delivery records.',
    confirmText: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    await apiPost('api/announcements.php', { action: 'delete', id: a.id });
    toast('Announcement deleted.', 'success');
  } catch (e) { /* surfaced */ }
  reloadView();
}

function openAnnouncementComposer(existing) {
  const roles = [['all', 'Everyone'], ['role', 'A role'], ['user', 'A single user']];
  const roleOptions = [['user', 'User'], ['moderator', 'Moderator'], ['admin', 'Admin'], ['super_admin', 'Super admin']];

  openModal({
    title: existing ? 'Edit announcement' : 'New announcement',
    icon: 'bell',
    size: 'lg',
    body:
      '<div class="field"><label>Title</label>' +
        '<div class="field-inner"><input id="an-title" maxlength="150" value="' + esc(existing ? existing.title : '') + '" placeholder="Short, clear headline"></div></div>' +
      '<div class="field"><label>Message</label>' +
        '<div class="field-inner"><textarea id="an-body" rows="5" maxlength="1000" placeholder="What should your users know?">' + esc(existing ? existing.body : '') + '</textarea></div>' +
        '<small class="tiny muted">Sent as a notification to every recipient.</small></div>' +
      '<div class="row row-wrap" style="gap:12px">' +
        '<div class="field" style="flex:1;min-width:180px"><label>Audience</label>' +
          '<span class="select-wrap"><select class="input" id="an-ttype">' +
          roles.map(r => '<option value="' + r[0] + '"' + (existing && existing.target_type === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') +
          '</select>' + icon('arrowDown', 15) + '</span></div>' +
        '<div class="field" style="flex:1;min-width:180px"><label>Target</label>' +
          '<span id="an-tvalue-wrap"><input class="input" id="an-tvalue" value="' + esc(existing ? existing.target_value : '') + '" placeholder="user id or role"></span>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Publish</label>' +
        '<span class="select-wrap"><select class="input" id="an-status">' +
          '<option value="draft">Save as draft</option>' +
          '<option value="send">Send immediately</option>' +
          '<option value="schedule">Schedule for later</option>' +
        '</select>' + icon('arrowDown', 15) + '</span></div>' +
      '<div class="field" id="an-sched-wrap" style="display:none"><label>Scheduled for</label>' +
        '<div class="field-inner"><input id="an-sched" type="datetime-local"></div>' +
        '<small class="tiny muted">Scheduled announcements are only marked for delivery; run the cron job to publish them on time.</small></div>' +
      (existing ? '<div id="an-id" data-id="' + existing.id + '" hidden></div>' : ''),
    confirmText: existing ? 'Save changes' : 'Create announcement',
    onConfirm: async (btn, wrap) => {
      const title = $('#an-title', wrap).value.trim();
      const body = $('#an-body', wrap).value.trim();
      const ttype = $('#an-ttype', wrap).value;
      const tvalue = $('#an-tvalue', wrap).value.trim();
      const mode = $('#an-status', wrap).value;
      if (!title) { toast('Please add a title.', 'error'); return; }
      if (!body) { toast('Please add a message body.', 'error'); return; }
      if (ttype !== 'all' && !tvalue) { toast('Please specify the target.', 'error'); return; }
      if (ttype === 'role' && !roleOptions.some(r => r[0] === tvalue)) { toast('Unknown role target.', 'error'); return; }
      let scheduled = null;
      if (mode === 'schedule') {
        scheduled = $('#an-sched', wrap).value;
        if (!scheduled) { toast('Pick a delivery date and time.', 'error'); return; }
        scheduled = scheduled + ':00';
      }
      setLoading(btn, true);
      const payload = {
        action: 'create',
        title: title, body: body,
        target_type: ttype, target_value: tvalue,
        status: mode === 'send' ? 'draft' : (mode === 'schedule' ? 'scheduled' : 'draft'),
        scheduled_at: mode === 'schedule' ? scheduled : null,
      };
      try {
        if (mode === 'send') {
          const created = await apiPost('api/announcements.php', payload);
          if (existing) await apiPost('api/announcements.php', { action: 'delete', id: existing.id });
          const sent = await apiPost('api/announcements.php', { action: 'send', id: created.id });
          toast('Sent to ' + fmtNum((sent && sent.delivered) || 0) + ' user(s).', 'success');
        } else {
          if (existing) await apiPost('api/announcements.php', { action: 'delete', id: existing.id });
          await apiPost('api/announcements.php', payload);
          toast(mode === 'schedule' ? 'Announcement scheduled.' : 'Draft saved.', 'success');
        }
        closeAllModals();
        reloadView();
      } catch (e) {
        setLoading(btn, false);
      }
    },
  });

  const wrap = $('#modal-container');
  if (!wrap) return;
  const tt = $('#an-ttype', wrap);
  const tv = $('#an-tvalue', wrap);
  const st = $('#an-status', wrap);
  const sw = $('#an-sched-wrap', wrap);

  function syncTarget() {
    const t = tt.value;
    tv.placeholder = t === 'role' ? 'user | moderator | admin | super_admin' : 'user id';
    tv.setAttribute('inputmode', t === 'user' ? 'numeric' : 'text');
  }
  function syncSchedule() {
    sw.style.display = st.value === 'schedule' ? '' : 'none';
    if (st.value === 'schedule' && !$('#an-sched', wrap).value) {
      $('#an-sched', wrap).value = toLocalInput(new Date(Date.now() + 3600000).toISOString().replace('T', ' ').slice(0, 19) + 'Z').slice(0, 16);
    }
  }
  if (tt) tt.addEventListener('change', syncTarget);
  if (st) st.addEventListener('change', syncSchedule);
  syncTarget();
  if (existing && existing.status === 'scheduled') {
    st.value = 'schedule';
    if (existing.scheduled_at) $('#an-sched', wrap).value = toLocalInput(existing.scheduled_at).slice(0, 16);
  } else if (existing) {
    st.value = 'draft';
  }
  syncSchedule();
}

async function openAnnouncementDetail(id) {
  const w = openModal({ title: 'Loading announcement...', icon: 'bell', size: 'lg', body: loadingBlock('Fetching announcement') });
  let d, stats = null;
  try {
    d = await apiGet('api/announcements.php' + qs({ action: 'view', id: id }));
  } catch (err) {
    replaceModal(w, modalError('Could not load announcement', err.message));
    return;
  }
  if (d.__authError) return;

  const a = d.announcement;
  if (a.status === 'sent' && can('announcements.create')) {
    try { stats = await apiGet('api/announcements.php' + qs({ action: 'stats', id: id })); } catch (e) { stats = null; }
  }

  const readRate = stats ? stats.read_rate : 0;

  replaceModal(w,
    '<div class="modal lg">' +
      '<div class="modal-head">' +
        '<div class="mh-ico">' + icon('bell', 19) + '</div>' +
        '<div class="mh-meta"><h3>' + esc(a.title) + '</h3>' +
        '<p>Announcement #' + a.id + ' &middot; ' + esc(fmtDate(a.created_at)) + '</p></div>' +
        '<button class="icon-btn" data-close>' + icon('x', 19) + '</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="row row-wrap mb-2" style="gap:6px">' + annStatusPill(a.status) +
          '<span class="pill mute">' + icon('users', 12) + esc(annTargetLabel(a)) + '</span>' +
          '<span class="pill mute">' + icon('user', 12) + esc(a.admin_full_name || a.admin_username) + '</span>' +
          (a.sent_at ? '<span class="pill ok">' + icon('send', 12) + 'sent ' + esc(fmtAgo(a.sent_at)) + '</span>' : '') +
          (a.scheduled_at ? '<span class="pill brand">' + icon('clock', 12) + esc(fmtDateTime(a.scheduled_at)) + '</span>' : '') +
        '</div>' +
        '<div class="quote-box">' + esc(a.body || '') + '</div>' +
        (stats
          ? '<div class="section-title mt-2">' + icon('activity', 16) + 'Delivery</div>' +
            '<div class="grid grid-3" style="gap:10px;margin-bottom:12px">' +
              '<div class="mini-stat"><span class="mini-val">' + fmtNum(stats.total_delivered) + '</span><span class="mini-key">delivered</span></div>' +
              '<div class="mini-stat"><span class="mini-val">' + fmtNum(stats.total_read) + '</span><span class="mini-key">read</span></div>' +
              '<div class="mini-stat"><span class="mini-val">' + readRate + '%</span><span class="mini-key">read rate</span></div>' +
            '</div>' +
            (stats.recent_recipients && stats.recent_recipients.length
              ? '<div class="list-plain">' + stats.recent_recipients.map(r =>
                '<div class="list-item">' + avatarHTML(r.user, 30) +
                '<div class="li-meta"><b>' + esc(r.user.full_name || r.user.username) + '</b>' +
                '<small>delivered ' + esc(fmtAgo(r.delivered_at)) + '</small></div>' +
                (r.read ? '<span class="pill ok">' + icon('check', 12) + 'read</span>'
                        : '<span class="pill mute">' + icon('clock', 12) + 'unread</span>') + '</div>').join('') + '</div>'
              : '')
          : '') +
      '</div>' +
      '<div class="modal-foot">' +
        ((a.status === 'draft' || a.status === 'scheduled') && can('announcements.send')
          ? '<button class="btn btn-primary btn-sm" data-a-send="' + a.id + '">' + icon('send', 15) + 'Send now</button>' : '') +
        ((a.status === 'draft' || a.status === 'scheduled') && can('announcements.create')
          ? '<button class="btn btn-ghost btn-sm" data-a-edit="' + a.id + '">' + icon('edit', 15) + 'Edit</button>' : '') +
        (can('announcements.delete')
          ? '<button class="btn btn-danger-soft btn-sm" data-a-del="' + a.id + '">' + icon('trash', 15) + 'Delete</button>' : '') +
        '<div class="spacer"></div><button class="btn btn-ghost btn-sm" data-close>Close</button>' +
      '</div>' +
    '</div>');

  const modal = $('.modal', w) || w;
  modal.addEventListener('click', e => {
    const s = e.target.closest('[data-a-send]');
    if (s) { closeAllModals(); sendAnnouncement(a, false); return; }
    const ed = e.target.closest('[data-a-edit]');
    if (ed) { closeAllModals(); openAnnouncementComposer(a); return; }
    const d2 = e.target.closest('[data-a-del]');
    if (d2) { closeAllModals(); deleteAnnouncement(a); }
  });
}
