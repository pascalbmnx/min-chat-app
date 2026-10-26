<?php
/**
 * Pulse Chat - Main entry point (SPA shell).
 * All view rendering is handled client-side by app.js.
 */
declare(strict_types=1);
require_once __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <title>Pulse Chat</title>
  <meta name="description" content="Pulse Chat - Modern messaging platform">
  <meta name="theme-color" content="#0d0e15">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
  <div id="app">
    <div class="skeleton-screen">
      <div class="skeleton-header"></div>
      <div class="skeleton-body">
        <div class="skeleton-line w40"></div>
        <div class="skeleton-line w80"></div>
        <div class="skeleton-line w60"></div>
        <div class="skeleton-line w90"></div>
        <div class="skeleton-line w40"></div>
      </div>
    </div>
  </div>
  <div id="toast-container"></div>
  <div id="modal-container"></div>
  <script>window.PULSE_CSRF = <?php echo json_encode(csrf_token()); ?>;</script>
  <script src="assets/js/app.js"></script>
</body>
</html>