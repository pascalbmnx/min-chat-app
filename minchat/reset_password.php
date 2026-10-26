<?php
/**
 * reset_password.php - standalone password reset page (linked from email).
 * Validates the token from the URL and lets the user choose a new password.
 */
declare(strict_types=1);
require_once __DIR__ . '/config.php';

$token = trim((string)($_GET['token'] ?? ''));
$valid = (strlen($token) === 64);

if ($valid) {
    $stmt = db()->prepare(
        'SELECT pr.id, pr.expires_at, pr.used, u.full_name
         FROM password_resets pr JOIN users u ON u.id = pr.user_id
         WHERE pr.token_hash = ? LIMIT 1'
    );
    $stmt->execute([hash('sha256', $token)]);
    $reset = $stmt->fetch();
    $valid = $reset !== false && (int)$reset['used'] === 0 && strtotime($reset['expires_at']) > time();
} else {
    $reset = null;
}

/* handle POST */
if (request_method() === 'POST') {
    csrf_check();
    $resetResult = null;
    $password = (string)($_POST['password'] ?? '');
    if (!str_len($password, 8, 200)) {
        $resetResult = ['error' => 'Password must be at least 8 characters.'];
    } else {
        // re-verify token (fresh read to be safe)
        $stmt = db()->prepare(
            'SELECT id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([hash('sha256', $token)]);
        if ($stmt->fetch()) {
            $upd = db()->prepare('UPDATE users u JOIN password_resets pr ON pr.user_id = u.id SET u.password_hash = ? WHERE pr.token_hash = ?');
            $upd->execute([password_hash($password, PASSWORD_DEFAULT), hash('sha256', $token)]);
            $del = db()->prepare('DELETE FROM password_resets WHERE token_hash = ?');
            $del->execute([hash('sha256', $token)]);
            $resetResult = ['success' => true];
        } else {
            $resetResult = ['error' => 'This reset link is invalid or has expired.'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reset password - Pulse Chat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --bg:#0d0e15; --surface:#12131a; --surface-mid:#1e1f26; --surface-high:#292931;
      --on-surface:#e3e1ec; --on-surface-variant:#c7c4d7; --outline:#908fa0; --divider:rgba(227,225,236,.08);
      --primary:#c0c1ff; --primary-container:#8083ff; --error:#ffb4ab; --shadow-soft:rgba(0,0,0,.3);
      --grad-primary:linear-gradient(135deg,#8083ff,#5b5ef5); }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Plus Jakarta Sans',system-ui,sans-serif; background:var(--bg); color:var(--on-surface);
      min-height:100vh; display:grid; place-items:center; padding:24px; }
    .card { width:100%; max-width:420px; background:var(--surface); border:1px solid var(--divider);
      border-radius:24px; padding:30px 28px; box-shadow:0 24px 60px var(--shadow-soft); }
    .head { display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; margin-bottom:22px; }
    .logo { width:58px; height:58px; border-radius:17px; background:var(--grad-primary); color:#fff;
      display:grid; place-items:center; }
    .logo svg { width:28px; height:28px; }
    h1 { font-size:21px; letter-spacing:-.3px; }
    p.sub { font-size:13.5px; color:var(--on-surface-variant); line-height:1.55; }
    .field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    label { font-size:12.5px; font-weight:600; color:var(--on-surface-variant); }
    input { width:100%; min-height:46px; padding:0 14px; border-radius:12px; font-size:14.5px; color:#fff;
      background:var(--surface-mid); border:1px solid var(--divider); outline:none; }
    input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(192,193,255,.2); }
    .btn { width:100%; height:48px; border-radius:13px; border:0; cursor:pointer; font-size:15px; font-weight:700;
      background:var(--grad-primary); color:#fff; display:flex; align-items:center; justify-content:center; gap:8px; }
    .btn:hover { opacity:.94; }
    .btn:disabled { opacity:.55; cursor:not-allowed; }
    .strength { display:flex; gap:6px; }
    .strength i { flex:1; height:4px; border-radius:3px; background:#33343c; }
    .alert { border-radius:12px; padding:12px 14px; font-size:13.5px; margin-bottom:14px; line-height:1.5; }
    .alert.ok { background:rgba(78,222,163,.12); color:#4edea3; }
    .alert.err { background:rgba(255,180,171,.12); color:var(--error); }
    .muted { color:var(--on-surface-variant); font-size:12.5px; margin-top:14px; text-align:center; }
    body[data-theme="light"] { background:#f4f3fa; --surface:#fff; --surface-mid:#efedf6; --surface-high:#e8e6f0;
      --on-surface:#1b1b21; --on-surface-variant:#4a4a52; --divider:rgba(27,27,33,.08); --outline:#7a7a85;
      --shadow-soft:rgba(28,27,37,.14); --primary:#494bd6; --primary-container:#dddcff;
      --grad-primary:linear-gradient(135deg,#494bd6,#3538b8); }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C7 3 3 6.6 3 11c0 2.1.9 4 2.3 5.5-.2 1.2-.8 2.4-1.8 3.4 1.4.1 2.8-.3 3.9-1 1.4.5 3 .8 4.6.8 5 0 9-3.6 9-8S17 3 12 3z"/></svg></div>
      <h1>Reset your password</h1>
      <?php if ($valid): ?>
        <p class="sub">Set a new password for your <?php echo e(APP_NAME); ?> account<?php echo $reset ? ', ' . e($reset['full_name']) : ''; ?>.</p>
      <?php else: ?>
        <p class="sub">This reset link is invalid, expired, or already used.</p>
      <?php endif; ?>
    </div>

    <?php if (isset($resetResult)): ?>
      <?php if (isset($resetResult['success'])): ?>
        <div class="alert ok">Your password was updated successfully. You can now sign in with your new password.</div>
        <a class="btn" href="index.php">Go to sign in</a>
      <?php else: ?>
        <div class="alert err"><?php echo e($resetResult['error']); ?></div>
      <?php endif; ?>
    <?php elseif ($valid): ?>
      <form method="POST" action="reset_password.php?token=<?php echo e($token); ?>" id="reset-form">
        <input type="hidden" name="csrf" value="<?php echo e(csrf_token()); ?>">
        <div class="field">
          <label for="password">New password</label>
          <input type="password" id="password" name="password" placeholder="At least 8 characters" minlength="8" required>
        </div>
        <div class="field">
          <label for="confirm">Confirm new password</label>
          <input type="password" id="confirm" placeholder="Repeat your password">
        </div>
        <button class="btn" type="submit">Update password</button>
        <p class="muted">Want to sign in instead? <a href="index.php" style="color:var(--primary)">Go to sign in</a></p>
      </form>
    <?php else: ?>
      <a class="btn" href="index.php">Back to sign in</a>
    <?php endif; ?>
  </div>
  <script>
    document.getElementById('reset-form')?.addEventListener('submit', function (e) {
      var p = document.getElementById('password').value;
      var c = document.getElementById('confirm').value;
      if (p !== c) { e.preventDefault(); alert('Passwords do not match.'); return; }
      if (p.length < 8) { e.preventDefault(); alert('Password must be at least 8 characters.'); return; }
    });
  </script>
</body>
</html>