import { EnemyType } from './types'

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
