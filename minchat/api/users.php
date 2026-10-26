<?php
/**
 * GET api/users.php?q=...   - search users (authenticated)
 * GET api/users.php?id=...  - view a user profile
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');
$me = require_auth();

$id = (int)($_GET['id'] ?? 0);
$q  = trim((string)($_GET['q'] ?? ''));

if ($id > 0) {
    $stmt = db()->prepare(
        'SELECT id, username, full_name, bio, avatar, is_online, last_seen_at, created_at
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if ($user === false) {
        json_error('User not found.', 404);
    }
    $user['online']   = is_online($user);
    $user['self']     = (int)$user['id'] === (int)$me['id'];
    $user['created']  = full_datetime($user['created_at']);
    $user['last_seen'] = time_ago($user['last_seen_at']);
    json_ok(['user' => $user]);
}

if ($q === '' || mb_strlen($q) < 2) {
    json_ok(['users' => []]);
}

$like = '%' . $q . '%';
$stmt = db()->prepare(
    'SELECT id, username, full_name, bio, avatar, is_online, last_seen_at
     FROM users
     WHERE (username LIKE ? OR full_name LIKE ?) AND id <> ?
     ORDER BY (username LIKE ?) DESC, full_name ASC
     LIMIT 12'
);
$stmt->execute([$like, $like, $me['id'], $like]);
$rows = $stmt->fetchAll();

foreach ($rows as &$u) {
    $u['online'] = is_online($u);
}
unset($u);

json_ok(['users' => $rows]);