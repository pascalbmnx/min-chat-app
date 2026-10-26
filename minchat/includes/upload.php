<?php
/**
 * File upload handling - validation & secure storage.
 */
declare(strict_types=1);

/** Allowed avatar mime types. */
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_EXTS  = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];

/** General attachment mime types (documents, archives, media, images). */
const FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown', 'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/json', 'application/xml',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
    'video/mp4', 'video/webm', 'video/x-matroska',
];

const FILE_EXTS = [
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif',
    'pdf' => 'application/pdf', 'txt' => 'text/plain', 'csv' => 'text/csv', 'md' => 'text/markdown',
    'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt' => 'application/vnd.ms-powerpoint', 'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'zip' => 'application/zip', 'rar' => 'application/x-rar-compressed',
    'json' => 'application/json', 'svg' => 'application/xml',
    'mp3' => 'audio/mpeg', 'm4a' => 'audio/mp4', 'ogg' => 'audio/ogg', 'wav' => 'audio/wav',
    'mp4' => 'video/mp4', 'webm' => 'video/webm',
];

/**
 * Validate & store an uploaded file.
 *
 * @param array  $file       $_FILES entry
 * @param string $kind       'avatar' | 'attachment'
 * @param int    $maxBytes   override max size
 * @return array ['url_path', 'stored_name', 'mime_type', 'size', 'original_name']
 * @throws RuntimeException on any validation error
 */
function store_upload(array $file, string $kind = 'attachment', ?int $maxBytes = null): array
{
    if (!isset($file['error']) || is_array($file['error'])) {
        throw new RuntimeException('Invalid upload request.');
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $map = [
            UPLOAD_ERR_INI_SIZE   => 'The file exceeds the upload size limit.',
            UPLOAD_ERR_FORM_SIZE  => 'The file exceeds the maximum allowed size.',
            UPLOAD_ERR_PARTIAL    => 'The file was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temporary folder is missing.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write the file to disk.',
            UPLOAD_ERR_EXTENSION  => 'A server extension blocked the upload.',
        ];
        $msg = $map[$file['error']] ?? 'Upload failed.';
        throw new RuntimeException($msg);
    }

    if ($file['size'] <= 0) {
        throw new RuntimeException('The uploaded file is empty.');
    }

    $maxBytes = $maxBytes ?? ($kind === 'avatar' ? MAX_AVATAR_SIZE : MAX_FILE_SIZE);
    if ($file['size'] > $maxBytes) {
        throw new RuntimeException(
            sprintf('File too large. Maximum allowed size is %s.', human_size($maxBytes))
        );
    }

    $origName = mb_substr(basename((string)$file['name']), 0, 200);

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = (string)$finfo->file($file['tmp_name']);
    $ext   = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

    $allowed = $kind === 'avatar' ? AVATAR_TYPES : FILE_TYPES;
    $extMap  = $kind === 'avatar' ? AVATAR_EXTS : FILE_EXTS;

    if (!in_array($mime, $allowed, true)) {
        throw new RuntimeException('This file type is not allowed.');
    }
    // double check extension/mime consistency where we have a known map
    if ($ext !== '' && isset($extMap[$ext])) {
        $expectedMime = $extMap[$ext];
        if (!mimes_match($mime, $expectedMime)) {
            throw new RuntimeException('File contents do not match its extension.');
        }
    }

    $dir = $kind === 'avatar' ? UPLOAD_AVATAR_DIR : UPLOAD_FILE_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    if (!is_writable($dir)) {
        throw new RuntimeException('Upload directory is not writable.');
    }

    $storedName = random_token(16) . ($ext !== '' ? '.' . $ext : '.bin');
    $dest = rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Failed to store the uploaded file.');
    }

    $urlPath = ($kind === 'avatar' ? UPLOAD_AVATAR_URL : UPLOAD_FILE_URL) . $storedName;

    return [
        'stored_path'   => $dest,
        'stored_name'   => $storedName,
        'url_path'      => $urlPath,
        'mime_type'     => $mime,
        'size'          => (int)$file['size'],
        'original_name' => $origName,
    ];
}

/** Loose mime equality (some image decoders vary slightly). */
function mimes_match(string $actual, string $expected): bool
{
    return $actual === $expected;
}

/** Delete a stored file safely (used when messages are purged). */
function delete_stored_file(?string $path): void
{
    if ($path && is_file($path)) {
        @unlink($path);
    }
}