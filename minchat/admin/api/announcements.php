<?php
/**
 * Pulse Chat Admin API - Announcements.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

/* ------------------------------------------------------------------ */
/* Delivery engine                                                     */
/* ------------------------------------------------------------------ */

/**
 * Deliver an announcement to its target audience.
 * Returns the number of users it was delivered to.
 */
function admin_deliver_announcement(int $annId): int
{
    global $ADMIN;
    $stmt = db()->prepare('SELECT * FROM announcements WHERE id = ? LIMIT 1');
    $stmt->execute([$annId]);
    $a = $stmt->fetch();
    if ($a === false) {
        json_error('Announcement not found.', 404);
    }

    $ids = [];
    if ($a['target_type'] === 'all') {
        $stmt = db()->prepare("SELECT id FROM users WHERE status = 'active' AND id <> ?");
        $stmt->execute([(int)$ADMIN['id']]);
        foreach ($stmt->fetchAll() as $row) {
            $ids[] = (int)$row['id'];
        }
    } elseif ($a['target_type'] === 'role') {
        $stmt = db()->prepare("SELECT id FROM users WHERE role = ? AND status = 'active'");
        $stmt->execute([$a['target_value']]);
        foreach ($stmt->fetchAll() as $row) {
            $ids[] = (int)$row['id'];
        }
    } else {
        $uid = (int)$a['target_value'];
        $stmt = db()->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$uid]);
        if ($stmt->fetch() === false) {
            json_error('Target user not found.', 404);
        }
        $ids[] = $uid;
    }

    $pdo = db();
    $notif = $pdo->prepare(
        'INSERT INTO notifications (user_id, type, title, body, announcement_id) VALUES (?, ?, ?, ?, ?)'
    );
    $delivery = $pdo->prepare(
        'INSERT INTO announcement_deliveries (announcement_id, user_id, delivered_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE delivered_at = NOW()'
    );
    foreach ($ids as $uid) {
        $notif->execute([$uid, 'system', mb_substr($a['title'], 0, 120), mb_substr((string)$a['body'], 0, 300), $annId]);
        $delivery->execute([$annId, $uid]);
    }

    $pdo->prepare("UPDATE announcements SET status = 'sent', sent_at = NOW() WHERE id = ?")->execute([$annId]);

    return count($ids);
}

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

if (request_method() === 'GET') {
    if (!can('announcements.create') && !can('announcements.send')) {
        json_error('You do not have permission to perform this action.', 403);
    }
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        require_perm('announcements.create');
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid announcement id.');
        }
        $stmt = db()->prepare(
            "SELECT a.*, u.username AS admin_username, u.full_name AS admin_full_name
             FROM announcements a
             JOIN users u ON u.id = a.admin_id
             WHERE a.id = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $a = $stmt->fetch();
        if ($a === false) {
            json_error('Announcement not found.', 404);
        }
        json_ok(['announcement' => $a]);
    }

    if ($action === 'stats') {
        require_perm('announcements.create');
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid announcement id.');
        }
        $stmt = db()->prepare('SELECT id FROM announcements WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if ($stmt->fetch() === false) {
            json_error('Announcement not found.', 404);
        }

        $s = db()->prepare('SELECT COUNT(*) FROM announcement_deliveries WHERE announcement_id = ?');
        $s->execute([$id]);
        $delivered = (int)$s->fetchColumn();

        $s = db()->prepare('SELECT COUNT(*) FROM announcement_deliveries WHERE announcement_id = ? AND read_at IS NOT NULL');
        $s->execute([$id]);
        $read = (int)$s->fetchColumn();

        $readRate = $delivered > 0 ? round($read / $delivered * 100, 1) : 0;

        $rows = [];
        $s = db()->prepare(
            "SELECT d.id, d.delivered_at, d.read_at, u.id AS user_id, u.username, u.full_name, u.avatar, u.status
             FROM announcement_deliveries d
             JOIN users u ON u.id = d.user_id
             WHERE d.announcement_id = ?
             ORDER BY d.id DESC LIMIT 20"
        );
        $s->execute([$id]);
        foreach ($s->fetchAll() as $row) {
            $rows[] = [
                'user' => [
                    'id'       => (int)$row['user_id'],
                    'username' => $row['username'],
                    'full_name'=> $row['full_name'],
                    'avatar'   => $row['avatar'],
                    'status'   => $row['status'],
                ],
                'delivered_at' => $row['delivered_at'],
                'read_at'      => $row['read_at'],
                'delivered'    => $row['delivered_at'] !== null,
                'read'         => $row['read_at'] !== null,
            ];
        }

        json_ok([
            'id'          => $id,
            'total_delivered' => $delivered,
            'total_read'      => $read,
            'read_rate'       => $readRate,
            'recent_recipients' => $rows,
        ]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $status = (string)($_GET['status'] ?? '');

    $where  = ['1=1'];
    $params = [];
    if (in_array($status, ['draft', 'scheduled', 'sent', 'cancelled'], true)) {
        $params[':status'] = $status;
        $where[] = 'a.status = :status';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM announcements a WHERE {$whereSql}";
    $dataSql  = "SELECT a.*, u.username AS admin_username, u.full_name AS admin_full_name,
                        (SELECT COUNT(*) FROM announcement_deliveries d WHERE d.announcement_id = a.id) AS delivered_count,
                        (SELECT COUNT(*) FROM announcement_deliveries d WHERE d.announcement_id = a.id AND d.read_at IS NOT NULL) AS read_count
                 FROM announcements a
                 JOIN users u ON u.id = a.admin_id
                 WHERE {$whereSql}
                 ORDER BY a.id DESC
                 LIMIT {$offset}, {$perPage}";

    json_ok(paginated_response($countSql, $params, $dataSql, $params, $page, $perPage));
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'create') {
    require_perm('announcements.create');
    $title = trim((string)input('title', ''));
    if ($title === '' || !str_len($title, 1, 150)) {
        json_error('Title must be 1-150 characters.');
    }
    $body = trim((string)input('body', ''));
    if ($body === '' || !str_len($body, 1, 2000)) {
        json_error('Body must be 1-2000 characters.');
    }
    $targetType = (string)input('target_type', 'all');
    if (!in_array($targetType, ['all', 'role', 'user'], true)) {
        json_error('Invalid target type.');
    }
    $targetValue = null;
    if ($targetType === 'role') {
        $targetValue = (string)input('target_value', '');
        if (!in_array($targetValue, ['user', 'moderator', 'admin', 'super_admin'], true)) {
            json_error('Invalid target role.');
        }
    } elseif ($targetType === 'user') {
        $uid = (int)input('target_value', 0);
        if ($uid <= 0) {
            json_error('Invalid target user.');
        }
        $s = db()->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $s->execute([$uid]);
        if ($s->fetch() === false) {
            json_error('Target user not found.', 404);
        }
        $targetValue = (string)$uid;
    }
    $status = (string)input('status', 'draft');
    if (!in_array($status, ['draft', 'sent'], true)) {
        json_error('Invalid status. Use draft or sent.');
    }
    $schedDb = null;
    $sched   = input('scheduled_at', null);
    if ($sched !== null && $sched !== '') {
        $t = strtotime((string)$sched);
        if ($t === false) {
            json_error('Invalid scheduled_at date.');
        }
        $schedDb = date('Y-m-d H:i:s', $t);
    }

    db()->prepare(
        'INSERT INTO announcements (admin_id, title, body, target_type, target_value, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$ADMIN['id'], $title, $body, $targetType, $targetValue, $status, $schedDb]);
    $annId = (int)db()->lastInsertId();

    audit_log('create_announcement', 'announcement', $annId, $status === 'sent' ? 'Created & sent: ' . $title : 'Created (draft): ' . $title);

    $delivered = 0;
    if ($status === 'sent') {
        $delivered = admin_deliver_announcement($annId);
    }
    json_ok(['id' => $annId, 'delivered' => $delivered]);
}

if ($action === 'send') {
    require_perm('announcements.send');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid announcement id.');
    }
    $stmt = db()->prepare('SELECT status FROM announcements WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row === false) {
        json_error('Announcement not found.', 404);
    }
    if ($row['status'] === 'sent') {
        json_error('This announcement was already sent.');
    }
    if ($row['status'] === 'cancelled') {
        json_error('This announcement was cancelled.');
    }
    $delivered = admin_deliver_announcement($id);
    audit_log('send_announcement', 'announcement', $id, "Delivered to {$delivered} users");
    json_ok(['id' => $id, 'delivered' => $delivered]);
}

if ($action === 'cancel') {
    require_perm('announcements.send');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid announcement id.');
    }
    $stmt = db()->prepare('SELECT id, status FROM announcements WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row === false) {
        json_error('Announcement not found.', 404);
    }
    if ($row['status'] === 'sent') {
        json_error('You cannot cancel an announcement that has already been sent.');
    }
    db()->prepare("UPDATE announcements SET status = 'cancelled' WHERE id = ?")->execute([$id]);
    audit_log('cancel_announcement', 'announcement', $id);
    json_ok();
}

if ($action === 'delete') {
    require_perm('announcements.delete');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid announcement id.');
    }
    $stmt = db()->prepare('SELECT id FROM announcements WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    if ($stmt->fetch() === false) {
        json_error('Announcement not found.', 404);
    }
    db()->prepare('DELETE FROM announcements WHERE id = ?')->execute([$id]);
    audit_log('delete_announcement', 'announcement', $id);
    json_ok();
}

json_error('Unknown action.', 400);