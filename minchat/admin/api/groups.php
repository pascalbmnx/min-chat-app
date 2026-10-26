<?php
/**
 * Pulse Chat Admin API - Group management.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

if (request_method() === 'GET') {
    require_perm('groups.view');
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid group id.');
        }
        $conv = find_conversation($id);
        if ($conv === null || $conv['type'] !== 'group') {
            json_error('Group not found.', 404);
        }

        $creator = db()->prepare('SELECT username, full_name, avatar FROM users WHERE id = ? LIMIT 1');
        $creator->execute([$conv['created_by']]);
        $conv['creator'] = $creator->fetch() ?: null;

        $members = db()->prepare(
            "SELECT u.id, u.username, u.full_name, u.avatar, u.role, u.status,
                    cm.role AS member_role, cm.joined_at
             FROM conversation_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.conversation_id = ?
             ORDER BY (cm.role = 'owner') DESC, cm.joined_at ASC"
        );
        $members->execute([$id]);

        $mc = db()->prepare('SELECT COUNT(*) FROM messages WHERE conversation_id = ?');
        $mc->execute([$id]);

        $cc = db()->prepare('SELECT COUNT(*) FROM conversation_members WHERE conversation_id = ?');
        $cc->execute([$id]);

        $conv['member_count']   = (int)$cc->fetchColumn();
        $conv['created_by_name'] = ($conv['creator']['full_name'] ?? '') ?: ($conv['creator']['username'] ?? 'unknown');

        json_ok([
            'group'         => $conv,
            'members'       => $members->fetchAll(),
            'message_count' => (int)$mc->fetchColumn(),
        ]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $q = trim((string)($_GET['q'] ?? ''));

    $where  = ["c.type = 'group'"];
    $params = [];
    if ($q !== '') {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $params[':q'] = $like;
        $where[] = 'c.name LIKE :q';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM conversations c WHERE {$whereSql}";
    $dataSql  = "SELECT c.id, c.name, c.description, c.photo, c.created_by, c.created_at, c.updated_at,
                        (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) AS member_count,
                        u.full_name AS created_by_name
                 FROM conversations c
                 JOIN users u ON u.id = c.created_by
                 WHERE {$whereSql}
                 ORDER BY c.updated_at DESC
                 LIMIT {$offset}, {$perPage}";

    json_ok(paginated_response($countSql, $params, $dataSql, $params, $page, $perPage));
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
$action = (string)input('action', '');

if ($action === 'remove_group') {
    require_perm('groups.remove');
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid group id.');
    }
    $conv = find_conversation($id);
    if ($conv === null || $conv['type'] !== 'group') {
        json_error('Group not found.', 404);
    }
    db()->prepare('DELETE FROM conversations WHERE id = ?')->execute([$id]);
    audit_log('remove_group', 'group', $id);
    json_ok();
}

if ($action === 'remove_member') {
    require_perm('groups.members_remove');
    $groupId = (int)input('group_id', 0);
    $userId  = (int)input('user_id', 0);
    if ($groupId <= 0) {
        json_error('Invalid group id.');
    }
    if ($userId <= 0) {
        json_error('Invalid user id.');
    }
    $conv = find_conversation($groupId);
    if ($conv === null || $conv['type'] !== 'group') {
        json_error('Group not found.', 404);
    }
    $mem = db()->prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1');
    $mem->execute([$groupId, $userId]);
    $row = $mem->fetch();
    if ($row === false) {
        json_error('That user is not a member of this group.');
    }
    db()->prepare('DELETE FROM conversation_members WHERE id = ?')->execute([$row['id']]);
    audit_log('remove_group_member', 'group', $groupId, 'Removed user #' . $userId);
    json_ok();
}

json_error('Unknown action.', 400);