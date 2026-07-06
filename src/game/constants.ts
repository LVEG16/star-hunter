import { EnemyType, UpgradeType } from './types'

export const PLAYER_SPEED = 5
export const PLAYER_MAX_HP = 5
export const PLAYER_FIRE_RATE = 8
export const PLAYER_BULLET_SPEED = 5

export const ENEMY_CONFIGS: Record<
  EnemyType,
  { hp: number; speed: number; width: number; height: number; score: number; fireRate: number; color: string }
> = {
  [EnemyType.SMALL]: { hp: 2, speed: 2.4, width: 24, height: 24, score: 100, fireRate: 0, color: '#FF4D4D' },
  [EnemyType.MEDIUM]: { hp: 5, speed: 1.8, width: 36, height: 36, score: 250, fireRate: 80, color: '#FF8C00' },
  [EnemyType.LARGE]: { hp: 12, speed: 1.2, width: 48, height: 48, score: 500, fireRate: 55, color: '#FF1493' },
  [EnemyType.BOSS]: { hp: 75, speed: 0.6, width: 80, height: 80, score: 2000, fireRate: 20, color: '#9400D3' },
}

export const POWERUP_COLORS: Record<string, string> = {
  spread: '#00FFD1',
  shield: '#00BFFF',
  bomb: '#FFD700',
  heal: '#00FF00',
  bulletspeed: '#FF6600',
}

export const WAVE_ENEMIES = (wave: number): number => Math.floor((5 + wave * 2) * 3)

export const BOSS_EVERY_N_WAVES = 5
export const POWERUP_DROP_CHANCE = 0.15
export const CANVAS_BG = '#0a0a1a'

/** 游戏固定速度系数 - 整局保持一致，不随wave变化 */
export const GAME_SPEED = 0.8

/** 获取游戏速度（固定值，不再随wave递增） */
export function getGameSpeed(_wave: number): number {
  return GAME_SPEED
}

/**
 * 敌人射击频率系数 - 随wave递增
 * wave 1: 1.0倍（基础）
 * wave 5: 1.4倍
 * wave 10: 1.9倍
 * wave 15: 2.4倍
 * wave 20+: 3.0倍（上限）
 */
export const ENEMY_FIRE_RATE_INITIAL = 1.0
export const ENEMY_FIRE_RATE_PER_WAVE = 0.1
export const ENEMY_FIRE_RATE_MAX = 3.0

/** 根据wave计算敌人射击频率系数 */
export function getEnemyFireRateMul(wave: number): number {
  return Math.min(ENEMY_FIRE_RATE_MAX, ENEMY_FIRE_RATE_INITIAL + (wave - 1) * ENEMY_FIRE_RATE_PER_WAVE)
}

// ===== 关卡系统 =====

/** 每5个wave为一个关卡 */
export const WAVES_PER_LEVEL = 5

/** 根据wave计算当前关卡（1-based） */
export function getLevel(wave: number): number {
  return Math.floor((wave - 1) / WAVES_PER_LEVEL) + 1
}

/** 关卡难度系数 - 敌人HP/速度/数量随关卡提升 */
export function getLevelDifficulty(level: number): { hpMul: number; speedMul: number; countMul: number } {
  return {
    hpMul: 1 + (level - 1) * 0.3,       // 每关+30% HP
    speedMul: 1 + (level - 1) * 0.1,     // 每关+10% 速度
    countMul: 1 + (level - 1) * 0.2,     // 每关+20% 数量
  }
}

// ===== 金币掉落 =====

/** 金币掉落概率（普通敌人） */
export const COIN_DROP_CHANCE = 0.35

/** Boss金币掉落数量 */
export const BOSS_COIN_COUNT = 5

/** 不同敌人的金币价值 */
export const COIN_VALUES: Record<EnemyType, number> = {
  [EnemyType.SMALL]: 1,
  [EnemyType.MEDIUM]: 2,
  [EnemyType.LARGE]: 3,
  [EnemyType.BOSS]: 5,
}

// ===== 战机升级系统 =====

export const UPGRADE_MAX_LEVEL = 10

/** 升级配置 */
export const UPGRADE_CONFIGS: Record<UpgradeType, {
  name: string
  icon: string
  description: string
  baseCost: number      // 基础费用
  costScale: number     // 费用递增系数（每级费用 = baseCost * costScale^level）
  effect: string        // 效果描述
}> = {
  attack: {
    name: '攻击力',
    icon: '⚔',
    description: '子弹伤害+1',
    baseCost: 30,
    costScale: 1.5,
    effect: '每级+1伤害',
  },
  fireRate: {
    name: '射速',
    icon: '🔥',
    description: '射击间隔缩短',
    baseCost: 40,
    costScale: 1.6,
    effect: '每级-2帧间隔',
  },
  maxHp: {
    name: '血量',
    icon: '❤',
    description: '最大生命+1',
    baseCost: 25,
    costScale: 1.4,
    effect: '每级+1最大HP',
  },
  speed: {
    name: '移动速度',
    icon: '💨',
    description: '飞船速度+0.5',
    baseCost: 35,
    costScale: 1.5,
    effect: '每级+0.5速度',
  },
  bulletSpeed: {
    name: '子弹速度',
    icon: '⚡',
    description: '子弹飞行速度+0.5',
    baseCost: 30,
    costScale: 1.5,
    effect: '每级+0.5速度',
  },
}

/** 计算升级到指定等级所需金币 */
export function getUpgradeCost(type: UpgradeType, currentLevel: number): number {
  const cfg = UPGRADE_CONFIGS[type]
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScale, currentLevel))
}
