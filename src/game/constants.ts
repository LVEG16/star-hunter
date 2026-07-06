import { EnemyType } from './types'

export const PLAYER_SPEED = 5
export const PLAYER_MAX_HP = 5
export const PLAYER_FIRE_RATE = 8
export const PLAYER_BULLET_SPEED = 10

export const ENEMY_CONFIGS: Record<
  EnemyType,
  { hp: number; speed: number; width: number; height: number; score: number; fireRate: number; color: string }
> = {
  [EnemyType.SMALL]: { hp: 1, speed: 2, width: 24, height: 24, score: 100, fireRate: 0, color: '#FF4D4D' },
  [EnemyType.MEDIUM]: { hp: 3, speed: 1.5, width: 36, height: 36, score: 250, fireRate: 120, color: '#FF8C00' },
  [EnemyType.LARGE]: { hp: 8, speed: 1, width: 48, height: 48, score: 500, fireRate: 80, color: '#FF1493' },
  [EnemyType.BOSS]: { hp: 50, speed: 0.5, width: 80, height: 80, score: 2000, fireRate: 30, color: '#9400D3' },
}

export const POWERUP_COLORS: Record<string, string> = {
  spread: '#00FFD1',
  shield: '#00BFFF',
  bomb: '#FFD700',
  heal: '#00FF00',
}

export const WAVE_ENEMIES = (wave: number): number => 5 + wave * 2

export const BOSS_EVERY_N_WAVES = 5
export const POWERUP_DROP_CHANCE = 0.15
export const CANVAS_BG = '#0a0a1a'
