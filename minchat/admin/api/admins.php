<?php
/**
 * Pulse Chat Admin API - Administrator management.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();
require_perm('admins.view');

function require_super_admin(): void
{
    global $ADMIN;
    if (($ADMIN['role'] ?? '') !== 'super_admin') {
        json_error('Only super admins can manage administrator accounts.', 403);
    }
}

function admin_fetch_user(int $id): array
{
    $stmt = db()->prepare('SELECT id, username, role FROM users WHERE id = ? LIMIT 1');
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
    $rows = db()->query(
        "SELECT id, username, full_name, email, avatar, role, status, created_at
         FROM users
         WHERE role <> 'user'
         ORDER BY FIELD(role, 'super_admin', 'admin', 'moderator'), id ASC"
    )->fetchAll();
    json_ok(['items' => $rows, 'total' => count($rows)]);
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'add') {
    require_super_admin();
    $userId = (int)input('user_id', 0);
    if ($userId <= 0) {
        json_error('Invalid user id.');
    }
    $role = (string)input('role', 'moderator');
    if (!in_array($role, ['admin', 'moderator'], true)) {
        json_error('Invalid role. Use admin or moderator.');
    }
    $u = admin_fetch_user($userId);
    if (in_array($u['role'], ADMIN_ROLES, true)) {
        json_error('This user is already an administrator.');
    }
    db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $userId]);
    audit_log('add_admin', 'user', $userId, "Granted role {$role} to @{$u['username']}");
    json_ok();
}

if ($action === 'update_role') {
    require_super_admin();
    $userId = (int)input('user_id', 0);
    if ($userId <= 0) {
        json_error('Invalid user id.');
    }
    if ($userId === (int)$ADMIN['id']) {
        json_error('You cannot change your own role.');
    }
    $newRole = (string)input('new_role', '');
    if (!in_array($newRole, ADMIN_ROLES, true)) {
        json_error('Invalid role.');
    }
    $u = admin_fetch_user($userId);
    if (!in_array($u['role'], ADMIN_ROLES, true)) {
        json_error('Target user is not an administrator.');
    }
    db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $userId]);
    audit_log('update_admin_role', 'user', $userId, "{$u['role']} -> {$newRole}");
    json_ok();
}

if ($action === 'remove') {
    require_super_admin();
    $userId = (int)input('user_id', 0);
    if ($userId <= 0) {
        json_error('Invalid user id.');
    }
    if ($userId === (int)$ADMIN['id']) {
        json_error('You cannot remove yourself.');
    }
    $u = admin_fetch_user($userId);
    if (!in_array($u['role'], ADMIN_ROLES, true)) {
        json_error('Target user is not an administrator.');
    }
    if ($u['role'] === 'super_admin') {
        $count = (int)db()->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")->fetchColumn();
        if ($count <= 1) {
            json_error('You cannot remove the last super admin.');
        }
    }
    db()->prepare("UPDATE users SET role = 'user' WHERE id = ?")->execute([$userId]);
    audit_log('remove_admin', 'user', $userId, "Removed {$u['role']} from @{$u['username']}");
    json_ok();
}

json_error('Unknown action.', 400);