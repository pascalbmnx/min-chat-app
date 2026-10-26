<?php
/**
 * Pulse Chat Admin API - User management.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

const ADMIN_USER_COLS = 'id, username, email, full_name, bio, avatar, role, status,
       warn_count, suspended_until, moderation_note, theme, is_online, last_seen_at,
       created_at, updated_at';

function admin_find_user(int $id): array
{
    $stmt = db()->prepare('SELECT ' . ADMIN_USER_COLS . ' FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if ($u === false) {
        json_error('User not found.', 404);
    }
    return $u;
}

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

if (request_method() === 'GET') {
    require_perm('users.view');
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid user id.');
        }
        $user = admin_find_user($id);
        $uid  = (int)$user['id'];

        $stats          = [];
        $s = db()->prepare('SELECT COUNT(*) FROM messages WHERE sender_id = ?');
        $s->execute([$uid]);
        $stats['messages'] = (int)$s->fetchColumn();

        $s = db()->prepare('SELECT COUNT(*) FROM conversation_members WHERE user_id = ?');
        $s->execute([$uid]);
        $stats['conversations'] = (int)$s->fetchColumn();

        $s = db()->prepare(
            "SELECT COUNT(DISTINCT cm.conversation_id)
             FROM conversation_members cm
             JOIN conversations c ON c.id = cm.conversation_id
             WHERE cm.user_id = ? AND c.type = 'group'"
        );
        $s->execute([$uid]);
        $stats['groups'] = (int)$s->fetchColumn();

        $s = db()->prepare('SELECT COUNT(*) FROM reports WHERE target_user_id = ?');
        $s->execute([$uid]);
        $stats['reports_against'] = (int)$s->fetchColumn();

        $s = db()->prepare(
            "SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.deleted, m.created_at,
                    c.type AS conv_type, c.name AS conv_name
             FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE m.sender_id = ?
             ORDER BY m.id DESC LIMIT 5"
        );
        $s->execute([$uid]);
        $stats['last_messages'] = $s->fetchAll();

        json_ok(['user' => $user, 'stats' => $stats]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $q      = trim((string)($_GET['q'] ?? ''));
    $status = (string)($_GET['status'] ?? '');
    $role   = (string)($_GET['role'] ?? '');

    $where  = ['1=1'];
    $params = [];
    // All placeholders are named: PDO cannot mix named and positional markers in
    // one prepared statement. Native prepares also cannot reuse one name twice,
    // so the LIKE value is bound under three distinct names.
    if ($q !== '') {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $params[':q_username'] = $like;
        $params[':q_full_name'] = $like;
        $params[':q_email'] = $like;
        $where[] = '(username LIKE :q_username OR full_name LIKE :q_full_name OR email LIKE :q_email)';
    }
    if (in_array($status, ['active', 'suspended', 'blocked'], true)) {
        $params[':status'] = $status;
        $where[] = 'status = :status';
    }
    if (in_array($role, ['user', 'moderator', 'admin', 'super_admin'], true)) {
        $params[':role'] = $role;
        $where[] = 'role = :role';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM users WHERE {$whereSql}";
    $dataSql  = 'SELECT ' . ADMIN_USER_COLS . " FROM users
                 WHERE {$whereSql}
                 ORDER BY id DESC
                 LIMIT {$offset}, {$perPage}";

    json_ok(paginated_response($countSql, $params, $dataSql, $params, $page, $perPage));
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'edit') {
    require_perm('users.edit');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    $user = admin_find_user($id);

    $fields  = [];
    $params  = [];
    $changed = [];

    if (input('full_name', null) !== null) {
        $v = trim((string)input('full_name'));
        if (!str_len($v, 1, 100)) {
            json_error('Full name must be 1-100 characters.');
        }
        $fields[]  = 'full_name = ?';
        $params[]  = $v;
        $changed[] = 'full_name';
    }
    if (input('email', null) !== null) {
        $v = trim((string)input('email'));
        if (!valid_email($v)) {
            json_error('Please provide a valid email address.');
        }
        $dup = db()->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $dup->execute([$v, $id]);
        if ($dup->fetch()) {
            json_error('That email is already in use by another account.');
        }
        $fields[]  = 'email = ?';
        $params[]  = $v;
        $changed[] = 'email';
    }
    if (input('username', null) !== null) {
        $v = trim((string)input('username'));
        if (!valid_username($v)) {
            json_error('Username must be 3-30 characters (letters, numbers, underscores).');
        }
        $dup = db()->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
        $dup->execute([$v, $id]);
        if ($dup->fetch()) {
            json_error('That username is already taken.');
        }
        $fields[]  = 'username = ?';
        $params[]  = $v;
        $changed[] = 'username';
    }
    if (input('bio', null) !== null) {
        $v = trim((string)input('bio'));
        if (mb_strlen($v) > 500) {
            json_error('Bio must be at most 500 characters.');
        }
        $fields[]  = 'bio = ?';
        $params[]  = $v === '' ? null : $v;
        $changed[] = 'bio';
    }
    if ($fields === []) {
        json_error('Nothing to update.');
    }
    $params[] = $id;
    db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    audit_log('edit_user', 'user', $id, 'Updated fields: ' . implode(', ', $changed));
    json_ok(['user' => admin_find_user($id)]);
}

if ($action === 'warn') {
    require_perm('users.warn');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    if ($id === (int)$ADMIN['id']) {
        json_error('You cannot warn yourself.');
    }
    $user = admin_find_user($id);
    $note = trim((string)input('note', ''));
    if ($note === '' || mb_strlen($note) > 500) {
        json_error('Please add a note of up to 500 characters.');
    }
    db()->prepare('UPDATE users SET warn_count = warn_count + 1, moderation_note = ? WHERE id = ?')
        ->execute([$note, $id]);
    create_notification($id, 'system', 'You have received a warning', $note, null, $ADMIN['id']);
    $newCount = (int)$user['warn_count'] + 1;
    audit_log('warn_user', 'user', $id, "Warning #{$newCount}: {$note}");
    json_ok(['user_id' => $id, 'warn_count' => $newCount]);
}

if ($action === 'suspend') {
    require_perm('users.suspend');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    if ($id === (int)$ADMIN['id']) {
        json_error('You cannot suspend yourself.');
    }
    admin_find_user($id);
    $reason = trim((string)input('reason', ''));
    if ($reason === '' || mb_strlen($reason) > 500) {
        json_error('Please provide a reason of up to 500 characters.');
    }
    $untilDb = null;
    $until   = input('suspended_until', null);
    if ($until !== null && $until !== '' && $until !== '0') {
        $t = strtotime((string)$until);
        if ($t === false) {
            json_error('Invalid suspended_until date.');
        }
        $untilDb = date('Y-m-d H:i:s', $t);
    }
    db()->prepare("UPDATE users SET status = 'suspended', suspended_until = ?, moderation_note = ? WHERE id = ?")
        ->execute([$untilDb, $reason, $id]);
    $label = $untilDb ? 'until ' . $untilDb : 'permanently';
    create_notification($id, 'system', 'Your account has been suspended', "Suspended {$label}. Reason: {$reason}", null, $ADMIN['id']);
    audit_log('suspend_user', 'user', $id, "Suspended {$label} - {$reason}");
    json_ok();
}

if ($action === 'block' || $action === 'unblock') {
    require_perm('users.block');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    if ($id === (int)$ADMIN['id']) {
        json_error('You cannot act on your own account.');
    }
    $user = admin_find_user($id);

    if ($action === 'block') {
        $reason = trim((string)input('reason', ''));
        if (mb_strlen($reason) > 500) {
            json_error('Reason must be at most 500 characters.');
        }
        $note = $reason !== '' ? $reason : $user['moderation_note'];
        db()->prepare("UPDATE users SET status = 'blocked', suspended_until = NULL, moderation_note = ? WHERE id = ?")
            ->execute([$note, $id]);
        create_notification($id, 'system', 'Your account has been blocked', $reason !== '' ? $reason : null, null, $ADMIN['id']);
        audit_log('block_user', 'user', $id, $reason);
    } else {
        db()->prepare("UPDATE users SET status = 'active', suspended_until = NULL WHERE id = ?")
            ->execute([$id]);
        create_notification($id, 'system', 'Your account has been activated', null, null, $ADMIN['id']);
        audit_log('unblock_user', 'user', $id);
    }
    json_ok(['user' => admin_find_user($id)]);
}

if ($action === 'delete') {
    require_perm('users.delete');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    if ($id === (int)$ADMIN['id']) {
        json_error('You cannot delete your own account.');
    }
    admin_find_user($id);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE conversations SET created_by = ? WHERE created_by = ?')
            ->execute([$ADMIN['id'], $id]);
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    audit_log('delete_user', 'user', $id);
    json_ok();
}

if ($action === 'reset_password') {
    require_perm('users.edit');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    $user = admin_find_user($id);

    $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    $pw    = '';
    for ($i = 0; $i < 12; $i++) {
        $pw .= $chars[random_int(0, strlen($chars) - 1)];
    }
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($pw, PASSWORD_DEFAULT), $id]);
    audit_log('reset_password', 'user', $id, 'for @' . $user['username']);
    json_ok(['user_id' => (int)$user['id'], 'username' => $user['username'], 'new_password' => $pw]);
}

if ($action === 'set_role') {
    require_perm('roles.assign');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid user id.');
    }
    if ($id === (int)$ADMIN['id']) {
        json_error('You cannot change your own role.');
    }
    $user = admin_find_user($id);

    $newRole = (string)input('role', '');
    $allowed = array_merge(ADMIN_ROLES, ['user']);
    if (!in_array($newRole, $allowed, true)) {
        json_error('Invalid role.');
    }
    if ($newRole === (string)$user['role']) {
        json_error('That user already holds this role.');
    }
    if (($user['role'] === 'super_admin' || $newRole === 'super_admin') && ($ADMIN['role'] ?? '') !== 'super_admin') {
        json_error('Only a super admin can grant or revoke the super admin role.', 403);
    }

    $note = trim((string)input('note', ''));
    if (mb_strlen($note) > 200) {
        json_error('Audit note must be at most 200 characters.');
    }

    db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $id]);

    $detail = "{$user['role']} -> {$newRole}";
    if ($note !== '') {
        $detail .= ' (' . $note . ')';
        db()->prepare('UPDATE users SET moderation_note = ? WHERE id = ?')->execute([$note, $id]);
    }

    if ($newRole === 'user') {
        create_notification($id, 'system', 'Your administrator access was removed', $note !== '' ? $note : null, null, $ADMIN['id']);
    } else {
        create_notification($id, 'system', 'You were promoted to ' . str_replace('_', ' ', $newRole), $note !== '' ? $note : null, null, $ADMIN['id']);
    }

    audit_log('set_user_role', 'user', $id, $detail);
    json_ok(['user' => admin_find_user($id)]);
}

json_error('Unknown action.', 400);