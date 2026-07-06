import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/api/leaderboard', (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      limit = 100;
    }
    if (limit > 100) {
      limit = 100;
    }

    const rows = db.prepare(`
      SELECT
        ps.player_id AS playerId,
        p.nickname,
        p.avatar,
        ps.highest_score AS score,
        ps.highest_wave AS wave,
        p.created_at AS createdAt
      FROM player_stats ps
      JOIN players p ON p.id = ps.player_id
      ORDER BY ps.highest_score DESC
      LIMIT ?
    `).all(limit);

    const result = rows.map((row, index) => ({
      rank: index + 1,
      playerId: row.playerId,
      nickname: row.nickname,
      avatar: row.avatar,
      score: row.score,
      wave: row.wave,
      createdAt: row.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/leaderboard/rank/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;

    const stats = db.prepare('SELECT highest_score FROM player_stats WHERE player_id = ?').get(playerId);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM player_stats
      WHERE highest_score > ?
    `).get(stats.highest_score);

    const totalRow = db.prepare('SELECT COUNT(*) AS total FROM player_stats').get();

    res.json({ rank: rankRow.rank, totalPlayers: totalRow.total });
  } catch (err) {
    console.error('GET /api/leaderboard/rank/:playerId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
