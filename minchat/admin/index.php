<?php
/**
 * Pulse Chat Admin - Dashboard entry point (SPA shell).
 * All view rendering is handled client-side by assets/core.js, ui.js,
 * views.js, views2.js, views3.js and admin.js (loaded in that order).
 */
declare(strict_types=1);
require_once __DIR__ . '/../config.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title><?php echo e(APP_NAME); ?> Admin</title>
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="Administration console for <?php echo e(APP_NAME); ?>">
  <meta name="theme-color" content="#0d0e15">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/admin.css">
</head>
<body>
  <div id="app">
    <div class="boot-screen">
      <div class="boot-logo"></div>
      <div class="spinner"></div>
    </div>
  </div>
  <div id="toast-container"></div>
  <div id="modal-container"></div>
  <script>
    window.APP_NAME     = <?php echo json_encode(APP_NAME); ?>;
    window.PULSE_CSRF   = <?php echo json_encode(csrf_token()); ?>;
  </script>
  <script src="assets/core.js"></script>
  <script src="assets/ui.js"></script>
  <script src="assets/views.js"></script>
  <script src="assets/views2.js"></script>
  <script src="assets/views3.js"></script>
  <script src="assets/admin.js"></script>
</body>
</html>
