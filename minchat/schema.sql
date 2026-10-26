-- ============================================================
-- Pulse Chat - Database Schema (MySQL / MariaDB)
-- Run: mysql -u root < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `minchat` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `minchat`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `announcement_deliveries`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `admin_logs`;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `typing_status`;
DROP TABLE IF EXISTS `message_reads`;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversation_members`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Users & profiles
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`          VARCHAR(30)  NOT NULL,
  `email`             VARCHAR(190) NOT NULL,
  `password_hash`     VARCHAR(255) NOT NULL,
  `full_name`         VARCHAR(100) NOT NULL,
  `bio`               VARCHAR(500) NULL DEFAULT NULL,
  `avatar`            VARCHAR(255) NULL DEFAULT NULL,
  `role`              ENUM('user','moderator','admin','super_admin') NOT NULL DEFAULT 'user',
  `status`            ENUM('active','suspended','blocked') NOT NULL DEFAULT 'active',
  `warn_count`        INT UNSIGNED NOT NULL DEFAULT 0,
  `suspended_until`   DATETIME NULL DEFAULT NULL,
  `moderation_note`   VARCHAR(500) NULL DEFAULT NULL,
  `theme`             ENUM('dark','light') NOT NULL DEFAULT 'dark',
  `is_online`         TINYINT(1)   NOT NULL DEFAULT 0,
  `last_seen_at`      DATETIME     NULL DEFAULT NULL,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_last_seen` (`last_seen_at`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Password reset tokens
-- ------------------------------------------------------------
CREATE TABLE `password_resets` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `token_hash` CHAR(64)     NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `used`       TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`),
  CONSTRAINT `fk_password_resets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Sessions (explicit tracking for management/security)
-- ------------------------------------------------------------
CREATE TABLE `sessions` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `session_id` CHAR(64)     NOT NULL,
  `ip`         VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_id` (`session_id`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Conversations (direct chats and groups)
-- ------------------------------------------------------------
CREATE TABLE `conversations` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`        ENUM('direct','group') NOT NULL DEFAULT 'direct',
  `name`        VARCHAR(100) NULL DEFAULT NULL,
  `description` VARCHAR(500) NULL DEFAULT NULL,
  `photo`       VARCHAR(255) NULL DEFAULT NULL,
  `created_by`  INT UNSIGNED NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversations_updated` (`updated_at`),
  KEY `idx_conversations_created_by` (`created_by`),
  CONSTRAINT `fk_conversations_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Conversation members (participants incl. group roles & read state)
-- ------------------------------------------------------------
CREATE TABLE `conversation_members` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id`     INT UNSIGNED NOT NULL,
  `user_id`             INT UNSIGNED NOT NULL,
  `role`                ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  `joined_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_message_id` INT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_members_conversation_user` (`conversation_id`,`user_id`),
  KEY `idx_members_user` (`user_id`),
  CONSTRAINT `fk_members_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_members_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Attachments (files shared in chats)
-- ------------------------------------------------------------
CREATE TABLE `attachments` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT UNSIGNED NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name`   VARCHAR(255) NOT NULL,
  `url_path`      VARCHAR(255) NOT NULL,
  `mime_type`     VARCHAR(100) NOT NULL,
  `size`          INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_user` (`user_id`),
  CONSTRAINT `fk_attachments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Messages
-- ------------------------------------------------------------
CREATE TABLE `messages` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `sender_id`       INT UNSIGNED NOT NULL,
  `type`            ENUM('text','image','file') NOT NULL DEFAULT 'text',
  `content`         TEXT NULL,
  `attachment_id`   INT UNSIGNED NULL DEFAULT NULL,
  `reply_to`        INT UNSIGNED NULL DEFAULT NULL,
  `deleted`         TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at`      DATETIME NULL DEFAULT NULL,
  `pinned`          TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation` (`conversation_id`,`id`),
  KEY `idx_messages_sender` (`sender_id`),
  KEY `idx_messages_created` (`created_at`),
  KEY `idx_messages_reply` (`reply_to`),
  CONSTRAINT `fk_messages_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender`
    FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_attachment`
    FOREIGN KEY (`attachment_id`) REFERENCES `attachments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_reply`
    FOREIGN KEY (`reply_to`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Per-user read state of individual messages
-- ------------------------------------------------------------
CREATE TABLE `message_reads` (
  `message_id` INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED NOT NULL,
  `read_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`,`user_id`),
  KEY `idx_message_reads_user` (`user_id`),
  CONSTRAINT `fk_reads_message`
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reads_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Typing indicators
-- ------------------------------------------------------------
CREATE TABLE `typing_status` (
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id`         INT UNSIGNED NOT NULL,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversation_id`,`user_id`),
  KEY `idx_typing_updated` (`updated_at`),
  CONSTRAINT `fk_typing_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_typing_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Login attempts (rate limiting)
-- ------------------------------------------------------------
CREATE TABLE `login_attempts` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scope`        VARCHAR(30)  NOT NULL DEFAULT 'login',
  `ip`           VARCHAR(45)  NOT NULL,
  `identifier`   VARCHAR(190) NULL DEFAULT NULL,
  `success`      TINYINT(1)   NOT NULL DEFAULT 0,
  `attempted_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_monitor` (`scope`,`ip`,`attempted_at`),
  KEY `idx_login_attempts_ident` (`identifier`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Reports (user/message/group/profile/other)
-- ------------------------------------------------------------
CREATE TABLE `reports` (
  `id`                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reporter_id`            INT UNSIGNED NOT NULL,
  `target_type`            ENUM('user','message','group','profile','other') NOT NULL DEFAULT 'other',
  `target_user_id`         INT UNSIGNED NULL DEFAULT NULL,
  `target_message_id`      INT UNSIGNED NULL DEFAULT NULL,
  `target_conversation_id` INT UNSIGNED NULL DEFAULT NULL,
  `category`               VARCHAR(60)  NOT NULL DEFAULT 'other',
  `details`                VARCHAR(1000) NULL DEFAULT NULL,
  `status`                 ENUM('open','in_review','resolved','rejected') NOT NULL DEFAULT 'open',
  `assignee_id`            INT UNSIGNED NULL DEFAULT NULL,
  `moderation_note`        VARCHAR(1000) NULL DEFAULT NULL,
  `resolved_by`            INT UNSIGNED NULL DEFAULT NULL,
  `resolved_at`            DATETIME NULL DEFAULT NULL,
  `created_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`),
  KEY `idx_reports_target_type` (`target_type`),
  KEY `idx_reports_assignee` (`assignee_id`),
  KEY `idx_reports_created` (`created_at`),
  CONSTRAINT `fk_reports_reporter`
    FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_target_user`
    FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_target_message`
    FOREIGN KEY (`target_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_target_conversation`
    FOREIGN KEY (`target_conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_assignee`
    FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_resolver`
    FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Admin audit logs
-- ------------------------------------------------------------
CREATE TABLE `admin_logs` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    INT UNSIGNED NOT NULL,
  `action`      VARCHAR(60)  NOT NULL,
  `target_type` VARCHAR(40)  NULL DEFAULT NULL,
  `target_id`   INT UNSIGNED NULL DEFAULT NULL,
  `details`     VARCHAR(500) NULL DEFAULT NULL,
  `ip`          VARCHAR(45)  NULL DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_logs_created` (`created_at`),
  KEY `idx_admin_logs_admin` (`admin_id`),
  KEY `idx_admin_logs_action` (`action`),
  CONSTRAINT `fk_admin_logs_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Announcements (admin broadcast)
-- ------------------------------------------------------------
CREATE TABLE `announcements` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`     INT UNSIGNED NOT NULL,
  `title`        VARCHAR(150) NOT NULL,
  `body`         VARCHAR(2000) NOT NULL,
  `target_type`  ENUM('all','role','user') NOT NULL DEFAULT 'all',
  `target_value` VARCHAR(100) NULL DEFAULT NULL,
  `status`       ENUM('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'sent',
  `scheduled_at` DATETIME NULL DEFAULT NULL,
  `sent_at`      DATETIME NULL DEFAULT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_status` (`status`),
  KEY `idx_announcements_scheduled` (`scheduled_at`),
  CONSTRAINT `fk_announcements_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Announcement deliveries (per-user status tracking)
-- ------------------------------------------------------------
CREATE TABLE `announcement_deliveries` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `announcement_id` INT UNSIGNED NOT NULL,
  `user_id`         INT UNSIGNED NOT NULL,
  `delivered_at`    DATETIME NULL DEFAULT NULL,
  `read_at`         DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_delivery_announcement_user` (`announcement_id`,`user_id`),
  KEY `idx_deliveries_user` (`user_id`),
  CONSTRAINT `fk_deliveries_announcement`
    FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliveries_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Notifications (in-app)
-- ------------------------------------------------------------
CREATE TABLE `notifications` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL,
  `type`            ENUM('group','message','system') NOT NULL DEFAULT 'system',
  `title`           VARCHAR(120) NOT NULL,
  `body`            VARCHAR(300) NULL DEFAULT NULL,
  `conversation_id` INT UNSIGNED NULL DEFAULT NULL,
  `actor_id`        INT UNSIGNED NULL DEFAULT NULL,
  `announcement_id` INT UNSIGNED NULL DEFAULT NULL,
  `is_read`         TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  KEY `idx_notifications_created` (`created_at`),
  KEY `idx_notifications_announcement` (`announcement_id`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_actor`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_announcement`
    FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;