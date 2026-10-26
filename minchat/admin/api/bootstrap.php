<?php
/**
 * Admin API bootstrap: admin auth, role permissions, audit logging, rate limiting.
 */
declare(strict_types=1);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../includes/upload.php';
require_once __DIR__ . '/../../api/common.php';

/*
 * Every admin endpoint answers with a single JSON document. A stray PHP
 * notice printed before json_encode() would corrupt that payload and break
 * the client, so notices and warnings are logged instead of displayed.
 */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_error_handler(static function (int $no, string $msg, string $file = '', int $line = 0): bool {
    if ((error_reporting() & $no) === 0) {
        return false;
    }
    error_log(sprintf('[admin] %s in %s:%d', $msg, $file, $line));
    return true;
});

set_exception_handler(function (Throwable $e): void {
    if (APP_DEV) {
        json_error('Server error: ' . $e->getMessage(), 500, ['trace' => $e->getTraceAsString()]);
    }
    error_log('[admin] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    json_error('An unexpected error occurred.', 500);
});

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

function guard_csrf_or_skip(): void
{
    if (in_array(request_method(), ['GET', 'HEAD', 'OPTIONS'], true)) return;
    csrf_check();
}

/* ------------------------------------------------------------------ */
/* Admin roles & permissions                                           */
/* ------------------------------------------------------------------ */

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator'];

const ROLE_PERMISSIONS = [
    'super_admin' => ['*'],
    'admin' => [
        'dashboard','users.view','users.edit','users.warn','users.suspend','users.block','users.delete',
        'roles.assign','convs.view','convs.remove',
        'messages.view','messages.remove',
        'groups.view','groups.remove','groups.members_remove',
        'reports.view','reports.handle',
        'announcements.create','announcements.send','announcements.delete',
        'admins.view','logs.view',
    ],
    'moderator' => [
        'dashboard','users.view',
        'convs.view','messages.view','messages.remove',
        'groups.view','groups.remove','groups.members_remove',
        'reports.view','reports.handle',
    ],
];

function admin_user(): ?array
{
    if (empty($_SESSION['user_id'])) return null;
    static $cached = null;
    if ($cached !== null) return $cached;
    $stmt = db()->prepare(
        'SELECT id, username, email, full_name, avatar, role, status, created_at
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();
    if ($row === false || !in_array($row['role'], ADMIN_ROLES, true) || $row['status'] !== 'active') {
        $cached = null;
        return null;
    }
    $cached = $row;
    return $row;
}

function require_admin(): array
{
    $u = admin_user();
    if ($u === null) {
        json_error('Admin authentication required.', 401);
    }
    return $u;
}

function permissions_for(string $role): array
{
    return ROLE_PERMISSIONS[$role] ?? [];
}

function can(string $perm): bool
{
    global $ADMIN;
    if ($ADMIN === null) return false;
    $perms = permissions_for($ADMIN['role']);
    if (in_array('*', $perms, true)) return true;
    return in_array($perm, $perms, true);
}

function require_perm(string $perm): void
{
    if (!can($perm)) {
        json_error('You do not have permission to perform this action.', 403);
    }
}

/* ------------------------------------------------------------------ */
/* Audit logging                                                       */
/* ------------------------------------------------------------------ */

function audit_log(string $action, ?string $targetType = null, ?int $targetId = null, ?string $details = null): void
{
    global $ADMIN;
    if ($ADMIN === null) return;
    $stmt = db()->prepare(
        'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $ADMIN['id'], $action,
        $targetType, $targetId,
        $details !== null ? mb_substr($details, 0, 500) : null,
        $_SERVER['REMOTE_ADDR'] ?? 'cli',
    ]);
}

/* ------------------------------------------------------------------ */
/* Rate limiting for admin login                                       */
/* ------------------------------------------------------------------ */

function admin_rate_limit(string $scope, int $max = 20, int $windowMin = 15): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $stmt = db()->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE scope = ? AND ip = ? AND success = 0
         AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)'
    );
    $stmt->execute([$scope, $ip, $windowMin]);
    if ((int)$stmt->fetchColumn() >= $max) {
        json_error('Too many failed attempts. Please wait and try again.', 429);
    }
}

/* ------------------------------------------------------------------ */
/* Pagination helper                                                   */
/* ------------------------------------------------------------------ */

function pagination_params(): array
{
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(5, (int)($_GET['per_page'] ?? 20)));
    return ['page' => $page, 'per_page' => $perPage, 'offset' => ($page - 1) * $perPage];
}

function paginated_response(string $countSql, array $countParams, string $dataSql, array $dataParams, int $page, int $perPage): array
{
    $cstmt = db()->prepare($countSql);
    $cstmt->execute($countParams);
    $total = (int)$cstmt->fetchColumn();
    $pages = max(1, (int)ceil($total / $perPage));

    $dstmt = db()->prepare($dataSql);
    $dstmt->execute($dataParams);
    $items = $dstmt->fetchAll();

    return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage, 'pages' => $pages];
}

/* ------------------------------------------------------------------ */
/* Convenience helpers                                                 */
/* ------------------------------------------------------------------ */

function input_array(string $key, array $default = []): array
{
    $v = input($key, $default);
    return is_array($v) ? $v : $default;
}
