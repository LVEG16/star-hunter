import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 支持云平台持久化存储路径，默认使用本地路径
const dbPath = process.env.DB_PATH || join(__dirname, 'starhunter.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    avatar INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    boss_kills INTEGER NOT NULL,
    powerups_used INTEGER NOT NULL,
    play_time INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS player_stats (
    player_id INTEGER PRIMARY KEY,
    total_games INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    highest_wave INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_boss_kills INTEGER DEFAULT 0,
    total_powerups_used INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
  CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
  CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC);
`);

// 兼容旧数据库：添加 coins 和 upgrade_levels 字段（如果不存在）
try {
  db.exec(`ALTER TABLE player_stats ADD COLUMN coins INTEGER DEFAULT 0;`);
} catch (e) { /* 字段已存在 */ }
try {
  db.exec(`ALTER TABLE player_stats ADD COLUMN upgrade_levels TEXT DEFAULT '{"attack":0,"fireRate":0,"maxHp":0,"speed":0,"bulletSpeed":0}';`);
} catch (e) { /* 字段已存在 */ }

export default db;
