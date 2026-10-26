<?php
/**
 * GET api/session.php
 * Returns current session state, the signed-in user (if any), and a CSRF token.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');

$user = current_user();

$payload = [
    'authenticated' => $user !== null,
    'csrf'          => csrf_token(),
    'user'          => $user,
];

json_ok(['session' => $payload]);