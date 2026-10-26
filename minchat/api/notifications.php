<?php
/**
 * GET  api/notifications.php          - list notifications + unread count
 * POST api/notifications.php?action=read_all   - mark all read
 * POST api/notifications.php?action=read       - mark one read
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$me = require_auth();
$myId = (int)$me['id'];

if (request_method() === 'GET') {
    $stmt = db()->prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    );
    $stmt->execute([$myId]);
    $notifications = array_map(function ($n) {
        $n['id']    = (int)$n['id'];
        $n['read']  = (int)$n['is_read'];
        $n['actor_id'] = $n['actor_id'] === null ? null : (int)$n['actor_id'];
        $n['conversation_id'] = $n['conversation_id'] === null ? null : (int)$n['conversation_id'];
        return $n;
    }, $stmt->fetchAll());

    $cnt = db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
    $cnt->execute([$myId]);

    json_ok(['notifications' => $notifications, 'unread_count' => (int)$cnt->fetchColumn()]);
}

guard_csrf_or_skip();
$action = (string)($_GET['action'] ?? input('action', ''));

if ($action === 'read_all') {
    $stmt = db()->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
    $stmt->execute([$myId]);
    json_ok(['unread_count' => 0]);
}

if ($action === 'read') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Notification required.');
    }
    $stmt = db()->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $myId]);

    $cnt = db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
    $cnt->execute([$myId]);
    json_ok(['unread_count' => (int)$cnt->fetchColumn()]);
}

json_error('Unknown notification action.', 400);