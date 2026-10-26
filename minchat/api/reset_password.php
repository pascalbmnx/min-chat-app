<?php
/**
 * POST api/reset_password.php
 * Validates a reset token and sets a new password.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('POST');
$data = read_json_body();

$token    = trim((string)($data['token'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($token === '' || strlen($token) !== 64) {
    json_error('Invalid reset link.');
}
if (!str_len($password, 8, 200)) {
    json_error('Password must be at least 8 characters.');
}

$stmt = db()->prepare(
    'SELECT id, user_id, expires_at, used FROM password_resets
     WHERE token_hash = ? LIMIT 1'
);
$stmt->execute([hash('sha256', $token)]);
$reset = $stmt->fetch();

if ($reset === false) {
    json_error('This reset link is not valid.', 400, ['code' => 'invalid']);
}

if ((int)$reset['used'] === 1 || strtotime($reset['expires_at']) < time()) {
    json_error('This reset link has expired or was already used.', 400, ['code' => 'expired']);
}

$upd = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$upd->execute([password_hash($password, PASSWORD_DEFAULT), $reset['user_id']]);

$del = db()->prepare('DELETE FROM password_resets WHERE id = ?');
$del->execute([$reset['id']]);

json_ok(['message' => 'Password updated. You can now sign in.']);