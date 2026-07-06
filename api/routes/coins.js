import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 获取玩家金币和升级等级
router.get('/api/players/:id/progress', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT coins, upgrade_levels FROM player_stats WHERE player_id = ?').get(id);
    res.json({
      coins: row ? row.coins : 0,
      upgradeLevels: row && row.upgrade_levels ? JSON.parse(row.upgrade_levels) : null,
    });
  } catch (err) {
    console.error('GET /api/players/:id/progress error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 同步玩家金币和升级等级
router.post('/api/players/:id/progress', (req, res) => {
  try {
    const { id } = req.params;
    const { coins, upgradeLevels } = req.body;

    if (typeof coins !== 'number' || coins < 0) {
      return res.status(400).json({ error: 'invalid coins' });
    }

    // 确保player_stats记录存在
    db.prepare('INSERT OR IGNORE INTO player_stats (player_id) VALUES (?)').run(id);

    const upgradeStr = upgradeLevels ? JSON.stringify(upgradeLevels) : null;
    db.prepare(`
      UPDATE player_stats
      SET coins = ?, upgrade_levels = ?, updated_at = datetime('now')
      WHERE player_id = ?
    `).run(coins, upgradeStr, id);

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/players/:id/progress error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
