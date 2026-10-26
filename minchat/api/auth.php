<?php
/**
 * POST api/auth.php
 * Actions: login | register | forgot
 * Requires CSRF (handled by bootstrap for POST).
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('POST');
$data = body();
$action = $data['action'] ?? '';

switch ($action) {
    case 'login':
        handle_login($data);
        break;
    case 'register':
        handle_register($data);
        break;
    case 'forgot':
        handle_forgot($data);
        break;
    default:
        json_error('Unknown auth action.', 400);
}

/* ---------------------------------------------------------------- */

function handle_login(array $data): void
{
    $identifier = trim((string)($data['identifier'] ?? ''));
    $password   = (string)($data['password'] ?? '');

    if ($identifier === '' || $password === '') {
        json_error('Please enter your email or username and password.');
    }

    // simple IP rate-limit: max 15 attempts per 15 min
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $rStmt = db()->prepare(
        'SELECT COUNT(*) AS c FROM login_attempts
         WHERE scope = ? AND ip = ? AND success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)'
    );
    $rStmt->execute(['login', $ip]);
    if ((int)$rStmt->fetchColumn() >= 15) {
        json_error('Too many failed attempts. Please wait 15 minutes and try again.', 429);
    }

    $stmt = db()->prepare(
        'SELECT id, username, email, password_hash, status, suspended_until FROM users
         WHERE email = ? OR username = ? LIMIT 1'
    );
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if ($user === false || !password_verify($password, $user['password_hash'])) {
        // burn time to reduce timing/dictionary risk
        usleep(random_int(120000, 250000));
        // log failed attempt
        $logStmt = db()->prepare('INSERT INTO login_attempts (scope, ip, identifier, success) VALUES (?, ?, ?, 0)');
        $logStmt->execute(['login', $_SERVER['REMOTE_ADDR'] ?? 'cli', $identifier]);
        json_error('Incorrect identifier or password.');
    }

    // account status guard
    $status = $user['status'] ?? 'active';
    if ($status === 'blocked') {
        json_error('This account has been blocked. Please contact support.');
    }
    if ($status === 'suspended') {
        $until = $user['suspended_until'] ?? null;
        if ($until !== null && strtotime($until) <= time()) {
            // suspension expired — auto-reactivate
            $upd = db()->prepare('UPDATE users SET status = \'active\', suspended_until = NULL WHERE id = ?');
            $upd->execute([$user['id']]);
            $user['status'] = 'active';
        } else {
            $label = $until ? ' until ' . full_datetime($until) : '';
            json_error('This account is suspended' . $label . '.');
        }
    }

    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $upd = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $upd->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    }

    login_user((int)$user['id']);

    // log successful login
    db()->prepare('INSERT INTO login_attempts (scope, ip, identifier, success) VALUES (?, ?, ?, 1)')
        ->execute(['login', $_SERVER['REMOTE_ADDR'] ?? 'cli', $identifier]);

    json_ok([
        'user' => current_user(),
        'csrf' => csrf_token(),
    ]);
}

function handle_register(array $data): void
{
    $fullName  = trim((string)($data['full_name'] ?? ''));
    $username  = trim((string)($data['username'] ?? ''));
    $email     = trim((string)($data['email'] ?? ''));
    $password  = (string)($data['password'] ?? '');
    $agree     = !empty($data['agree']);

    if (!str_len($fullName, 2, 100)) {
        json_error('Please provide your full name (2-100 characters).');
    }
    if (!valid_username($username)) {
        json_error('Username must be 3-30 characters using letters, numbers or underscores.');
    }
    if (!valid_email($email)) {
        json_error('Please provide a valid email address.');
    }
    if (!str_len($password, 8, 200)) {
        json_error('Password must be at least 8 characters.');
    }
    if (!$agree) {
        json_error('You must accept the Terms of Service.');
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_error('An account with this email already exists.', 409);
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        json_error('That username is already taken.', 409);
    }

    $stmt = db()->prepare(
        'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $username,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        $fullName,
    ]);

    $userId = (int)db()->lastInsertId();
    login_user($userId);

    json_ok([
        'user' => current_user(),
        'csrf' => csrf_token(),
    ]);
}

function handle_forgot(array $data): void
{
    $identifier = trim((string)($data['identifier'] ?? ''));
    if ($identifier === '') {
        json_error('Please enter your account email or username.');
    }

    $stmt = db()->prepare('SELECT id, email, full_name FROM users WHERE email = ? OR username = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    // Always respond the same way to avoid revealing account existence.
    if ($user === false) {
        json_ok(['sent' => true, 'dev_url' => null]);
    }

    // Invalidate previous tokens for this user.
    $del = db()->prepare('DELETE FROM password_resets WHERE user_id = ?');
    $del->execute([$user['id']]);

    $token = random_token(32);
    $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour

    $ins = db()->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    );
    $ins->execute([$user['id'], hash('sha256', $token), $expires]);

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir    = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    $resetUrl = "{$scheme}://{$host}{$dir}/reset_password.php?token={$token}";

    $html  = '<p>Hi ' . e($user['full_name']) . ',</p>';
    $html .= '<p>You requested a password reset for your ' . e(APP_NAME) . ' account. ';
    $html .= 'This link is valid for 1 hour:</p>';
    $html .= '<p><a href="' . e($resetUrl) . '">Reset your password</a></p>';
    $html .= '<p>If you did not request this, you can safely ignore this email.</p>';

    $sent = send_mail($user['email'], 'Reset your ' . APP_NAME . ' password', $html);

    json_ok([
        'sent'     => $sent,
        'token'    => $sent ? null : $token, // dev fallback: surface link for localhost testing
        'dev_url'  => $sent ? null : $resetUrl,
        'expires'  => $expires,
    ]);
}