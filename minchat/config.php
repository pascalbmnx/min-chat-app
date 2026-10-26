<?php
/**
 * Pulse Chat - Application configuration & bootstrap.
 */
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */
define('APP_NAME', 'Pulse Chat');
define('APP_VERSION', '1.0.0');

/**
 * Developer mode: verbose HTML errors and full stack traces in admin API
 * responses. Driven by the APP_DEV environment variable so it can be turned off
 * per environment instead of being hard-coded on.
 *
 * When APP_DEV is off, error output is suppressed and the admin API returns a
 * generic message, so absolute server paths are never sent to a browser.
 */
define('APP_DEV', filter_var(getenv('APP_DEV') ?: 'false', FILTER_VALIDATE_BOOL));

define('UPLOAD_AVATAR_DIR', __DIR__ . '/uploads/avatars');
define('UPLOAD_FILE_DIR', __DIR__ . '/uploads/files');
define('UPLOAD_AVATAR_URL', 'uploads/avatars/');
define('UPLOAD_FILE_URL', 'uploads/files/');

define('MAX_AVATAR_SIZE', 4 * 1024 * 1024);   // 4 MB
define('MAX_FILE_SIZE',   25 * 1024 * 1024);  // 25 MB
define('ONLINE_WINDOW',   90);                // seconds a user counts as online

/* ------------------------------------------------------------------ */
/* Error handling                                                      */
/* ------------------------------------------------------------------ */
error_reporting(E_ALL);
ini_set('display_errors', APP_DEV ? '1' : '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    // keep JSON API responses clean
    ini_set('display_errors', '0');
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */
if (session_status() === PHP_SESSION_NONE) {
    session_name('pulsechat_sess');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('X-Content-Type-Options: nosniff');
date_default_timezone_set('UTC');

/* ------------------------------------------------------------------ */
/* Database & helpers                                                  */
/* ------------------------------------------------------------------ */
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/helpers.php';