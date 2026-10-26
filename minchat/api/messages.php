<?php
/**
 * GET  api/messages.php?conversation_id=..&before=..   - list messages
 * POST api/messages.php                                - send text / image / file
 * POST api/messages.php?action=delete                  - delete a message
 * POST api/messages.php?action=typing                  - typing indicator
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/common.php';

$me = require_auth();
$myId = (int)$me['id'];

/* ----------------------------- GET -------------------------------- */

if (request_method() === 'GET') {
    $convId  = (int)($_GET['conversation_id'] ?? 0);
    $before  = (int)($_GET['before'] ?? 0);
    $limit   = min(80, max(1, (int)($_GET['limit'] ?? 50)));
    $search  = trim((string)($_GET['q'] ?? ''));
    $action  = (string)($_GET['action'] ?? '');

    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);

    /* ---- pinned messages ---- */
    if ($action === 'pinned') {
        $stmt = db()->prepare(
            "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                    u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
             FROM messages m
             LEFT JOIN attachments a ON a.id = m.attachment_id
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ? AND m.pinned = 1 AND m.deleted = 0
             ORDER BY m.id ASC"
        );
        $stmt->execute([$convId]);
        $rows = $stmt->fetchAll();
        $ids = array_map(fn($r) => (int)$r['id'], $rows);
        $readerCounts = read_counts($ids, $myId);
        $messages = [];
        foreach ($rows as $r) {
            $messages[] = build_message_row($r, $convId, $myId, $readerCounts);
        }
        $messages = attach_reply_context($messages);
        json_ok(['messages' => $messages]);
    }

    /* ---- search inside the conversation ---- */
    if ($search !== '') {
        if (mb_strlen($search) < 2) {
            json_error('Type at least 2 characters to search.');
        }
        $stmt = db()->prepare(
            "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                    u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
             FROM messages m
             LEFT JOIN attachments a ON a.id = m.attachment_id
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ? AND m.deleted = 0
               AND ((m.type = 'text' AND m.content LIKE ?) OR a.original_name LIKE ?)
             ORDER BY m.id DESC LIMIT 80"
        );
        $like = '%' . $search . '%';
        $stmt->execute([$convId, $like, $like]);
        $rows = $stmt->fetchAll();
        $ids = array_map(fn($r) => (int)$r['id'], $rows);
        $readerCounts = read_counts($ids, $myId);
        $messages = [];
        foreach (array_reverse($rows) as $r) {
            $messages[] = build_message_row($r, $convId, $myId, $readerCounts);
        }
        $messages = attach_reply_context($messages);
        json_ok(['messages' => $messages]);
    }

    $messages = [];
    if ($before > 0) {
        $stmt = db()->prepare(
            "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                    u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
             FROM messages m
             LEFT JOIN attachments a ON a.id = m.attachment_id
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ? AND m.id < ?
             ORDER BY m.id DESC LIMIT ?"
        );
        $stmt->execute([$convId, $before, $limit]);
    } else {
        $stmt = db()->prepare(
            "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                    u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
             FROM messages m
             LEFT JOIN attachments a ON a.id = m.attachment_id
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ?
             ORDER BY m.id DESC LIMIT ?"
        );
        $stmt->execute([$convId, $limit]);
    }
    $rows = $stmt->fetchAll();

    // read state of these messages for other members (for "double tick")
    $ids = array_map(fn($r) => (int)$r['id'], $rows);
    $readerCounts = read_counts($ids, $myId);

    foreach (array_reverse($rows) as $r) {
        $messages[] = build_message_row($r, $convId, $myId, $readerCounts);
    }
    $messages = attach_reply_context($messages);

    // live typing indicators inside this conversation
    $typing = [];
    $stmt = db()->prepare(
        "SELECT t.user_id, u.username, u.full_name
         FROM typing_status t JOIN users u ON u.id = t.user_id
         WHERE t.conversation_id = ? AND t.user_id <> ? AND t.updated_at > (NOW() - INTERVAL 6 SECOND)"
    );
    $stmt->execute([$convId, $myId]);
    foreach ($stmt->fetchAll() as $t) {
        $typing[] = ['id' => (int)$t['user_id'], 'username' => $t['username'], 'full_name' => $t['full_name']];
    }

    json_ok([
        'messages'      => $messages,
        'typing'        => $typing,
        'has_more'      => count($rows) === $limit,
        'conversation'  => [
            'id'          => $convId,
            'type'        => $conv['type'],
            'name'        => $conv['name'],
            'photo'       => $conv['photo'],
            'description' => $conv['description'],
            'role'        => $member['role'],
        ],
    ]);
}

/* ----------------------------- POST ------------------------------- */

guard_csrf_or_skip();
$action = (string)($_GET['action'] ?? input('action', ''));

switch ($action) {
    case 'delete':
        handle_delete($myId);
        break;
    case 'typing':
        handle_typing($myId);
        break;
    case 'pin':
        handle_pin($myId);
        break;
    case 'forward':
        handle_forward($myId);
        break;
    default:
        handle_send($myId);
}

/* ------------------------------------------------------------------ */

function handle_delete(int $myId): void
{
    $messageId = (int)input('message_id', 0);
    if ($messageId <= 0) {
        json_error('Message required.');
    }

    $stmt = db()->prepare('SELECT id, conversation_id, sender_id, attachment_id FROM messages WHERE id = ? LIMIT 1');
    $stmt->execute([$messageId]);
    $msg = $stmt->fetch();
    if ($msg === false) {
        json_error('Message not found.', 404);
    }
    if ((int)$msg['sender_id'] !== $myId) {
        json_error('You can only delete your own messages.', 403);
    }

    $upd = db()->prepare('UPDATE messages SET deleted = 1, deleted_at = NOW() WHERE id = ?');
    $upd->execute([$messageId]);

    // clear any replies pointing at this message
    $clearReply = db()->prepare('UPDATE messages SET reply_to = NULL WHERE reply_to = ?');
    $clearReply->execute([$messageId]);

    // remove the attachment row + file if it is exclusively owned by this message
    if ((int)$msg['attachment_id'] > 0) {
        $att = db()->prepare('SELECT id, stored_name FROM attachments WHERE id = ? LIMIT 1');
        $att->execute([(int)$msg['attachment_id']]);
        $file = $att->fetch();
        if ($file) {
            // only unlink the physical file when no other attachment row still references it
            $still = db()->prepare('SELECT COUNT(*) AS c FROM attachments WHERE stored_name = ? AND id <> ?');
            $still->execute([$file['stored_name'], (int)$file['id']]);
            if ((int)$still->fetchColumn() === 0 && is_file(UPLOAD_FILE_DIR . '/' . $file['stored_name'])) {
                @unlink(UPLOAD_FILE_DIR . '/' . $file['stored_name']);
            }
            $delAtt = db()->prepare('DELETE FROM attachments WHERE id = ?');
            $delAtt->execute([(int)$file['id']]);
        }
    }

    json_ok(['message_id' => $messageId]);
}

function handle_pin(int $myId): void
{
    $messageId = (int)input('message_id', 0);
    if ($messageId <= 0) {
        json_error('Message required.');
    }

    $stmt = db()->prepare(
        'SELECT m.id, m.sender_id, m.conversation_id, m.pinned
         FROM messages m WHERE m.id = ? LIMIT 1'
    );
    $stmt->execute([$messageId]);
    $m = $stmt->fetch();
    if ($m === false) {
        json_error('Message not found.', 404);
    }

    [$conv, $member] = conversation_guard((int)$m['conversation_id'], $myId);

    // own message, or an admin/owner of a group conversation
    $canPin = (int)$m['sender_id'] === $myId
        || ($conv['type'] === 'group' && in_array($member['role'], ['owner', 'admin'], true));
    if (!$canPin) {
        json_error('You cannot pin this message.', 403);
    }

    $newVal = (int)$m['pinned'] === 1 ? 0 : 1;
    $upd = db()->prepare('UPDATE messages SET pinned = ? WHERE id = ?');
    $upd->execute([$newVal, $messageId]);

    $msgStmt = db()->prepare(
        "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
         FROM messages m
         LEFT JOIN attachments a ON a.id = m.attachment_id
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.id = ? LIMIT 1"
    );
    $msgStmt->execute([$messageId]);
    $r = $msgStmt->fetch();
    $readerCounts = read_counts([$messageId], $myId);

    json_ok([
        'message' => attach_reply_context([build_message_row($r, (int)$m['conversation_id'], $myId, $readerCounts)])[0],
        'pinned'  => $newVal === 1,
    ]);
}

function handle_forward(int $myId): void
{
    $messageId = (int)input('message_id', 0);
    $targetId  = (int)input('conversation_id', 0);
    if ($messageId <= 0 || $targetId <= 0) {
        json_error('Message and target conversation required.');
    }

    // must be a member of the source conversation to forward its message
    $stmt = db()->prepare('SELECT id, conversation_id, type, content, attachment_id, deleted FROM messages WHERE id = ? LIMIT 1');
    $stmt->execute([$messageId]);
    $src = $stmt->fetch();
    if ($src === false) {
        json_error('Message not found.', 404);
    }
    if ((int)$src['deleted'] === 1) {
        json_error('This message was deleted.', 400);
    }
    [$srcConv, ] = conversation_guard((int)$src['conversation_id'], $myId);
    [$tgtConv, ] = conversation_guard($targetId, $myId);
    if (!$srcConv || !$tgtConv) {
        json_error('Conversation not found.', 404);
    }

    // duplicate the attachment row (shared file, independent lifecycle)
    $attachmentId = null;
    if ((int)$src['attachment_id'] > 0) {
        $att = db()->prepare('SELECT * FROM attachments WHERE id = ? LIMIT 1');
        $att->execute([(int)$src['attachment_id']]);
        $file = $att->fetch();
        if ($file !== false) {
            $insAtt = db()->prepare(
                'INSERT INTO attachments (user_id, original_name, stored_name, url_path, mime_type, size)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $insAtt->execute([
                $myId,
                $file['original_name'],
                $file['stored_name'],
                $file['url_path'],
                $file['mime_type'],
                (int)$file['size'],
            ]);
            $attachmentId = (int)db()->lastInsertId();
        }
    }

    $type = $src['type'];
    $content = $src['content'];

    db()->beginTransaction();
    try {
        $ins = db()->prepare(
            'INSERT INTO messages (conversation_id, sender_id, type, content, attachment_id)
             VALUES (?, ?, ?, ?, ?)'
        );
        $ins->execute([$targetId, $myId, $type, $content === null ? null : (string)$content, $attachmentId]);
        $newId = (int)db()->lastInsertId();

        $upd = db()->prepare('UPDATE conversations SET updated_at = NOW() WHERE id = ?');
        $upd->execute([$targetId]);

        $del = db()->prepare('DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?');
        $del->execute([$targetId, $myId]);

        $notify = db()->prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id <> ?');
        $notify->execute([$targetId, $myId]);
        $otherIds = array_map(fn($r) => (int)$r['user_id'], $notify->fetchAll());
        $meRow = current_user();
        $preview = match ($type) {
            'image' => 'Forwarded an image',
            'file'  => 'Forwarded a file',
            default => mb_substr((string)$content, 0, 120),
        };
        foreach ($otherIds as $uid) {
            create_notification($uid, 'message', (string)$meRow['full_name'], $preview, $targetId, $myId);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    $msgStmt = db()->prepare(
        "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
         FROM messages m
         LEFT JOIN attachments a ON a.id = m.attachment_id
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.id = ? LIMIT 1"
    );
    $msgStmt->execute([$newId]);
    $r = $msgStmt->fetch();
    $readerCounts = read_counts([$newId], $myId);

    json_ok(['message' => build_message_row($r, $targetId, $myId, $readerCounts)]);
}

/** Count other-member readers for a set of message ids. */
function read_counts(array $ids, int $myId): array
{
    $readerCounts = [];
    if (empty($ids)) {
        return $readerCounts;
    }
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare(
        "SELECT mm.message_id, COUNT(*) AS c
         FROM message_reads mm
         JOIN messages m2 ON m2.id = mm.message_id
         JOIN conversation_members cmm ON cmm.conversation_id = m2.conversation_id AND cmm.user_id = mm.user_id
         WHERE mm.message_id IN ({$ph}) AND mm.user_id <> ?
         GROUP BY mm.message_id"
    );
    $stmt->execute(array_merge($ids, [$myId]));
    foreach ($stmt->fetchAll() as $rr) {
        $readerCounts[(int)$rr['message_id']] = (int)$rr['c'];
    }
    return $readerCounts;
}

/** Attach reply-context (quoted message) to a set of message rows. */
function attach_reply_context(array $messages): array
{
    $replyIds = array_values(array_unique(array_filter(array_map(fn($m) => $m['reply_to'] ?? 0, $messages))));
    $lookup = [];
    if ($replyIds) {
        $ph = implode(',', array_fill(0, count($replyIds), '?'));
        $stmt = db()->prepare(
            "SELECT m.id, m.content, m.deleted, m.type,
                    u.username AS sender_username, u.full_name AS sender_full_name
             FROM messages m
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.id IN ({$ph})"
        );
        $stmt->execute($replyIds);
        foreach ($stmt->fetchAll() as $rq) {
            $lookup[(int)$rq['id']] = [
                'id'      => (int)$rq['id'],
                'type'    => $rq['type'],
                'content' => (int)$rq['deleted'] === 1 ? null : $rq['content'],
                'deleted' => (int)$rq['deleted'] === 1,
                'sender'  => [
                    'username'  => $rq['sender_username'],
                    'full_name' => $rq['sender_full_name'],
                ],
            ];
        }
    }
    foreach ($messages as &$m) {
        $rid = (int)($m['reply_to'] ?? 0);
        $m['reply_to'] = $rid > 0 ? ($lookup[$rid] ?? ['id' => $rid, 'content' => null, 'deleted' => true, 'type' => 'text', 'sender' => null]) : null;
    }
    return $messages;
}

/** Build the API-safe message object from a raw SELECT row. */
function build_message_row(array $r, int $convId, int $myId, array $readerCounts): array
{
    return [
        'id'         => (int)$r['id'],
        'conversation_id' => $convId,
        'sender_id'  => (int)$r['sender_id'],
        'type'       => $r['type'],
        'content'    => $r['content'],
        'deleted'    => (int)$r['deleted'],
        'pinned'     => (int)$r['pinned'],
        'reply_to'   => !empty($r['reply_to']) ? (int)$r['reply_to'] : null,
        'created_at' => $r['created_at'],
        'reads'      => $readerCounts[(int)$r['id']] ?? 0,
        'mine'       => (int)$r['sender_id'] === $myId,
        'sender'     => [
            'id'        => (int)$r['sender_id'],
            'username'  => $r['sender_username'],
            'full_name' => $r['sender_full_name'],
            'avatar'    => $r['sender_avatar'],
        ],
        'attachment' => $r['attachment_id'] ? [
            'id'            => (int)$r['attachment_id'],
            'original_name' => $r['original_name'],
            'url_path'      => $r['url_path'],
            'mime_type'     => $r['mime_type'],
            'size'          => (int)$r['size'],
        ] : null,
    ];
}

function handle_typing(int $myId): void
{
    $convId  = (int)input('conversation_id', 0);
    $typing  = (bool)(input('typing', false));

    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);

    if ($typing) {
        $stmt = db()->prepare(
            'INSERT INTO typing_status (conversation_id, user_id, updated_at)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()'
        );
        $stmt->execute([$convId, $myId]);
    } else {
        $stmt = db()->prepare('DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?');
        $stmt->execute([$convId, $myId]);
    }

    json_ok();
}

function handle_send(int $myId): void
{
    $convId = (int)input('conversation_id', 0);
    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);

    $content = trim((string)input('content', ''));
    $hasFile = isset($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE;
    $replyTo = (int)input('reply_to', 0);

    // optional caption for attachments
    if ($content === '' && !$hasFile) {
        json_error('Message cannot be empty.');
    }
    if ($content !== '') {
        $content = mb_substr($content, 0, 5000);
    }

    // validate reply target belongs to the same conversation
    if ($replyTo > 0) {
        $chk = db()->prepare(
            'SELECT id FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1'
        );
        $chk->execute([$replyTo, $convId]);
        if (!$chk->fetch()) {
            json_error('Reply target not found in this conversation.', 400);
        }
    }

    $attachmentId = null;
    $type = 'text';

    if ($hasFile) {
        $fileType = input('file_type', '') === 'image' ? 'image' : 'file';

        try {
            $stored = store_upload($_FILES['attachment'], 'attachment');
        } catch (RuntimeException $ex) {
            json_error($ex->getMessage());
        }

        $ins = db()->prepare(
            'INSERT INTO attachments (user_id, original_name, stored_name, url_path, mime_type, size)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $myId,
            $stored['original_name'],
            $stored['stored_name'],
            $stored['url_path'],
            $stored['mime_type'],
            $stored['size'],
        ]);
        $attachmentId = (int)db()->lastInsertId();

        // images are rendered inline
        $isImage = in_array($stored['mime_type'], ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true);
        $type = $isImage ? 'image' : 'file';
        if ($fileType === 'image' && !$isImage) {
            $type = 'file';
        }
    }

    db()->beginTransaction();
    try {
        $ins = db()->prepare(
            'INSERT INTO messages (conversation_id, sender_id, type, content, attachment_id, reply_to)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([$convId, $myId, $type, $content === '' ? null : $content, $attachmentId, $replyTo > 0 ? $replyTo : null]);
        $messageId = (int)db()->lastInsertId();

        $upd = db()->prepare('UPDATE conversations SET updated_at = NOW() WHERE id = ?');
        $upd->execute([$convId]);

        // clear my typing state
        $del = db()->prepare('DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?');
        $del->execute([$convId, $myId]);

        // notify other members (used for toasts / unread bell)
        $notify = db()->prepare(
            'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id <> ?'
        );
        $notify->execute([$convId, $myId]);
        $otherIds = array_map(fn($r) => (int)$r['user_id'], $notify->fetchAll());

        $meRow = current_user();
        $preview = match ($type) {
            'image' => 'Sent an image',
            'file'  => 'Sent a file' . ($content !== '' ? ': ' . $content : ''),
            default => mb_substr($content, 0, 120),
        };
        foreach ($otherIds as $uid) {
            create_notification(
                $uid,
                'message',
                (string)$meRow['full_name'],
                $preview,
                $convId,
                $myId
            );
        }

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    // Provide typed rows so the client can render instantly.
    $msgStmt = db()->prepare(
        "SELECT m.*, a.original_name, a.url_path, a.mime_type, a.size,
                u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
         FROM messages m
         LEFT JOIN attachments a ON a.id = m.attachment_id
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.id = ? LIMIT 1"
    );
    $msgStmt->execute([$messageId]);
    $r = $msgStmt->fetch();
    $readerCounts = read_counts([$messageId], $myId);
    $message = build_message_row($r, $convId, $myId, $readerCounts);
    $message = attach_reply_context([$message])[0];

    json_ok(['message' => $message]);
}