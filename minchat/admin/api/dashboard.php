<?php
/**
 * Pulse Chat Admin API - Dashboard statistics overview.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

if (request_method() !== 'GET') {
    json_error('Method not allowed.', 405);
}

$pdo = db();

$count = static function (string $sql): int {
    return (int)db()->query($sql)->fetchColumn();
};

/* Basic totals -------------------------------------------------------- */
$totalUsers         = $count('SELECT COUNT(*) FROM users');
$onlineWindow       = (int)ONLINE_WINDOW;
$onlineUsers        = $count("SELECT COUNT(*) FROM users WHERE is_online = 1 AND last_seen_at > (NOW() - INTERVAL {$onlineWindow} SECOND)");
$totalConversations = $count('SELECT COUNT(*) FROM conversations');
$totalGroups        = $count("SELECT COUNT(*) FROM conversations WHERE type = 'group'");
$totalMessages      = $count('SELECT COUNT(*) FROM messages');
$unreadReports      = $count("SELECT COUNT(*) FROM reports WHERE status = 'open'");

/* Recent users -------------------------------------------------------- */
$recentUsers = $pdo->query(
    'SELECT id, username, full_name, avatar, role, status, created_at
     FROM users ORDER BY id DESC LIMIT 10'
)->fetchAll();

/* Recent messages ----------------------------------------------------- */
$stmt = $pdo->query(
    "SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.deleted, m.created_at,
            u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar,
            c.type AS conv_type, c.name AS conv_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     JOIN conversations c ON c.id = m.conversation_id
     ORDER BY m.id DESC LIMIT 10"
);
$recentMessages = [];
foreach ($stmt->fetchAll() as $r) {
    if ((int)$r['deleted'] === 1) {
        $preview = 'This message was deleted';
    } elseif ($r['type'] === 'text' && $r['content'] !== null) {
        $preview = mb_substr((string)$r['content'], 0, 120);
    } elseif ($r['type'] === 'image') {
        $preview = '[Image]';
    } else {
        $preview = '[File]';
    }
    $recentMessages[] = [
        'id'              => (int)$r['id'],
        'conversation_id' => (int)$r['conversation_id'],
        'sender_id'       => (int)$r['sender_id'],
        'type'            => $r['type'],
        'preview'         => $preview,
        'created_at'      => $r['created_at'],
        'sender'          => [
            'username'  => $r['sender_username'],
            'full_name' => $r['sender_full_name'],
            'avatar'    => $r['sender_avatar'],
        ],
        'conversation'    => [
            'type' => $r['conv_type'],
            'name' => $r['conv_name'],
        ],
    ];
}

/* 14-day series (fill missing days with zero) -------------------------- */
$dailySeries = static function (string $table, string $column): array {
    $buckets = [];
    for ($i = 13; $i >= 0; $i--) {
        $buckets[date('Y-m-d', strtotime("-{$i} days"))] = 0;
    }
    $stmt = db()->prepare(
        "SELECT DATE({$column}) AS d, COUNT(*) AS c
         FROM {$table}
         WHERE {$column} >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE({$column})"
    );
    $stmt->execute();
    foreach ($stmt->fetchAll() as $row) {
        if (isset($buckets[$row['d']])) {
            $buckets[$row['d']] = (int)$row['c'];
        }
    }
    $out = [];
    foreach ($buckets as $day => $count) {
        $out[] = ['date' => $day, 'count' => $count];
    }
    return $out;
};
$chartMessages      = $dailySeries('messages', 'created_at');
$chartRegistrations = $dailySeries('users', 'created_at');

/* Recent admin activity ------------------------------------------------ */
$recentActivity = $pdo->query(
    "SELECT l.id, l.admin_id, l.action, l.target_type, l.target_id, l.details, l.ip, l.created_at,
            u.username AS admin_username, u.full_name AS admin_full_name
     FROM admin_logs l
     JOIN users u ON u.id = l.admin_id
     ORDER BY l.id DESC LIMIT 15"
)->fetchAll();

json_ok([
    'total_users'            => $totalUsers,
    'active_users'           => $onlineUsers,
    'online_users'           => $onlineUsers,
    'total_conversations'    => $totalConversations,
    'total_groups'           => $totalGroups,
    'total_messages'         => $totalMessages,
    'unread_reports'         => $unreadReports,
    'recent_users'           => $recentUsers,
    'recent_messages'        => $recentMessages,
    'chart_messages_14d'     => $chartMessages,
    'chart_registrations_14d' => $chartRegistrations,
    'recent_activity'        => $recentActivity,
]);