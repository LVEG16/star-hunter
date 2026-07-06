import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.post('/api/players', (req, res) => {
  try {
    const { nickname, avatar } = req.body;

    if (!nickname) {
      return res.status(400).json({ error: 'nickname is required' });
    }

    const avatarValue = avatar ?? 0;

    const existing = db.prepare('SELECT * FROM players WHERE nickname = ?').get(nickname);

    let player;
    if (existing) {
      const update = db.prepare(`
        UPDATE players
        SET last_login = datetime('now'), avatar = ?
        WHERE id = ?
      `);
      update.run(avatarValue, existing.id);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(existing.id);
    } else {
      const insert = db.prepare(`
        INSERT INTO players (nickname, avatar)
        VALUES (?, ?)
      `);
      const info = insert.run(nickname, avatarValue);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
    }

    db.prepare(`
      INSERT OR IGNORE INTO player_stats (player_id) VALUES (?)
    `).run(player.id);

    res.json({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      createdAt: player.created_at,
    });
  } catch (err) {
    console.error('POST /api/players error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/players/:id', (req, res) => {
  try {
    const { id } = req.params;

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const stats = db.prepare('SELECT highest_score FROM player_stats WHERE player_id = ?').get(id);
    const highestScore = stats ? stats.highest_score : 0;

    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM player_stats
      WHERE highest_score > ?
    `).get(highestScore);

    res.json({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      createdAt: player.created_at,
      rank: rankRow.rank,
      highestScore,
    });
  } catch (err) {
    console.error('GET /api/players/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
