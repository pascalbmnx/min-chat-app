<?php
/**
 * Database layer - PDO connection singleton.
 */
declare(strict_types=1);

final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $host     = getenv('DB_HOST') ?: '127.0.0.1';
            $port     = getenv('DB_PORT') ?: '3306';
            $db       = getenv('DB_NAME') ?: 'minchat';
            $user     = getenv('DB_USER') ?: 'root';
            $pass     = getenv('DB_PASS') ?: '';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

            self::$pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ]);

            // store & read datetimes as UTC; the client converts for display
            self::$pdo->exec("SET time_zone = '+00:00'");
            self::$pdo->exec('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        }

        return self::$pdo;
    }
}

/** Convenience accessor. */
function db(): PDO
{
    return Database::pdo();
}