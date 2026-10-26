<?php
/**
 * POST api/logout.php
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('POST');

logout();

json_ok(['csrf' => csrf_token()]);