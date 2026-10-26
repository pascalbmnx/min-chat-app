<?php
/**
 * Pulse Chat Admin API - Moderation reports.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$ADMIN = require_admin();

const ADMIN_REPORT_STATUSES = ['open', 'in_review', 'resolved', 'rejected'];
const ADMIN_REPORT_TYPES    = ['user', 'message', 'group', 'profile', 'other'];

function admin_find_report(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM reports WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $r = $stmt->fetch();
    if ($r === false) {
        json_error('Report not found.', 404);
    }
    return $r;
}

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

if (request_method() === 'GET') {
    require_perm('reports.view');
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'view') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid report id.');
        }
        $stmt = db()->prepare(
            "SELECT r.*, rep.username AS reporter_username, rep.full_name AS reporter_full_name,
                    ass.username AS assignee_username, ass.full_name AS assignee_full_name,
                    res.username AS resolved_by_username, res.full_name AS resolved_by_full_name
             FROM reports r
             LEFT JOIN users rep ON rep.id = r.reporter_id
             LEFT JOIN users ass ON ass.id = r.assignee_id
             LEFT JOIN users res ON res.id = r.resolved_by
             WHERE r.id = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $r = $stmt->fetch();
        if ($r === false) {
            json_error('Report not found.', 404);
        }

        /* Normalised people objects so the detail payload matches the list shape.
           LEFT JOINs can omit columns, so every key is read defensively. */
        $person = static function (array $row, string $idKey, string $userPrefix): ?array {
            $id = $row[$idKey] ?? null;
            if ($id === null) {
                return null;
            }
            return [
                'id'        => (int)$id,
                'username'  => $row[$userPrefix . '_username'] ?? null,
                'full_name' => $row[$userPrefix . '_full_name'] ?? null,
            ];
        };

        // NB: the reports table column is "resolved_by", not "resolved_by_id".
        $r['reporter']    = $person($r, 'reporter_id', 'reporter');
        $r['assignee']    = $person($r, 'assignee_id', 'assignee');
        $r['resolved_by'] = $person($r, 'resolved_by', 'resolved_by');

        $target = ['type' => $r['target_type'] ?? 'other'];
        if (($r['target_user_id'] ?? null) !== null) {
            $s = db()->prepare('SELECT id, username, full_name, role, status, warn_count, suspended_until FROM users WHERE id = ? LIMIT 1');
            $s->execute([$r['target_user_id']]);
            $row = $s->fetch();
            if ($row !== false) {
                $target['user'] = $row;
            }
        }
        if (($r['target_message_id'] ?? null) !== null) {
            $s = db()->prepare(
                "SELECT m.id, m.type, m.content, m.deleted, m.created_at,
                        u.id AS sender_id, u.username AS sender_username, u.full_name AS sender_full_name,
                        c.id AS conversation_id, c.type AS conv_type, c.name AS conv_name
                 FROM messages m
                 JOIN users u ON u.id = m.sender_id
                 JOIN conversations c ON c.id = m.conversation_id
                 WHERE m.id = ? LIMIT 1"
            );
            $s->execute([$r['target_message_id']]);
            $row = $s->fetch();
            if ($row !== false) {
                $row['content_preview'] = mb_substr((string)$row['content'], 0, 120);
                $row['sender'] = [
                    'id'        => (int)$row['sender_id'],
                    'username'  => $row['sender_username'],
                    'full_name' => $row['sender_full_name'],
                ];
                $row['conversation'] = [
                    'id'   => (int)$row['conversation_id'],
                    'type' => $row['conv_type'],
                    'name' => $row['conv_name'],
                ];
                unset($row['sender_username'], $row['sender_full_name'], $row['conv_type'], $row['conv_name']);
                $target['message'] = $row;
            }
        }
        if (($r['target_conversation_id'] ?? null) !== null) {
            $s = db()->prepare(
                "SELECT c.id, c.type, c.name, c.description,
                        (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) AS member_count
                 FROM conversations c WHERE c.id = ? LIMIT 1"
            );
            $s->execute([$r['target_conversation_id']]);
            $row = $s->fetch();
            if ($row !== false) {
                $target['group'] = $row;
            }
        }

        json_ok([
            'report' => $r,
            'target' => $target,
        ]);
    }

    if ($action !== 'list') {
        json_error('Unknown action.', 400);
    }

    ['page' => $page, 'per_page' => $perPage, 'offset' => $offset] = pagination_params();
    $status     = (string)($_GET['status'] ?? '');
    $targetType = (string)($_GET['target_type'] ?? '');

    $where  = ['1=1'];
    $params = [];
    if (in_array($status, ADMIN_REPORT_STATUSES, true)) {
        $params[':status'] = $status;
        $where[] = 'r.status = :status';
    }
    if (in_array($targetType, ADMIN_REPORT_TYPES, true)) {
        $params[':target'] = $targetType;
        $where[] = 'r.target_type = :target';
    }
    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM reports r WHERE {$whereSql}";
    $dataSql  = "SELECT r.*, rep.username AS reporter_username, rep.full_name AS reporter_full_name,
                        ass.username AS assignee_username, ass.full_name AS assignee_full_name,
                        res.username AS resolved_by_username, res.full_name AS resolved_by_full_name,
                        tu.username AS target_username, tu.full_name AS target_full_name,
                        tm.content AS target_message_content, tm.type AS target_message_type,
                        tc.name AS target_conversation_name, tc.type AS target_conversation_type
                 FROM reports r
                 JOIN users rep ON rep.id = r.reporter_id
                 LEFT JOIN users ass ON ass.id = r.assignee_id
                 LEFT JOIN users res ON res.id = r.resolved_by
                 LEFT JOIN users tu ON tu.id = r.target_user_id
                 LEFT JOIN messages tm ON tm.id = r.target_message_id
                 LEFT JOIN conversations tc ON tc.id = r.target_conversation_id
                 WHERE {$whereSql}
                 ORDER BY r.id DESC
                 LIMIT {$offset}, {$perPage}";

    $res = paginated_response($countSql, $params, $dataSql, $params, $page, $perPage);
    $res['items'] = array_map(static function (array $x): array {
        return [
            'id'          => (int)$x['id'],
            'reporter'    => [
                'id'       => (int)$x['reporter_id'],
                'username' => $x['reporter_username'],
                'full_name'=> $x['reporter_full_name'],
            ],
            'target_type' => $x['target_type'],
            'target_user' => $x['target_user_id'] !== null ? [
                'id'       => (int)$x['target_user_id'],
                'username' => $x['target_username'],
                'full_name'=> $x['target_full_name'],
            ] : null,
            'target_message' => $x['target_message_id'] !== null ? [
                'id'         => (int)$x['target_message_id'],
                'type'       => $x['target_message_type'],
                'content'    => $x['target_message_content'],
                'preview'    => mb_substr((string)$x['target_message_content'], 0, 120),
            ] : null,
            'target_conversation' => $x['target_conversation_id'] !== null ? [
                'id'   => (int)$x['target_conversation_id'],
                'name' => $x['target_conversation_name'],
                'type' => $x['target_conversation_type'],
            ] : null,
            'category'     => $x['category'],
            'details'      => $x['details'],
            'status'       => $x['status'],
            'assignee'     => $x['assignee_id'] !== null ? [
                'id'       => (int)$x['assignee_id'],
                'username' => $x['assignee_username'],
                'full_name'=> $x['assignee_full_name'],
            ] : null,
            'resolved_by'  => $x['resolved_by'] !== null ? [
                'id'       => (int)$x['resolved_by'],
                'username' => $x['resolved_by_username'],
                'full_name'=> $x['resolved_by_full_name'],
            ] : null,
            'moderation_note' => $x['moderation_note'],
            'resolved_at'  => $x['resolved_at'],
            'created_at'   => $x['created_at'],
        ];
    }, $res['items']);
    json_ok($res);
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

guard_csrf_or_skip();
require_perm('reports.handle');
$action = (string)input('action', '');

if ($action === 'assign') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid report id.');
    }
    $r = admin_find_report($id);
    if (in_array($r['status'], ['resolved', 'rejected'], true)) {
        json_error('Cannot assign a resolved or rejected report.');
    }
    db()->prepare("UPDATE reports SET assignee_id = ?, status = 'in_review' WHERE id = ?")
        ->execute([$ADMIN['id'], $id]);
    audit_log('report_assign', 'report', $id, 'Assigned to @' . $ADMIN['username']);
    json_ok();
}

if ($action === 'note') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid report id.');
    }
    $r = admin_find_report($id);
    $note = trim((string)input('note', ''));
    if ($note === '') {
        json_error('Please provide a note.');
    }
    $combined = trim((string)$r['moderation_note'] . "\n" . date('Y-m-d H:i') . ' (#' . $ADMIN['id'] . '): ' . $note);
    if (mb_strlen($combined) > 1000) {
        json_error('Moderation note is too long.');
    }
    db()->prepare('UPDATE reports SET moderation_note = ? WHERE id = ?')->execute([$combined, $id]);
    audit_log('report_note', 'report', $id, $note);
    json_ok();
}

if ($action === 'resolve' || $action === 'reject') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid report id.');
    }
    $r = admin_find_report($id);
    if (in_array($r['status'], ['resolved', 'rejected'], true)) {
        json_error('This report has already been resolved.');
    }
    $note = trim((string)input('note', ''));
    $combined = trim((string)$r['moderation_note'] . "\n" . date('Y-m-d H:i') . ' (#' . $ADMIN['id'] . '): ' . $note);
    if (mb_strlen($combined) > 1000) {
        json_error('Moderation note is too long.');
    }
    $status = $action === 'resolve' ? 'resolved' : 'rejected';
    db()->prepare("UPDATE reports SET status = ?, resolved_by = ?, resolved_at = NOW(), moderation_note = ? WHERE id = ?")
        ->execute([$status, $ADMIN['id'], $combined, $id]);
    audit_log($action === 'resolve' ? 'report_resolve' : 'report_reject', 'report', $id, $note);
    json_ok();
}

if ($action === 'action_remove_message') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid report id.');
    }
    $r = admin_find_report($id);
    $msgId = (int)$r['target_message_id'];
    if ($msgId <= 0) {
        json_error('This report has no message target.');
    }
    if (in_array($r['status'], ['resolved', 'rejected'], true)) {
        json_error('This report has already been resolved.');
    }
    db()->prepare('UPDATE messages SET deleted = 1, deleted_at = NOW() WHERE id = ?')->execute([$msgId]);
    db()->prepare("UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW(), moderation_note = ? WHERE id = ?")
        ->execute([$ADMIN['id'], trim((string)$r['moderation_note'] . "\nMessage removed."), $id]);
    audit_log('report_action_remove_message', 'report', $id, 'Message removed');
    audit_log('remove_message', 'message', $msgId);
    json_ok();
}

if ($action === 'action_suspend_user') {
    $id = (int)input('id', 0);
    if ($id <= 0) {
        json_error('Invalid report id.');
    }
    $r = admin_find_report($id);
    $uid = (int)$r['target_user_id'];
    if ($uid <= 0) {
        json_error('This report has no user target.');
    }
    if (in_array($r['status'], ['resolved', 'rejected'], true)) {
        json_error('This report has already been resolved.');
    }
    $reason = trim((string)input('reason', ''));
    if ($reason === '' || mb_strlen($reason) > 500) {
        json_error('Please provide a reason of up to 500 characters.');
    }
    $untilDb = null;
    $until   = input('suspended_until', null);
    if ($until !== null && $until !== '' && $until !== '0') {
        $t = strtotime((string)$until);
        if ($t === false) {
            json_error('Invalid suspended_until date.');
        }
        $untilDb = date('Y-m-d H:i:s', $t);
    }
    db()->prepare("UPDATE users SET status = 'suspended', suspended_until = ?, moderation_note = ? WHERE id = ?")
        ->execute([$untilDb, $reason, $uid]);
    create_notification($uid, 'system', 'Your account has been suspended', "Suspended due to a reported violation. Reason: {$reason}", null, $ADMIN['id']);
    db()->prepare("UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW(), moderation_note = ? WHERE id = ?")
        ->execute([$ADMIN['id'], trim((string)$r['moderation_note'] . "\nUser suspended."), $id]);
    audit_log('report_action_suspend_user', 'report', $id, "Suspended user #{$uid} - {$reason}");
    audit_log('suspend_user', 'user', $uid, $reason);
    json_ok();
}

json_error('Unknown action.', 400);