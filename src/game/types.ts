export interface Vector2D {
  x: number
  y: number
}

export interface Entity {
  id: number
  x: number
  y: number
  width: number
  height: number
  active: boolean
}

export interface Player extends Entity {
  hp: number
  maxHp: number
  speed: number
  fireRate: number
  fireTimer: number
  bombCount: number
  shieldTimer: number
  spreadLevel: number
  invincibleTimer: number
  bulletSpeedMul: number
}

export enum EnemyType {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  BOSS = 'BOSS',
}

export interface Enemy extends Entity {
  hp: number
  maxHp: number
  speed: number
  type: EnemyType
  movePattern: number
  fireTimer: number
  fireRate: number
  moveTimer: number
  score: number
  targetY: number
}

export type BulletOwner = 'player' | 'enemy'

export interface Bullet extends Entity {
  speed: number
  damage: number
  owner: BulletOwner
  bulletType: 'normal' | 'spread' | 'boss'
}

export type PowerupType = 'spread' | 'shield' | 'bomb' | 'heal' | 'bulletspeed'

export interface Powerup extends Entity {
  type: PowerupType
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface Star {
  x: number
  y: number
  speed: number
  brightness: number
  size: number
}

export type GameState = 'menu' | 'playing' | 'gameover'

// Game statistics tracked per session
export interface GameStats {
  kills: number
  bossKills: number
  powerupsUsed: number
  playTime: number  // in seconds
  startTime: number  // timestamp when game started
}

// Player info stored locally and from server
export interface PlayerInfo {
  id: number
  nickname: string
  avatar: number
  createdAt: string
}

export interface GameData {
  player: Player
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  powerups: Powerup[]
  particles: Particle[]
  stars: Star[]
  score: number
  wave: number
  waveTimer: number
  enemiesInWave: number
  enemiesSpawned: number
  bossActive: boolean
  gameSpeed: number
  shakeTimer: number
  shakeIntensity: number
  stats: GameStats
}
