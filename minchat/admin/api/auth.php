<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

if (request_method() === 'GET') {
    $u = admin_user();
    json_ok([
        'authenticated' => $u !== null,
        'user' => $u,
        'csrf' => csrf_token(),
    ]);
}

// POST
guard_csrf_or_skip();
$action = input('action', '');

if ($action === 'logout') {
    if (!empty($_SESSION['user_id'])) {
        db()->prepare('DELETE FROM sessions WHERE session_id = ?')->execute([session_id()]);
        db()->prepare('UPDATE users SET is_online = 0, last_seen_at = NOW() WHERE id = ?')->execute([$_SESSION['user_id']]);
        audit_log('admin_logout', 'user', $_SESSION['user_id']);
    }
    session_regenerate_id(true);
    json_ok();
}

if ($action === 'login') {
    $identifier = trim((string)input('identifier', ''));
    $password   = (string)input('password', '');

    if ($identifier === '' || $password === '') {
        json_error('Please enter your credentials.');
    }

    admin_rate_limit('admin_login', 15, 15);

    $stmt = db()->prepare('SELECT id, username, email, password_hash, role, status FROM users WHERE email = ? OR username = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if ($user === false || !password_verify($password, $user['password_hash'])) {
        usleep(random_int(100000, 200000));
        db()->prepare('INSERT INTO login_attempts (scope, ip, identifier, success) VALUES (?, ?, ?, 0)')
            ->execute(['admin_login', $_SERVER['REMOTE_ADDR'] ?? 'cli', $identifier]);
        json_error('Invalid credentials.');
    }

    if (!in_array($user['role'], ADMIN_ROLES, true)) {
        json_error('You do not have admin access.');
    }
    if ($user['status'] !== 'active') {
        json_error('This account is not active.');
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    db()->prepare('INSERT INTO sessions (user_id, session_id, ip, user_agent) VALUES (?, ?, ?, ?)')
        ->execute([$user['id'], session_id(), $_SERVER['REMOTE_ADDR'] ?? 'cli', mb_substr($_SERVER['HTTP_USER_AGENT'] ?? 'cli', 0, 250)]);
    touch_activity($user['id']);
    db()->prepare('INSERT INTO login_attempts (scope, ip, identifier, success) VALUES (?, ?, ?, 1)')
        ->execute(['admin_login', $_SERVER['REMOTE_ADDR'] ?? 'cli', $identifier]);

    audit_log('admin_login', 'user', $user['id']);
    json_ok([
        'user' => admin_user(),
        'csrf' => csrf_token(),
    ]);
}

json_error('Unknown action.', 400);
