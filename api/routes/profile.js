import { Router } from 'express';
import db from '../db.js';

const router = Router();

const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', description: 'Get 100 total kills', check: (s) => s.totalKills >= 100 },
  { id: 'killer_500', name: 'Killer 500', description: 'Get 500 total kills', check: (s) => s.totalKills >= 500 },
  { id: 'killer_1000', name: 'Killer 1000', description: 'Get 1000 total kills', check: (s) => s.totalKills >= 1000 },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 10 total bosses', check: (s) => s.totalBossKills >= 10 },
  { id: 'boss_master', name: 'Boss Master', description: 'Defeat 50 total bosses', check: (s) => s.totalBossKills >= 50 },
  { id: 'power_collector', name: 'Power Collector', description: 'Use 50 total powerups', check: (s) => s.totalPowerupsUsed >= 50 },
  { id: 'power_master', name: 'Power Master', description: 'Use 200 total powerups', check: (s) => s.totalPowerupsUsed >= 200 },
  { id: 'survivor', name: 'Survivor', description: 'Survive 30 minutes total play time', check: (s) => s.totalPlayTime >= 1800 },
  { id: 'veteran', name: 'Veteran', description: 'Survive 2 hours total play time', check: (s) => s.totalPlayTime >= 7200 },
  { id: 'wave_10', name: 'Wave 10', description: 'Reach wave 10', check: (s) => s.highestWave >= 10 },
  { id: 'wave_20', name: 'Wave 20', description: 'Reach wave 20', check: (s) => s.highestWave >= 20 },
  { id: 'score_10k', name: 'Score 10k', description: 'Score 10,000+ in one game', check: (s) => s.highestScore >= 10000 },
  { id: 'score_50k', name: 'Score 50k', description: 'Score 50,000+ in one game', check: (s) => s.highestScore >= 50000 },
  { id: 'score_100k', name: 'Score 100k', description: 'Score 100,000+ in one game', check: (s) => s.highestScore >= 100000 },
  { id: 'dedicated', name: 'Dedicated', description: 'Play 10 games', check: (s) => s.totalGames >= 10 },
  { id: 'addicted', name: 'Addicted', description: 'Play 50 games', check: (s) => s.totalGames >= 50 },
];

router.get('/api/profile/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(playerId);

    if (!stats) {
      return res.json({
        player: {
          id: player.id,
          nickname: player.nickname,
          avatar: player.avatar,
          createdAt: player.created_at,
        },
        stats: {
          totalGames: 0,
          highestScore: 0,
          highestWave: 0,
          totalKills: 0,
          totalBossKills: 0,
          totalPowerupsUsed: 0,
          totalPlayTime: 0,
        },
        achievements: ACHIEVEMENTS.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          unlocked: false,
          unlockedAt: null,
        })),
      });
    }

    const statsData = {
      totalGames: stats.total_games,
      highestScore: stats.highest_score,
      highestWave: stats.highest_wave,
      totalKills: stats.total_kills,
      totalBossKills: stats.total_boss_kills,
      totalPowerupsUsed: stats.total_powerups_used,
      totalPlayTime: stats.total_play_time,
    };

    const achievements = ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      unlocked: a.check(statsData),
      unlockedAt: a.check(statsData) ? null : undefined,
    }));

    res.json({
      player: {
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        createdAt: player.created_at,
      },
      stats: statsData,
      achievements,
    });
  } catch (err) {
    console.error('GET /api/profile/:playerId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
