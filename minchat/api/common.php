<?php
/**
 * Shared conversation helpers used by the messages/groups/conversations APIs.
 */
declare(strict_types=1);

/** Basic conversation id validation fetch. */
function find_conversation(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM conversations WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Current user's membership row for a conversation, or null. */
function member_row(int $conversationId, int $userId): ?array
{
    $stmt = db()->prepare(
        'SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1'
    );
    $stmt->execute([$conversationId, $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Conversation + membership access check. Throws OK-error if not a member. */
function conversation_guard(int $conversationId, int $userId): array
{
    $conv = find_conversation($conversationId);
    if ($conv === null) {
        json_error('Conversation not found.', 404);
    }
    $member = member_row($conversationId, $userId);
    if ($member === null) {
        json_error('You are not a member of this conversation.', 403);
    }
    return [$conv, $member];
}

/** Mark a whole conversation as read by the given user. */
function mark_conversation_read(int $conversationId, int $userId): int
{
    $last = db()->prepare(
        'SELECT COALESCE(MAX(id), 0) AS max_id FROM messages WHERE conversation_id = ?'
    );
    $last->execute([$conversationId]);
    $maxId = (int)$last->fetchColumn();

    $stmt = db()->prepare(
        'UPDATE conversation_members SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?'
    );
    $stmt->execute([$maxId, $conversationId, $userId]);

    if ($maxId > 0) {
        $ins = db()->prepare(
            'INSERT IGNORE INTO message_reads (message_id, user_id)
             SELECT id, ? FROM messages WHERE conversation_id = ? AND sender_id <> ?'
        );
        $ins->execute([$userId, $conversationId, $userId]);
    }

    return $maxId;
}

/** Emit an in-app notification to a user. */
function create_notification(int $userId, string $type, string $title, ?string $body = null, ?int $conversationId = null, ?int $actorId = null): void
{
    $stmt = db()->prepare(
        'INSERT INTO notifications (user_id, type, title, body, conversation_id, actor_id)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $type, $title, mb_substr((string)$body, 0, 300), $conversationId, $actorId]);
}

/**
 * Build the full conversation list for a user, including direct-chat peer
 * info, last message, unread counts and live typing indicators.
 */
function list_conversations(int $userId): array
{
    $stmt = db()->prepare(
        "SELECT c.id, c.type, c.name, c.description, c.photo, c.updated_at,
                cm.role, cm.last_read_message_id,
                u.id AS other_id, u.username AS other_username, u.full_name AS other_full_name,
                u.avatar AS other_avatar, u.is_online AS other_online,
                u.last_seen_at AS other_last_seen, u.bio AS other_bio,
                m.id AS last_message_id, m.sender_id AS last_sender_id,
                m.type AS last_type, m.content AS last_content,
                m.created_at AS last_created_at, m.deleted AS last_deleted,
                a.original_name AS last_attachment_name,
                a.mime_type AS last_attachment_mime
         FROM conversations c
         JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = :me1
         LEFT JOIN conversation_members cm2
                ON cm2.conversation_id = c.id AND c.type = 'direct' AND cm2.user_id <> :me2
         LEFT JOIN users u ON u.id = cm2.user_id
         LEFT JOIN messages m ON m.id = (SELECT MAX(mx.id) FROM messages mx WHERE mx.conversation_id = c.id)
         LEFT JOIN attachments a ON a.id = m.attachment_id
         ORDER BY c.updated_at DESC"
    );
    $stmt->execute(['me1' => $userId, 'me2' => $userId]);
    $rows = $stmt->fetchAll();

    if (empty($rows)) {
        return [];
    }

    /* -- unread counts ------------------------------------------------ */
    $ids = array_column($rows, 'id');
    $ph  = implode(',', array_fill(0, count($ids), '?'));
    $unread = [];
    $stmt = db()->prepare(
        "SELECT ms.conversation_id, COUNT(*) AS c
         FROM messages ms
         JOIN conversation_members cm
           ON cm.conversation_id = ms.conversation_id AND cm.user_id = ?
         WHERE ms.conversation_id IN ({$ph})
           AND ms.sender_id <> ?
           AND ms.deleted = 0
           AND (cm.last_read_message_id IS NULL OR ms.id > cm.last_read_message_id)
         GROUP BY ms.conversation_id"
    );
    $stmt->execute(array_merge([$userId], $ids, [$userId]));
    foreach ($stmt->fetchAll() as $row) {
        $unread[(int)$row['conversation_id']] = (int)$row['c'];
    }

    /* -- typing ------------------------------------------------------- */
    $typingByConv = [];
    $stmt = db()->prepare(
        "SELECT t.conversation_id, u.id, u.username, u.full_name
         FROM typing_status t
         JOIN users u ON u.id = t.user_id
         WHERE t.conversation_id IN ({$ph}) AND t.user_id <> ?
           AND t.updated_at > (NOW() - INTERVAL 6 SECOND)"
    );
    $stmt->execute(array_merge($ids, [$userId]));
    foreach ($stmt->fetchAll() as $row) {
        $typingByConv[(int)$row['conversation_id']][] = [
            'id'        => (int)$row['id'],
            'username'  => $row['username'],
            'full_name' => $row['full_name'],
        ];
    }

    /* -- build output ------------------------------------------------ */
    $out = [];
    foreach ($rows as $r) {
        $item = [
            'id'          => (int)$r['id'],
            'type'        => $r['type'],
            'name'        => $r['name'],
            'photo'       => $r['photo'],
            'description' => $r['description'],
            'role'        => $r['role'],
            'last_read_message_id' => $r['last_read_message_id'] === null ? null : (int)$r['last_read_message_id'],
            'unread'      => $unread[(int)$r['id']] ?? 0,
            'typing'      => $typingByConv[(int)$r['id']] ?? [],
            'updated_at'  => $r['updated_at'],
        ];

        if ($r['type'] === 'direct' && $r['other_id']) {
            $item['name'] = $r['other_full_name'];
            $item['title'] = $r['other_full_name'];
            $item['subtitle'] = '@' . $r['other_username'];
            $item['photo'] = $r['other_avatar'];
            $item['peer'] = [
                'id'         => (int)$r['other_id'],
                'username'   => $r['other_username'],
                'full_name'  => $r['other_full_name'],
                'avatar'     => $r['other_avatar'],
                'bio'        => $r['other_bio'],
                'online'     => is_online(['is_online' => $r['other_online'], 'last_seen_at' => $r['other_last_seen']]),
                'last_seen'  => $r['other_last_seen'],
            ];
        } else {
            $item['title'] = $r['name'] ?? 'Group';
            $item['subtitle'] = 'Group';
        }

        if ($r['last_message_id']) {
            $byMe = (int)$r['last_sender_id'] === $userId;
            $body = '';
            if ((int)$r['last_deleted'] === 1) {
                $body = 'This message was deleted';
            } elseif ($r['last_type'] === 'text' && $r['last_content'] !== null) {
                $body = $r['last_content'];
            } elseif ($r['last_type'] === 'image') {
                $body = '[Image]';
            } elseif ($r['last_type'] === 'file') {
                $body = '[File] ' . (string)$r['last_attachment_name'];
            }
            $item['last_message'] = [
                'id'         => (int)$r['last_message_id'],
                'sender_id'  => (int)$r['last_sender_id'],
                'type'       => $r['last_type'],
                'text'       => $body,
                'mine'       => $byMe,
                'created_at' => $r['last_created_at'],
            ];
        } else {
            $item['last_message'] = null;
        }

        $out[] = $item;
    }

    return $out;
}

/** Get other direct-chat peer info for the current user. */
function direct_peer(int $conversationId, int $userId): ?array
{
    $stmt = db()->prepare(
        "SELECT u.id, u.username, u.full_name, u.avatar, u.bio, u.is_online, u.last_seen_at
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id = ? AND cm.user_id <> ? AND cm.user_id IN
           (SELECT cmm.user_id FROM conversation_members cmm WHERE cmm.conversation_id = ?)
         LIMIT 1"
    );
    $stmt->execute([$conversationId, $userId, $conversationId]);
    $row = $stmt->fetch();
    if ($row === false) {
        return null;
    }
    $row['online'] = is_online($row);
    return $row;
}

/** Return a single conversation object for the API (shared shape). */
function conversation_object(int $conversationId, int $userId): ?array
{
    $list = array_values(array_filter(list_conversations($userId), fn($c) => $c['id'] === $conversationId));
    return $list[0] ?? null;
}