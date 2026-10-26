<?php
/**
 * GET  api/conversations.php          - list my conversations (with unread & typing)
 * GET  api/conversations.php?q=...    - search/filter my conversations
 * POST api/conversations.php          - { user_id } start (or reuse) a direct chat
 * POST api/conversations.php?action   - { action: 'read', conversation_id } mark read
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/common.php';

$me = require_auth();

if (request_method() === 'GET') {
    $results = list_conversations((int)$me['id']);

    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') {
        $q = mb_strtolower($q);
        $results = array_values(array_filter($results, function ($c) use ($q) {
            return mb_strpos(mb_strtolower((string)$c['name']), $q) !== false
                || mb_strpos(mb_strtolower((string)$c['subtitle']), $q) !== false;
        }));
    }

    json_ok(['conversations' => $results]);
}

/* ---------------------------- POST ------------------------------- */

guard_csrf_or_skip();
$action = (string)($_GET['action'] ?? input('action', ''));

if ($action === '' ) {
    /* start a direct chat */
    $peerId = (int)input('user_id', 0);
    if ($peerId <= 0 || $peerId === (int)$me['id']) {
        json_error('Please choose a valid person to chat with.');
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$peerId]);
    if (!$stmt->fetch()) {
        json_error('User not found.', 404);
    }

    // reuse an existing direct conversation between the two users
    $stmt = db()->prepare(
        "SELECT c.id
         FROM conversations c
         JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
         JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
         WHERE c.type = 'direct'
         LIMIT 1"
    );
    $stmt->execute([$me['id'], $peerId]);
    $existing = $stmt->fetch();

    if ($existing) {
        $convId = (int)$existing['id'];
    } else {
        $ins = db()->prepare(
            "INSERT INTO conversations (type, created_by) VALUES ('direct', ?)"
        );
        $ins->execute([$me['id']]);
        $convId = (int)db()->lastInsertId();

        $ins = db()->prepare(
            'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)'
        );
        $ins->execute([$convId, $me['id'], 'member', $convId, $peerId, 'member']);

        // notify the peer they have a new conversation
        $meRow = current_user();
        create_notification(
            $peerId,
            'message',
            'New conversation',
            $meRow['full_name'] . ' started a chat with you.',
            $convId,
            (int)$me['id']
        );
    }

    json_ok([
        'conversation' => conversation_object($convId, (int)$me['id']),
        'conversation_id' => $convId,
    ]);
}

if ($action === 'read') {
    $convId = (int)input('conversation_id', 0);
    if ($convId <= 0) {
        json_error('Conversation required.');
    }
    [$conv, $member] = conversation_guard($convId, (int)$me['id']);
    mark_conversation_read($convId, (int)$me['id']);

    // remove related "message/group" notifications for this conversation, since read
    $del = db()->prepare('DELETE FROM notifications WHERE user_id = ? AND conversation_id = ?');
    $del->execute([$me['id'], $convId]);

    json_ok(['unread' => 0]);
}

json_error('Unknown conversation action.', 400);