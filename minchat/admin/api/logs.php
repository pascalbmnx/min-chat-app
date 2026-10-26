<?php
/**
 * Pulse Chat Admin API - Audit log viewer.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();
require_perm('logs.view');

if (request_method() !== 'GET') {
    json_error('Method not allowed.', 405);
}

['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
$adminId = (int)($_GET['admin_id'] ?? 0);
$action  = (string)($_GET['action'] ?? '');

$where  = ['1=1'];
$params = [];
if ($adminId > 0) {
    $params[':admin_id'] = $adminId;
    $where[] = 'l.admin_id = :admin_id';
}
if ($action !== '') {
    if (mb_strlen($action) > 60) {
        json_error('Action filter is too long.');
    }
    $params[':action'] = $action;
    $where[] = 'l.action = :action';
}
$whereSql = implode(' AND ', $where);

$countSql = "SELECT COUNT(*) FROM admin_logs l WHERE {$whereSql}";
$dataSql  = "SELECT l.*, u.username AS admin_username, u.full_name AS admin_full_name
             FROM admin_logs l
             JOIN users u ON u.id = l.admin_id
             WHERE {$whereSql}
             ORDER BY l.id DESC
             LIMIT {$offset}, {$perPage}";

json_ok(paginated_response($countSql, $params, $dataSql, $params, $page, $perPage));