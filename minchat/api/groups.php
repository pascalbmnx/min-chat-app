<?php
/**
 * GET  api/groups.php?conversation_id=..  - group info + members
 * POST api/groups.php?action=...
 *       create | update | add_member | remove_member | promote | demote | leave
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/common.php';

$me = require_auth();
$myId = (int)$me['id'];

/* --------------------------- GET ------------------------------- */

if (request_method() === 'GET') {
    $convId = (int)($_GET['conversation_id'] ?? 0);
    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }

    $stmt = db()->prepare(
        "SELECT u.id, u.username, u.full_name, u.avatar, u.bio, u.is_online, u.last_seen_at,
                cm.role, cm.joined_at
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id = ?
         ORDER BY FIELD(cm.role, 'owner', 'admin', 'member'), cm.joined_at ASC"
    );
    $stmt->execute([$convId]);
    $members = [];
    foreach ($stmt->fetchAll() as $m) {
        $members[] = [
            'id'        => (int)$m['id'],
            'username'  => $m['username'],
            'full_name' => $m['full_name'],
            'avatar'    => $m['avatar'],
            'bio'       => $m['bio'],
            'role'      => $m['role'],
            'online'    => is_online($m),
            'joined'    => full_datetime($m['joined_at']),
        ];
    }

    json_ok([
        'group' => [
            'id'          => (int)$conv['id'],
            'name'        => $conv['name'],
            'description' => $conv['description'],
            'photo'       => $conv['photo'],
            'created_by'  => (int)$conv['created_by'],
            'my_role'     => $member['role'],
            'created_at'  => full_datetime($conv['created_at']),
            'members'     => $members,
        ],
    ]);
}

/* --------------------------- POST ------------------------------ */

guard_csrf_or_skip();
$action = (string)($_GET['action'] ?? input('action', ''));

switch ($action) {
    case 'create':
        handle_create($myId);
        break;
    case 'update':
        handle_update($myId);
        break;
    case 'add_member':
        handle_add_member($myId);
        break;
    case 'remove_member':
        handle_remove_member($myId);
        break;
    case 'promote':
        handle_role($myId, 'admin');
        break;
    case 'demote':
        handle_role($myId, 'member');
        break;
    case 'leave':
        handle_leave($myId);
        break;
    default:
        json_error('Unknown group action.', 400);
}

/* ------------------------------------------------------------------ */

function handle_create(int $myId): void
{
    $name = trim((string)input('name', ''));
    $description = trim((string)input('description', ''));
    $memberIds = array_values(array_unique(array_map('intval', (array)input('member_ids', []))));

    if (!str_len($name, 2, 100)) {
        json_error('Group name must be 2-100 characters.');
    }
    if ($description !== '' && !str_len($description, 0, 500)) {
        json_error('Group description is too long (max 500 characters).');
    }
    $memberIds = array_values(array_filter($memberIds, fn($id) => $id > 0 && $id !== $myId));
    if (count($memberIds) === 0) {
        json_error('Add at least one member to create a group.');
    }

    // verify the target users exist
    $ph = implode(',', array_fill(0, count($memberIds), '?'));
    $stmt = db()->prepare("SELECT id FROM users WHERE id IN ({$ph})");
    $stmt->execute($memberIds);
    $found = array_map(fn($r) => (int)$r['id'], $stmt->fetchAll());
    if (count($found) !== count($memberIds)) {
        json_error('One or more selected users do not exist.', 400);
    }

    // optional group photo
    $photo = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $photo = store_upload($_FILES['photo'], 'avatar')['url_path'];
        } catch (RuntimeException $ex) {
            json_error($ex->getMessage());
        }
    }

    db()->beginTransaction();
    try {
        $ins = db()->prepare(
            "INSERT INTO conversations (type, name, description, photo, created_by)
             VALUES ('group', ?, ?, ?, ?)"
        );
        $ins->execute([$name, $description === '' ? null : $description, $photo, $myId]);
        $convId = (int)db()->lastInsertId();

        $ins = db()->prepare(
            'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
        );
        $ins->execute([$convId, $myId, 'owner']);

        $ins = db()->prepare(
            'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
        );
        foreach ($memberIds as $uid) {
            $ins->execute([$convId, $uid, 'member']);
            create_notification($uid, 'group', 'Added to a group', 'You were added to "' . $name . '".', $convId, $myId);
        }

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    json_ok([
        'conversation'   => conversation_object($convId, $myId),
        'conversation_id' => $convId,
    ]);
}

function handle_update(int $myId): void
{
    $convId = (int)input('conversation_id', 0);
    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }
    if (!in_array($member['role'], ['owner', 'admin'], true)) {
        json_error('Only group owners and admins can update this group.', 403);
    }

    $name = trim((string)input('name', (string)$conv['name']));
    $description = trim((string)input('description', (string)$conv['description']));

    if (!str_len($name, 2, 100)) {
        json_error('Group name must be 2-100 characters.');
    }
    if ($description !== '' && !str_len($description, 0, 500)) {
        json_error('Group description is too long (max 500 characters).');
    }

    $photo = $conv['photo'];
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $photo = store_upload($_FILES['photo'], 'avatar')['url_path'];
        } catch (RuntimeException $ex) {
            json_error($ex->getMessage());
        }
    }
    $removePhoto = !empty(input('remove_photo'));

    $upd = db()->prepare(
        'UPDATE conversations SET name = ?, description = ?, photo = ? WHERE id = ?'
    );
    $upd->execute([
        $name,
        $description === '' ? null : $description,
        $removePhoto ? null : $photo,
        $convId,
    ]);

    // notify members
    $notify = db()->prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id <> ?');
    $notify->execute([$convId, $myId]);
    foreach ($notify->fetchAll() as $m) {
        create_notification((int)$m['user_id'], 'group', 'Group updated', '"' . $name . '" was updated.', $convId, $myId);
    }

    json_ok(['group' => conversation_object($convId, $myId)]);
}

function handle_add_member(int $myId): void
{
    $convId = (int)input('conversation_id', 0);
    $userIds = array_values(array_unique(array_map('intval', (array)input('user_ids', []))));

    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }
    if (!in_array($member['role'], ['owner', 'admin'], true)) {
        json_error('Only group owners and admins can add members.', 403);
    }
    if (count($userIds) === 0) {
        json_error('Select at least one person to add.');
    }

    $ph = implode(',', array_fill(0, count($userIds), '?'));
    $stmt = db()->prepare("SELECT id FROM users WHERE id IN ({$ph})");
    $stmt->execute($userIds);
    $valid = array_map(fn($r) => (int)$r['id'], $stmt->fetchAll());
    if (count($valid) !== count($userIds)) {
        json_error('One or more selected users do not exist.', 400);
    }

    $added = [];
    $ins = db()->prepare(
        'INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
    );
    foreach ($valid as $uid) {
        $ins->execute([$convId, $uid, 'member']);
        if ((int)$ins->rowCount() > 0) {
            $added[] = $uid;
            create_notification($uid, 'group', 'Added to a group', 'You were added to "' . $conv['name'] . '".', $convId, $myId);
        }
    }

    json_ok([
        'added' => $added,
        'group' => conversation_object($convId, $myId),
    ]);
}

function handle_remove_member(int $myId): void
{
    $convId = (int)input('conversation_id', 0);
    $targetId = (int)input('user_id', 0);

    if ($convId <= 0 || $targetId <= 0) {
        json_error('Conversation and user are required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }
    $target = member_row($convId, $targetId);
    if ($target === null) {
        json_error('That person is not a member of this group.', 404);
    }

    $isOwner    = $member['role'] === 'owner';
    $isAdmin    = $member['role'] === 'admin';
    $tgtRole    = $target['role'];

    if (!$isOwner && !$isAdmin) {
        json_error('Only group owners and admins can remove members.', 403);
    }
    if ($tgtRole === 'owner') {
        json_error('The group owner cannot be removed.', 403);
    }
    if ($isAdmin && $tgtRole === 'admin') {
        json_error('Admins cannot remove other admins.', 403);
    }

    $del = db()->prepare('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?');
    $del->execute([$convId, $targetId]);
    $del = db()->prepare('DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?');
    $del->execute([$convId, $targetId]);

    create_notification($targetId, 'group', 'Removed from a group', 'You were removed from "' . $conv['name'] . '".', $convId, $myId);

    json_ok(['removed' => $targetId]);
}

function handle_role(int $myId, string $newRole): void
{
    $convId = (int)input('conversation_id', 0);
    $targetId = (int)input('user_id', 0);

    if ($convId <= 0 || $targetId <= 0) {
        json_error('Conversation and user are required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }
    if ($member['role'] !== 'owner') {
        json_error('Only the group owner can change roles.', 403);
    }
    $target = member_row($convId, $targetId);
    if ($target === null) {
        json_error('That person is not a member of this group.', 404);
    }
    if ($target['role'] === 'owner') {
        json_error('The group owner role cannot be changed.', 403);
    }

    $upd = db()->prepare('UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?');
    $upd->execute([$newRole, $convId, $targetId]);

    $verb = $newRole === 'admin' ? 'made admin of' : 'no longer admin of';
    create_notification($targetId, 'group', 'Role changed', 'You were ' . $verb . ' "' . $conv['name'] . '".', $convId, $myId);

    json_ok(['role' => $newRole, 'user_id' => $targetId]);
}

function handle_leave(int $myId): void
{
    $convId = (int)input('conversation_id', 0);
    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, $myId);
    if ($conv['type'] !== 'group') {
        json_error('Not a group conversation.', 400);
    }

    if ($member['role'] === 'owner') {
        // transfer ownership to the longest-standing admin/member
        $stmt = db()->prepare(
            'SELECT user_id FROM conversation_members
             WHERE conversation_id = ? AND user_id <> ?
             ORDER BY FIELD(role, \'admin\', \'member\'), joined_at ASC LIMIT 1'
        );
        $stmt->execute([$convId, $myId]);
        $next = $stmt->fetch();

        if ($next) {
            $upd = db()->prepare('UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?');
            $upd->execute(['owner', $convId, (int)$next['user_id']]);
            create_notification((int)$next['user_id'], 'group', 'You are now the owner', 'Ownership of "' . $conv['name'] . '" was transferred to you.', $convId, $myId);
        } else {
            // empty group, delete it entirely
            $del = db()->prepare('DELETE FROM conversations WHERE id = ?');
            $del->execute([$convId]);
            json_ok(['deleted' => true]);
        }
    }

    $del = db()->prepare('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?');
    $del->execute([$convId, $myId]);
    $del = db()->prepare('DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?');
    $del->execute([$convId, $myId]);

    json_ok(['left' => true]);
}