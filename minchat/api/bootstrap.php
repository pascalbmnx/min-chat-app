<?php
/**
 * API bootstrap: request handling, exceptions as JSON, common guards.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/upload.php';

/* Warnings and notices must never be printed into a JSON response: that breaks
   the body and cascades into "headers already sent" failures once output has
   started. They are logged instead and the endpoint keeps returning valid JSON. */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_error_handler(static function (int $no, string $msg, string $file = '', int $line = 0): bool {
    if ((error_reporting() & $no) === 0) {
        return false;
    }
    error_log(sprintf('[api] %s in %s:%d', $msg, $file, $line));
    return true;
});

set_exception_handler(function (Throwable $e): void {
    if (APP_DEV) {
        json_error('Server error: ' . $e->getMessage(), 500, ['trace' => $e->getTraceAsString()]);
    }
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    json_error('An unexpected error occurred.', 500);
});

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

/** Enforce CSRF on non-GET/HEAD requests before handling. */
function guard_csrf_or_skip(): void
{
    if (in_array(request_method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }
    csrf_check();
}

/** Generic error for malformed JSON bodies. */
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return $_POST;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('Invalid JSON request body.', 400);
    }
    return $data;
}