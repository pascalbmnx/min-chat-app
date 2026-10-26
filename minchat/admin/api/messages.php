<?php
/**
 * Pulse Chat Admin API - Message management.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

function admin_message_preview(array $row): string
{
    if ((int)$row['deleted'] === 1) {
        return 'This message was deleted';
    }
    if (($row['type'] ?? '') === 'text' && $row['content'] !== null) {
        return mb_substr((string)$row['content'], 0, 120);
    }
    if (($row['type'] ?? '') === 'image') {
        return '[Image]';
    }
    return '[File]';
}

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

if (request_method() === 'GET') {
    require_perm('messages.view');
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid message id.');
        }
        $stmt = db()->prepare(
            "SELECT m.*, u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar,
                    c.type AS conv_type, c.name AS conv_name,
                    a.original_name AS att_original_name, a.url_path AS att_url_path,
                    a.mime_type AS att_mime_type, a.size AS att_size,
                    r.id AS reply_id, r.type AS reply_type, r.content AS reply_content,
                    r.deleted AS reply_deleted, r.sender_id AS reply_sender_id,
                    ru.username AS reply_sender_username, ru.full_name AS reply_sender_full_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             JOIN conversations c ON c.id = m.conversation_id
             LEFT JOIN attachments a ON a.id = m.attachment_id
             LEFT JOIN messages r ON r.id = m.reply_to
             LEFT JOIN users ru ON ru.id = r.sender_id
             WHERE m.id = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $m = $stmt->fetch();
        if ($m === false) {
            json_error('Message not found.', 404);
        }

        $rs = db()->prepare(
            'SELECT mr.read_at, u.id, u.username, u.full_name, u.avatar
             FROM message_reads mr
             JOIN users u ON u.id = mr.user_id
             WHERE mr.message_id = ?
             ORDER BY mr.read_at ASC'
        );
        $rs->execute([$id]);

        json_ok([
            'message'      => $m,
            'sender'       => [
                'id'       => (int)$m['sender_id'],
                'username' => $m['sender_username'],
                'full_name'=> $m['sender_full_name'],
                'avatar'   => $m['sender_avatar'],
            ],
            'conversation' => [
                'id'   => (int)$m['conversation_id'],
                'type' => $m['conv_type'],
                'name' => $m['conv_name'],
            ],
            'attachment'   => $m['attachment_id'] ? [
                'id'            => (int)$m['attachment_id'],
                'original_name' => $m['att_original_name'],
                'url_path'      => $m['att_url_path'],
                'mime_type'     => $m['att_mime_type'],
                'size'          => (int)$m['att_size'],
            ] : null,
            'reply_to'     => $m['reply_id'] ? [
                'id'         => (int)$m['reply_id'],
                'type'       => $m['reply_type'],
                'content'    => $m['reply_content'],
                'deleted'    => (int)$m['reply_deleted'],
                'sender'     => [
                    'id'       => (int)$m['reply_sender_id'],
                    'username' => $m['reply_sender_username'],
                    'full_name'=> $m['reply_sender_full_name'],
                ],
            ] : null,
            'read_by'      => $rs->fetchAll(),
        ]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $q        = trim((string)($_GET['q'] ?? ''));
    $convId   = (int)($_GET['conversation_id'] ?? 0);
    $senderId = (int)($_GET['sender_id'] ?? 0);
    $deleted  = $_GET['deleted'] ?? null;

    $where  = ['1=1'];
    $params = [];
    if ($q !== '') {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $params[':q'] = $like;
        $where[] = 'm.content LIKE :q';
    }
    if ($convId > 0) {
        $params[':conv'] = $convId;
        $where[] = 'm.conversation_id = :conv';
    }
    if ($senderId > 0) {
        $params[':sender'] = $senderId;
        $where[] = 'm.sender_id = :sender';
    }
    if ($deleted === '0' || $deleted === '1') {
        $params[':deleted'] = (int)$deleted;
        $where[] = 'm.deleted = :deleted';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM messages m WHERE {$whereSql}";
    $dataSql  = "SELECT m.*, u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar,
                        c.type AS conv_type, c.name AS conv_name
                 FROM messages m
                 JOIN users u ON u.id = m.sender_id
                 JOIN conversations c ON c.id = m.conversation_id
                 WHERE {$whereSql}
                 ORDER BY m.id DESC
                 LIMIT {$offset}, {$perPage}";

    $res = paginated_response($countSql, $params, $dataSql, $params, $page, $perPage);
    foreach ($res['items'] as $i => $r) {
        $res['items'][$i]['content_preview'] = admin_message_preview($r);
        $res['items'][$i]['sender'] = [
            'username'  => $r['sender_username'],
            'full_name' => $r['sender_full_name'],
            'avatar'    => $r['sender_avatar'],
        ];
        $res['items'][$i]['conversation'] = [
            'type' => $r['conv_type'],
            'name' => $r['conv_name'],
        ];
        unset($res['items'][$i]['sender_username'], $res['items'][$i]['sender_full_name'],
              $res['items'][$i]['sender_avatar'], $res['items'][$i]['conv_type'], $res['items'][$i]['conv_name']);
    }
    json_ok($res);
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'remove' || $action === 'restore') {
    require_perm('messages.remove');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid message id.');
    }
    $stmt = db()->prepare('SELECT id FROM messages WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    if ($stmt->fetch() === false) {
        json_error('Message not found.', 404);
    }
    if ($action === 'remove') {
        db()->prepare('UPDATE messages SET deleted = 1, deleted_at = NOW() WHERE id = ?')->execute([$id]);
        audit_log('remove_message', 'message', $id);
    } else {
        db()->prepare('UPDATE messages SET deleted = 0, deleted_at = NULL WHERE id = ?')->execute([$id]);
        audit_log('restore_message', 'message', $id);
    }
    json_ok();
}

json_error('Unknown action.', 400);