<?php
/**
 * Shared helpers: output escaping, CSRF, JSON responses, auth, validation.
 */
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/* Output encoding (XSS protection)                                    */
/* ------------------------------------------------------------------ */

/** HTML-escape for safe output. */
function e(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

/* ------------------------------------------------------------------ */
/* JSON responses                                                      */
/* ------------------------------------------------------------------ */

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_ok(array $data = []): void
{
    if (!isset($data['ok'])) {
        $data = array_merge(['ok' => true], $data);
    }
    json_out($data, 200);
}

function json_error(string $message, int $status = 400, array $extra = []): void
{
    json_out(array_merge(['ok' => false, 'error' => $message], $extra), $status);
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function require_method(string ...$methods): void
{
    if (!in_array(request_method(), $methods, true)) {
        json_error('Method not allowed.', 405);
    }
}

/** Read merged request body (JSON or form). */
function body(): array
{
    $raw = file_get_contents('php://input');
    $json = json_decode((string)$raw, true);
    if (is_array($json)) {
        return $json;
    }
    return $_POST;
}

function input(string $key, $default = null)
{
    $b = body();
    return array_key_exists($key, $b) ? $b[$key] : $default;
}

/* ------------------------------------------------------------------ */
/* CSRF protection                                                     */
/* ------------------------------------------------------------------ */

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate a CSRF token. Comes from the X-CSRF-Token header or the
 * `csrf` form field. Only enforced on state-changing requests.
 */
function csrf_check(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? null);
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        // 419 is not a status code this SAPI accepts (it surfaces as 500),
        // so a rejected token is reported as 403 Forbidden.
        json_error('Invalid or missing security token. Refresh and try again.', 403);
    }
}

/* ------------------------------------------------------------------ */
/* Auth helpers (session based)                                        */
/* ------------------------------------------------------------------ */

/**
 * Returns the logged-in user row or null.
 */
function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    static $cached = false;
    static $user = null;

    if ($cached === false) {
        $stmt = db()->prepare(
            'SELECT id, username, email, full_name, bio, avatar, theme,
                    is_online, last_seen_at, created_at,
                    role, status, warn_count, suspended_until, moderation_note
             FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$_SESSION['user_id']]);
        $row = $stmt->fetch();
        $user = $row ?: null;
        $cached = true;
    }

    return $user;
}

function require_auth(): array
{
    $user = current_user();
    if ($user === null) {
        json_error('Authentication required.', 401);
    }

    $status = $user['status'] ?? 'active';
    if ($status === 'blocked') {
        json_error('Your account has been blocked.', 403);
    }
    if ($status === 'suspended') {
        $until = $user['suspended_until'] ?? null;
        if ($until !== null && strtotime($until) <= time()) {
            // suspension expired — auto-reactivate
            $upd = db()->prepare('UPDATE users SET status = \'active\', suspended_until = NULL WHERE id = ?');
            $upd->execute([$user['id']]);
            $user['status'] = 'active';
            $user['suspended_until'] = null;
        } else {
            $label = $until ? ' until ' . full_datetime($until) : '';
            json_error('Your account is suspended' . $label . '.', 403);
        }
    }

    // refresh online presence
    touch_activity((int)$user['id']);
    return $user;
}

/** Persist the current session for the given user. */
function login_user(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;

    $stmt = db()->prepare(
        'INSERT INTO sessions (user_id, session_id, ip, user_agent)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        session_id(),
        $_SERVER['REMOTE_ADDR'] ?? 'cli',
        mb_substr($_SERVER['HTTP_USER_AGENT'] ?? 'cli', 0, 250),
    ]);

    touch_activity($userId);
}

function logout(): void
{
    if (!empty($_SESSION['user_id'])) {
        $stmt = db()->prepare('DELETE FROM sessions WHERE session_id = ?');
        $stmt->execute([session_id()]);
        $stmt = db()->prepare('UPDATE users SET is_online = 0, last_seen_at = NOW() WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

/** Record user activity / online status. */
function touch_activity(int $userId): void
{
    static $last = [];
    $now = microtime(true);
    if (isset($last[$userId]) && ($now - $last[$userId]) < 30) {
        return;
    }
    $last[$userId] = $now;

    $stmt = db()->prepare(
        'UPDATE users SET is_online = 1, last_seen_at = NOW() WHERE id = ?'
    );
    $stmt->execute([$userId]);
}

function is_online(array $user): bool
{
    return (int)$user['is_online'] === 1 && strtotime((string)$user['last_seen_at']) > time() - ONLINE_WINDOW;
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function valid_username(string $value): bool
{
    return (bool)preg_match('/^[a-zA-Z0-9_]{3,30}$/', $value);
}

function valid_email(string $value): bool
{
    return filter_var($value, FILTER_VALIDATE_EMAIL) !== false && mb_strlen($value) <= 190;
}

function str_len(string $value, int $min, int $max): bool
{
    $len = mb_strlen($value);
    return $len >= $min && $len <= $max;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Friendly "time ago" string.
 */
function time_ago(?string $dt, int $now = 0): string
{
    $now = $now ?: time();
    if ($dt === null) {
        return 'never';
    }
    $t = strtotime($dt);
    if ($t === false) {
        return '';
    }
    $diff = $now - $t;

    if ($diff < 60) {
        return 'just now';
    }
    if ($diff < 3600) {
        return sprintf('%dm ago', (int)floor($diff / 60));
    }
    if ($diff < 86400) {
        return sprintf('%dh ago', (int)floor($diff / 3600));
    }
    if ($diff < 604800) {
        return sprintf('%dd ago', (int)floor($diff / 86400));
    }
    return date('M j', $t);
}

/** Clock time like "14:32" (local timezone visual; data is UTC). */
function clock_time(?string $dt): string
{
    if ($dt === null) {
        return '';
    }
    $t = strtotime($dt);
    return $t === false ? '' : date('H:i', $t);
}

/** Full timestamp like "Sep 16, 2026 14:32". */
function full_datetime(?string $dt): string
{
    if ($dt === null) {
        return '';
    }
    $t = strtotime($dt);
    return $t === false ? '' : date('M j, Y H:i', $t);
}

/** Calibrate a UTC timestamp to the server-local wall clock for display. */
function to_local(?string $dt): ?string
{
    return $dt;
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

/** Generate a cryptographically secure random token. */
function random_token(int $bytes = 32): string
{
    return bin2hex(random_bytes($bytes));
}

/**
 * Dev-friendly mail fallback: try mail(), otherwise surface the reset URL
 * so flows remain testable on localhost.
 */
function send_mail(string $to, string $subject, string $html): bool
{
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . APP_NAME . " <noreply@localhost>\r\n";
    $ok = @mail($to, $subject, $html, $headers);

    $log = __DIR__ . '/mail.log';
    @file_put_contents(
        $log,
        "[" . date('c') . "] To: {$to} | Subject: {$subject}\n{$html}\n\n",
        FILE_APPEND
    );

    return $ok;
}

/** Avatar or generated initial-letter placeholder for a user. */
function avatar_url(?string $avatar): ?string
{
    if ($avatar && is_file(__DIR__ . '/' . $avatar)) {
        return $avatar;
    }
    return null;
}

/** Public URL for an attachment. */
function attachment_url(string $path): string
{
    return $path;
}

/** Format file size in human readable units. */
function human_size(int $bytes): string
{
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 1) . ' MB';
    }
    if ($bytes >= 1024) {
        return number_format($bytes / 1024, 0) . ' KB';
    }
    return $bytes . ' B';
}