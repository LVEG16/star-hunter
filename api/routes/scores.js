import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.post('/api/scores', (req, res) => {
  try {
    const { playerId, score, wave, kills, bossKills, powerupsUsed, playTime } = req.body;

    if (playerId === undefined || score === undefined || wave === undefined ||
        kills === undefined || bossKills === undefined ||
        powerupsUsed === undefined || playTime === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const player = db.prepare('SELECT id FROM players WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = db.transaction(() => {
      const previousStats = db.prepare('SELECT highest_score FROM player_stats WHERE player_id = ?').get(playerId);
      const previousHighest = previousStats ? previousStats.highest_score : 0;
      const isNewRecord = score > previousHighest;

      db.prepare(`
        INSERT INTO scores (player_id, score, wave, kills, boss_kills, powerups_used, play_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(playerId, score, wave, kills, bossKills, powerupsUsed, playTime);

      db.prepare(`
        UPDATE player_stats
        SET total_games = total_games + 1,
            highest_score = MAX(highest_score, ?),
            highest_wave = MAX(highest_wave, ?),
            total_kills = total_kills + ?,
            total_boss_kills = total_boss_kills + ?,
            total_powerups_used = total_powerups_used + ?,
            total_play_time = total_play_time + ?,
            updated_at = datetime('now')
        WHERE player_id = ?
      `).run(score, wave, kills, bossKills, powerupsUsed, playTime, playerId);

      const newHighest = db.prepare('SELECT highest_score FROM player_stats WHERE player_id = ?').get(playerId).highest_score;

      const rankRow = db.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM player_stats
        WHERE highest_score > ?
      `).get(newHighest);

      return { rank: rankRow.rank, isNewRecord };
    })();

    res.json({ success: true, rank: result.rank, isNewRecord: result.isNewRecord });
  } catch (err) {
    console.error('POST /api/scores error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
