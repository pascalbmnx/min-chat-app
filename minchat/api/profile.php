<?php
/**
 * POST api/profile.php
 *   - update profile fields (full_name, username, bio, theme)
 *   - upload / remove avatar photo
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('POST');
guard_csrf_or_skip();

$me = require_auth();
$myId = (int)$me['id'];

$action = (string)($_GET['action'] ?? input('action', 'update'));

switch ($action) {
    case 'update':
        handle_update($myId);
        break;
    case 'avatar':
        handle_avatar($myId);
        break;
    case 'remove_avatar':
        handle_remove_avatar($myId);
        break;
    default:
        json_error('Unknown profile action.', 400);
}

function handle_update(int $myId): void
{
    $fullName = trim((string)input('full_name', ''));
    $username = trim((string)input('username', ''));
    $bio      = trim((string)input('bio', ''));
    $theme    = (string)input('theme', 'dark');

    if (!str_len($fullName, 2, 100)) {
        json_error('Full name must be 2-100 characters.');
    }
    if (!valid_username($username)) {
        json_error('Username must be 3-30 characters using letters, numbers or underscores.');
    }
    if (!str_len($bio, 0, 500)) {
        json_error('Bio is too long (max 500 characters).');
    }
    if (!in_array($theme, ['dark', 'light'], true)) {
        $theme = 'dark';
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
    $stmt->execute([$username, $myId]);
    if ($stmt->fetch()) {
        json_error('That username is already taken.', 409);
    }

    $upd = db()->prepare('UPDATE users SET full_name = ?, username = ?, bio = ?, theme = ? WHERE id = ?');
    $upd->execute([
        $fullName,
        $username,
        $bio === '' ? null : $bio,
        $theme,
        $myId,
    ]);

    json_ok(['user' => current_user(), 'theme' => $theme]);
}

function handle_avatar(int $myId): void
{
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] === UPLOAD_ERR_NO_FILE) {
        json_error('Please choose an image file.');
    }

    try {
        $stored = store_upload($_FILES['avatar'], 'avatar');
    } catch (RuntimeException $ex) {
        json_error($ex->getMessage());
    }

    $me = current_user();
    if ($me['avatar']) {
        $old = __DIR__ . '/../' . $me['avatar'];
        if (is_file($old)) {
            @unlink($old);
        }
    }

    $upd = db()->prepare('UPDATE users SET avatar = ? WHERE id = ?');
    $upd->execute([$stored['url_path'], $myId]);

    json_ok(['user' => current_user(), 'avatar_url' => $stored['url_path']]);
}

function handle_remove_avatar(int $myId): void
{
    $me = current_user();
    if ($me['avatar']) {
        $old = __DIR__ . '/../' . $me['avatar'];
        if (is_file($old)) {
            @unlink($old);
        }
    }
    $upd = db()->prepare('UPDATE users SET avatar = NULL WHERE id = ?');
    $upd->execute([$myId]);

    json_ok(['user' => current_user()]);
}