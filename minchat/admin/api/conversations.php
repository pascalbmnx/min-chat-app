<?php
/**
 * Pulse Chat Admin API - Conversation management.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

function admin_message_preview(array $row): string
{
    if ((int)($row['deleted'] ?? 0) === 1) {
        return 'This message was deleted';
    }
    if (($row['type'] ?? '') === 'text' && ($row['content'] ?? null) !== null) {
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
    require_perm('convs.view');
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid conversation id.');
        }
        $conv = find_conversation($id);
        if ($conv === null) {
            json_error('Conversation not found.', 404);
        }

        $members = db()->prepare(
            "SELECT u.id, u.username, u.full_name, u.avatar, u.status, u.role AS user_role,
                    cm.role AS member_role, cm.joined_at
             FROM conversation_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.conversation_id = ?
             ORDER BY (cm.role = 'owner') DESC, cm.joined_at ASC"
        );
        $members->execute([$id]);
        $membersRows = $members->fetchAll();

        $msgs = db()->prepare(
            'SELECT m.*, u.username AS sender_username, u.full_name AS sender_full_name, u.avatar AS sender_avatar
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ?
             ORDER BY m.id DESC LIMIT 20'
        );
        $msgs->execute([$id]);
        $recent = [];
        foreach ($msgs->fetchAll() as $m) {
            $m['preview'] = admin_message_preview($m);
            $m['sender']  = [
                'id'        => (int)$m['sender_id'],
                'username'  => $m['sender_username'],
                'full_name' => $m['sender_full_name'],
                'avatar'    => $m['sender_avatar'],
            ];
            $recent[] = $m;
        }

        if ($conv['type'] === 'direct') {
            $others = array_values(array_filter($membersRows, fn($m) => (int)$m['id'] !== (int)$ADMIN['id']));
            $conv['title'] = $conv['name'] ?: (($others[0]['full_name'] ?? '') !== '' ? $others[0]['full_name'] : 'Direct chat #' . $conv['id']);
        } else {
            $conv['title'] = $conv['name'] ?: 'Group #' . $conv['id'];
        }

        json_ok([
            'conversation'    => $conv,
            'members'         => $membersRows,
            'recent_messages' => $recent,
        ]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $q    = trim((string)($_GET['q'] ?? ''));
    $type = (string)($_GET['type'] ?? '');

    $where  = ['1=1'];
    $params = [];
    // Named placeholders, one per marker: native prepares cannot reuse a name.
    if ($q !== '') {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $params[':q_name']      = $like;
        $params[':q_full_name'] = $like;
        $params[':q_username']  = $like;
        $where[] = "(c.name LIKE :q_name
                    OR (c.type = 'direct' AND EXISTS (
                        SELECT 1 FROM conversation_members cmq
                        JOIN users uq ON uq.id = cmq.user_id
                        WHERE cmq.conversation_id = c.id
                          AND (uq.full_name LIKE :q_full_name OR uq.username LIKE :q_username)
                    )))";
    }
    if (in_array($type, ['direct', 'group'], true)) {
        $params[':type'] = $type;
        $where[] = 'c.type = :type';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM conversations c WHERE {$whereSql}";
    $dataSql  = "SELECT c.id, c.type, c.name, c.description, c.photo, c.created_by, c.created_at, c.updated_at,
                        (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) AS member_count,
                        u.full_name AS created_by_name,
                        m.id AS last_message_id, m.sender_id AS last_sender_id, m.type AS last_type,
                        m.content AS last_content, m.deleted AS last_deleted, m.created_at AS last_created_at,
                        lm.full_name AS last_sender_name
                 FROM conversations c
                 JOIN users u ON u.id = c.created_by
                 LEFT JOIN messages m ON m.id = (SELECT MAX(mx.id) FROM messages mx WHERE mx.conversation_id = c.id)
                 LEFT JOIN users lm ON lm.id = m.sender_id
                 WHERE {$whereSql}
                 ORDER BY c.updated_at DESC
                 LIMIT {$offset}, {$perPage}";

    $res = paginated_response($countSql, $params, $dataSql, $params, $page, $perPage);
    foreach ($res['items'] as $i => $r) {
        $title = $r['name'] ?: ($r['type'] === 'group' ? 'Group #' . $r['id'] : 'Direct chat');
        $last  = null;
        if ($r['last_message_id']) {
            $last = [
                'id'         => (int)$r['last_message_id'],
                'sender_id'  => (int)$r['last_sender_id'],
                'sender_name'=> $r['last_sender_name'],
                'type'       => $r['last_type'],
                'preview'    => admin_message_preview($r),
                'created_at' => $r['last_created_at'],
            ];
        }
        $res['items'][$i]['title']        = $title;
        $res['items'][$i]['last_message'] = $last;
        unset($res['items'][$i]['last_message_id'], $res['items'][$i]['last_sender_id'],
              $res['items'][$i]['last_type'], $res['items'][$i]['last_content'],
              $res['items'][$i]['last_deleted'], $res['items'][$i]['last_created_at'],
              $res['items'][$i]['last_sender_name']);
    }
    json_ok($res);
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'remove') {
    require_perm('convs.remove');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid conversation id.');
    }
    $conv = find_conversation($id);
    if ($conv === null) {
        json_error('Conversation not found.', 404);
    }
    db()->prepare('DELETE FROM conversations WHERE id = ?')->execute([$id]);
    audit_log('remove_conversation', 'conversation', $id);
    json_ok();
}

json_error('Unknown action.', 400);