import {
  Vector2D,
  Player,
  Enemy,
  EnemyType,
  Bullet,
  Powerup,
  PowerupType,
  Coin,
  Particle,
  Star,
  GameState,
  GameData,
  GameStats,
  UpgradeLevels,
} from './types'
import {
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_FIRE_RATE,
  PLAYER_BULLET_SPEED,
  ENEMY_CONFIGS,
  POWERUP_COLORS,
  WAVE_ENEMIES,
  BOSS_EVERY_N_WAVES,
  POWERUP_DROP_CHANCE,
  CANVAS_BG,
  COIN_DROP_CHANCE,
  BOSS_COIN_COUNT,
  COIN_VALUES,
  getGameSpeed,
  getEnemyFireRateMul,
  getLevel,
  getLevelDifficulty,
} from './constants'

let nextId = 1
function genId(): number {
  return nextId++
}

export type ControlMode = 'auto' | 'keyboard' | 'touch'

export class GameEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  data: GameData
  keys: Set<string>
  mousePos: Vector2D
  mouseDown: boolean
  animationId: number
  onStateChange: (state: GameState, score: number, wave: number) => void
  private lastTime: number
  private accumulator: number
  private readonly FIXED_DT = 1000 / 60 // 固定时间步长：每秒60次update
  // 触摸输入向量（来自虚拟摇杆），范围 -1..1
  touchInput: { x: number; y: number }
  // 拖动飞船模式：目标位置
  touchTarget: { x: number; y: number; active: boolean }
  controlMode: ControlMode
  // 战机升级等级
  upgradeLevels: UpgradeLevels
  // 金币收集回调
  onCoinCollect: (count: number) => void

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState, score: number, wave: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onStateChange = onStateChange
    this.keys = new Set()
    this.mousePos = { x: canvas.width / 2, y: canvas.height / 2 }
    this.mouseDown = false
    this.animationId = 0
    this.lastTime = 0
    this.accumulator = 0
    this.touchInput = { x: 0, y: 0 }
    this.touchTarget = { x: canvas.width / 2, y: canvas.height - 80, active: false }
    this.controlMode = 'auto'
    this.upgradeLevels = { attack: 0, fireRate: 0, maxHp: 0, speed: 0, bulletSpeed: 0 }
    this.onCoinCollect = () => {}
    this.data = this.createEmptyData()
    this.bindInput()
  }

  /** 设置控制模式 */
  setControlMode(mode: ControlMode): void {
    this.controlMode = mode
  }

  /** 获取当前实际使用的控制方式 */
  getActiveControl(): 'keyboard' | 'touch' {
    if (this.controlMode === 'keyboard') return 'keyboard'
    if (this.controlMode === 'touch') return 'touch'
    // auto: 根据是否触摸设备自动判断
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    return isTouch ? 'touch' : 'keyboard'
  }

  /** 设置触摸输入（供外部虚拟摇杆调用） */
  setTouchInput(x: number, y: number): void {
    this.touchInput.x = x
    this.touchInput.y = y
  }

  /** 设置拖动目标位置（供外部拖动控制调用） */
  setTouchTarget(x: number, y: number): void {
    this.touchTarget.x = x
    this.touchTarget.y = y
    this.touchTarget.active = true
  }

  /** 清除拖动目标 */
  clearTouchTarget(): void {
    this.touchTarget.active = false
  }

  /** 触发炸弹（供外部按钮调用） */
  triggerBomb(): void {
    this.useBomb()
  }

  /** 设置升级等级（从外部store同步） */
  setUpgradeLevels(levels: UpgradeLevels): void {
    this.upgradeLevels = { ...levels }
  }

  /** 设置金币收集回调 */
  setOnCoinCollect(cb: (count: number) => void): void {
    this.onCoinCollect = cb
  }

  /** 根据升级等级创建增强后的玩家 */
  private createPlayerWithUpgrades(): Player {
    const ul = this.upgradeLevels
    return {
      id: genId(),
      x: this.canvas.width / 2 - 16,
      y: this.canvas.height - 80,
      width: 32,
      height: 40,
      active: true,
      hp: PLAYER_MAX_HP + ul.maxHp,
      maxHp: PLAYER_MAX_HP + ul.maxHp,
      speed: PLAYER_SPEED + ul.speed * 0.5,
      fireRate: Math.max(2, PLAYER_FIRE_RATE - ul.fireRate * 2),
      fireTimer: 0,
      bombCount: 3,
      shieldTimer: 0,
      spreadLevel: 1,
      invincibleTimer: 0,
      bulletSpeedMul: 1 + ul.bulletSpeed * 0.15,  // 每级+15%子弹速度
    }
  }

  /** 获取当前攻击伤害（基础1 + 升级加成） */
  private getAttackDamage(): number {
    return 1 + this.upgradeLevels.attack
  }

  private createEmptyData(): GameData {
    return {
      player: this.createPlayer(),
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      powerups: [],
      coins: [],
      particles: [],
      stars: [],
      score: 0,
      wave: 0,
      waveTimer: 60,
      enemiesInWave: 0,
      enemiesSpawned: 0,
      bossActive: false,
      gameSpeed: 1,
      shakeTimer: 0,
      shakeIntensity: 0,
      stats: { kills: 0, bossKills: 0, powerupsUsed: 0, playTime: 0, startTime: 0 },
      coinsCollected: 0,
    }
  }

  private updateStats(): void {
    if (this.data.stats.startTime > 0) {
      this.data.stats.playTime = Math.floor((Date.now() - this.data.stats.startTime) / 1000)
    }
  }

  getStats(): GameStats {
    return this.data.stats
  }

  private createPlayer(): Player {
    return {
      id: genId(),
      x: this.canvas.width / 2 - 16,
      y: this.canvas.height - 80,
      width: 32,
      height: 40,
      active: true,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      speed: PLAYER_SPEED,
      fireRate: PLAYER_FIRE_RATE,
      fireTimer: 0,
      bombCount: 3,
      shieldTimer: 0,
      spreadLevel: 1,
      invincibleTimer: 0,
      bulletSpeedMul: 1,
    }
  }

  init(): void {
    nextId = 1
    this.data = this.createEmptyData()
    this.data.stars = []
    for (let i = 0; i < 100; i++) {
      this.data.stars.push(this.createStar())
    }
    this.onStateChange('menu', 0, 0)
  }

  start(): void {
    this.stop()
    this.data.player = this.createPlayerWithUpgrades()
    this.data.enemies = []
    this.data.playerBullets = []
    this.data.enemyBullets = []
    this.data.powerups = []
    this.data.coins = []
    this.data.particles = []
    this.data.score = 0
    this.data.wave = 0
    this.data.waveTimer = 60
    this.data.enemiesInWave = 0
    this.data.enemiesSpawned = 0
    this.data.bossActive = false
    this.data.gameSpeed = 1
    this.data.shakeTimer = 0
    this.data.shakeIntensity = 0
    this.data.stats = { kills: 0, bossKills: 0, powerupsUsed: 0, playTime: 0, startTime: Date.now() }
    this.data.coinsCollected = 0
    this.accumulator = 0
    this.lastTime = performance.now()
    this.onStateChange('playing', 0, 1)
    this.loop()
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }
  }

  /** 暂停游戏：停止循环但保留状态 */
  pause(): void {
    this.stop()
  }

  /** 恢复游戏：从暂停状态继续 */
  resume(): void {
    if (this.animationId) return // 已经在运行
    this.lastTime = performance.now()
    this.loop()
  }

  /** 重启游戏：重置数据并重新开始 */
  restart(): void {
    this.stop()
    this.start()
  }

  private loop = (): void => {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    // 固定时间步长：无论实际帧率如何，每秒精确执行60次update
    this.accumulator += Math.min(delta, 200)
    let updates = 0
    while (this.accumulator >= this.FIXED_DT && updates < 4) {
      this.update()
      this.accumulator -= this.FIXED_DT
      updates++
    }

    this.render()
    this.animationId = requestAnimationFrame(this.loop)
  }

  private bindInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase())
      if (e.key === ' ') {
        e.preventDefault()
        this.useBomb()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase())
    }
    const onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mousePos.x = e.clientX - rect.left
      this.mousePos.y = e.clientY - rect.top
    }
    const onMouseDown = () => {
      this.mouseDown = true
    }
    const onMouseUp = () => {
      this.mouseDown = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    this.canvas.addEventListener('mousemove', onMouseMove)
    this.canvas.addEventListener('mousedown', onMouseDown)
    this.canvas.addEventListener('mouseup', onMouseUp)
  }

  // --- Main Update ---

  update(): void {
    if (!this.data.player.active) return

    this.updatePlayer()
    this.updateBullets()
    this.updateEnemies()
    this.updateCoins()
    this.checkCollisions()
    this.updateParticles()
    this.updateStars()
    this.updateWaves()
    this.updateStats()

    if (this.data.shakeTimer > 0) {
      this.data.shakeTimer--
    }

    if (this.data.player.hp <= 0) {
      this.data.player.active = false
      this.addParticles(this.data.player.x + this.data.player.width / 2, this.data.player.y + this.data.player.height / 2, '#00FFD1', 40)
      this.updateStats()
      this.onStateChange('gameover', this.data.score, this.data.wave)
    }
  }

  private updatePlayer(): void {
    const p = this.data.player
    if (!p.active) return

    const useTouch = this.getActiveControl() === 'touch'

    if (useTouch && this.touchTarget.active) {
      // 拖动飞船模式：平滑移动到目标位置
      const targetX = this.touchTarget.x - p.width / 2
      const targetY = this.touchTarget.y - p.height / 2
      const dx = targetX - p.x
      const dy = targetY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      // 平滑跟随，距离越远移动越快，但有上限
      const moveSpeed = Math.min(dist, p.speed * 1)
      if (dist > 0.5) {
        p.x += (dx / dist) * moveSpeed
        p.y += (dy / dist) * moveSpeed
      }
    } else if (useTouch) {
      // 兼容旧摇杆输入（已不使用，保留以防回退）
      let dx = this.touchInput.x
      let dy = this.touchInput.y
      const mag = Math.sqrt(dx * dx + dy * dy)
      if (mag > 1) {
        dx /= mag
        dy /= mag
      }
      p.x += dx * p.speed
      p.y += dy * p.speed
    } else {
      // 键盘模式
      let dx = 0
      let dy = 0
      if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
      if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
      if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
      if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy)
        dx /= len
        dy /= len
      }
      p.x += dx * p.speed
      p.y += dy * p.speed
    }

    p.x = this.clamp(p.x, 0, this.canvas.width - p.width)
    p.y = this.clamp(p.y, 0, this.canvas.height - p.height)

    // Auto-fire
    if (p.fireTimer > 0) {
      p.fireTimer--
    }
    if (p.fireTimer <= 0) {
      this.playerShoot()
      p.fireTimer = p.fireRate
    }

    // Timers
    if (p.shieldTimer > 0) p.shieldTimer--
    if (p.invincibleTimer > 0) p.invincibleTimer--

    // Engine trail particles
    if (Math.random() < 0.5) {
      this.data.particles.push({
        x: p.x + p.width / 2 + (Math.random() - 0.5) * 8,
        y: p.y + p.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 2 + 1,
        life: 15 + Math.random() * 10,
        maxLife: 25,
        color: '#00FFFF',
        size: 2 + Math.random() * 2,
      })
    }
  }

  private updateBullets(): void {
    const updateList = (bullets: Bullet[]) => {
      for (const b of bullets) {
        if (!b.active) continue
        const custom = b as any
        if (custom._vx !== undefined || custom._vy !== undefined) {
          b.x += (custom._vx ?? 0)
          b.y += (custom._vy ?? 0)
        } else if (b.owner === 'player') {
          b.y -= b.speed
        } else {
          b.y += b.speed
        }
        if (b.y < -20 || b.y > this.canvas.height + 20 || b.x < -20 || b.x > this.canvas.width + 20) {
          b.active = false
        }
      }
    }
    updateList(this.data.playerBullets)
    updateList(this.data.enemyBullets)

    this.data.playerBullets = this.data.playerBullets.filter((b) => b.active)
    this.data.enemyBullets = this.data.enemyBullets.filter((b) => b.active)
  }

  private updateEnemies(): void {
    const speedMul = getGameSpeed(this.data.wave)
    for (const e of this.data.enemies) {
      if (!e.active) continue
      e.moveTimer++

      switch (e.type) {
        case EnemyType.SMALL:
          e.y += e.speed * speedMul
          e.x += Math.sin(e.moveTimer * 0.05) * 1.5 * speedMul
          break
        case EnemyType.MEDIUM: {
          e.y += e.speed * 0.7 * speedMul
          const dir = e.movePattern % 2 === 0 ? 1 : -1
          e.x += e.speed * dir * speedMul
          if (e.x <= 0 || e.x >= this.canvas.width - e.width) {
            e.movePattern++
          }
          break
        }
        case EnemyType.LARGE:
          if (e.y < e.targetY) {
            e.y += e.speed * speedMul
          } else {
            e.x += Math.sin(e.moveTimer * 0.02) * 2 * speedMul
          }
          break
        case EnemyType.BOSS:
          if (e.y < 80) {
            e.y += e.speed * speedMul
          } else {
            e.x += Math.sin(e.moveTimer * 0.015) * 3 * speedMul
          }
          break
      }

      // Enemy firing - 射击频率随wave提升
      if (e.fireRate > 0) {
        e.fireTimer++
        const fireRateMul = getEnemyFireRateMul(this.data.wave)
        const effectiveFireRate = Math.max(4, e.fireRate / (speedMul * fireRateMul * 0.6))
        if (e.fireTimer >= effectiveFireRate) {
          this.enemyShoot(e)
          e.fireTimer = 0
        }
      }

      // Off-screen deactivation (non-boss)
      if (e.type !== EnemyType.BOSS && e.y > this.canvas.height + 50) {
        e.active = false
      }
    }

    this.data.enemies = this.data.enemies.filter((e) => e.active)
  }

  // --- Spawning ---

  spawnWave(): void {
    this.data.wave++
    this.data.waveTimer = 60
    this.data.enemiesSpawned = 0

    if (this.data.wave % BOSS_EVERY_N_WAVES === 0) {
      this.data.bossActive = true
      this.data.enemiesInWave = 1
    } else {
      this.data.bossActive = false
      const level = getLevel(this.data.wave)
      const { countMul } = getLevelDifficulty(level)
      this.data.enemiesInWave = Math.floor(WAVE_ENEMIES(this.data.wave) * countMul)
    }

    this.onStateChange('playing', this.data.score, this.data.wave)
  }

  spawnEnemy(type: EnemyType, x?: number): void {
    const cfg = ENEMY_CONFIGS[type]
    const level = getLevel(this.data.wave)
    const { hpMul, speedMul } = getLevelDifficulty(level)
    const enemy: Enemy = {
      id: genId(),
      x: x ?? Math.random() * (this.canvas.width - cfg.width),
      y: -cfg.height,
      width: cfg.width,
      height: cfg.height,
      active: true,
      hp: Math.ceil(cfg.hp * hpMul),
      maxHp: Math.ceil(cfg.hp * hpMul),
      speed: cfg.speed * speedMul,
      type,
      movePattern: Math.random() < 0.5 ? 0 : 1,
      fireTimer: 0,
      fireRate: cfg.fireRate,
      moveTimer: 0,
      score: cfg.score,
      targetY: 80 + Math.random() * 200,
    }
    this.data.enemies.push(enemy)
    this.data.enemiesSpawned++
  }

  spawnBoss(): void {
    const cfg = ENEMY_CONFIGS[EnemyType.BOSS]
    const level = getLevel(this.data.wave)
    const { hpMul, speedMul } = getLevelDifficulty(level)
    const boss: Enemy = {
      id: genId(),
      x: this.canvas.width / 2 - cfg.width / 2,
      y: -cfg.height,
      width: cfg.width,
      height: cfg.height,
      active: true,
      hp: Math.ceil((cfg.hp + (this.data.wave - 1) * 10) * hpMul),
      maxHp: Math.ceil((cfg.hp + (this.data.wave - 1) * 10) * hpMul),
      speed: cfg.speed * speedMul,
      type: EnemyType.BOSS,
      movePattern: 0,
      fireTimer: 0,
      fireRate: Math.max(10, cfg.fireRate - this.data.wave),
      moveTimer: 0,
      score: cfg.score + this.data.wave * 500,
      targetY: 80,
    }
    this.data.enemies.push(boss)
    this.data.enemiesSpawned++
    this.data.bossActive = true
  }

  playerShoot(): void {
    const p = this.data.player
    if (!p.active) return

    const cx = p.x + p.width / 2
    const cy = p.y
    const bspd = PLAYER_BULLET_SPEED * p.bulletSpeedMul

    if (p.spreadLevel >= 3) {
      // 5-way spread
      const angles = [-0.3, -0.15, 0, 0.15, 0.3]
      for (const a of angles) {
        this.data.playerBullets.push({
          id: genId(),
          x: cx - 3,
          y: cy,
          width: 6,
          height: 14,
          active: true,
          speed: bspd,
          damage: this.getAttackDamage(),
          owner: 'player',
          bulletType: 'spread',
          _vx: Math.sin(a) * bspd,
          _vy: -Math.cos(a) * bspd,
        } as any)
      }
    } else if (p.spreadLevel >= 2) {
      // 3-way spread
      const angles = [-0.2, 0, 0.2]
      for (const a of angles) {
        this.data.playerBullets.push({
          id: genId(),
          x: cx - 3,
          y: cy,
          width: 6,
          height: 14,
          active: true,
          speed: bspd,
          damage: this.getAttackDamage(),
          owner: 'player',
          bulletType: 'spread',
          _vx: Math.sin(a) * bspd,
          _vy: -Math.cos(a) * bspd,
        } as any)
      }
    } else {
      // Single shot
      this.data.playerBullets.push({
        id: genId(),
        x: cx - 3,
        y: cy,
        width: 6,
        height: 14,
        active: true,
        speed: bspd,
        damage: this.getAttackDamage(),
        owner: 'player',
        bulletType: 'normal',
      })
    }
  }

  enemyShoot(enemy: Enemy): void {
    const cx = enemy.x + enemy.width / 2
    const cy = enemy.y + enemy.height

    if (enemy.type === EnemyType.BOSS) {
      // Boss fires complex patterns
      const pattern = Math.floor(enemy.moveTimer / 60) % 3
      if (pattern === 0) {
        // Radial burst
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8
          this.data.enemyBullets.push({
            id: genId(),
            x: cx - 4,
            y: cy - 4,
            width: 8,
            height: 8,
            active: true,
            speed: 1.8,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: Math.cos(angle) * 1.8,
            _vy: Math.sin(angle) * 1.8,
          } as any)
        }
      } else if (pattern === 1) {
        // Aimed shot at player
        const dx = this.data.player.x + this.data.player.width / 2 - cx
        const dy = this.data.player.y + this.data.player.height / 2 - cy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        for (let i = -1; i <= 1; i++) {
          this.data.enemyBullets.push({
            id: genId(),
            x: cx - 4 + i * 15,
            y: cy,
            width: 8,
            height: 8,
            active: true,
            speed: 2.4,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: (dx / dist) * 2.4,
            _vy: (dy / dist) * 2.4,
          } as any)
        }
      } else {
        // Spiral
        const angle = enemy.moveTimer * 0.1
        for (let i = 0; i < 3; i++) {
          const a = angle + (i * Math.PI * 2) / 3
          this.data.enemyBullets.push({
            id: genId(),
            x: cx - 4,
            y: cy,
            width: 8,
            height: 8,
            active: true,
            speed: 2.1,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: Math.cos(a) * 2.1,
            _vy: Math.sin(a) * 2.1,
          } as any)
        }
      }
    } else {
      // Normal enemy fires single bullet aimed at player
      const dx = this.data.player.x + this.data.player.width / 2 - cx
      const dy = this.data.player.y + this.data.player.height / 2 - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const spd = 1.8
      this.data.enemyBullets.push({
        id: genId(),
        x: cx - 4,
        y: cy,
        width: 8,
        height: 8,
        active: true,
        speed: spd,
        damage: 1,
        owner: 'enemy',
        bulletType: 'normal',
        _vx: (dx / dist) * spd,
        _vy: (dy / dist) * spd,
      } as any)
    }
  }

  spawnPowerup(x: number, y: number): void {
    if (Math.random() > POWERUP_DROP_CHANCE) return
    const types: PowerupType[] = ['spread', 'shield', 'bomb', 'heal', 'bulletspeed']
    const type = types[Math.floor(Math.random() * types.length)]
    this.data.powerups.push({
      id: genId(),
      x,
      y,
      width: 20,
      height: 20,
      active: true,
      type,
    })
  }

  /** 生成金币 */
  spawnCoin(x: number, y: number, value: number): void {
    this.data.coins.push({
      id: genId(),
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      width: 12,
      height: 12,
      active: true,
      value,
      vy: 0.5 + Math.random() * 0.5,
    })
  }

  /** 敌人死亡时掉落金币 */
  spawnCoinsFromEnemy(x: number, y: number, type: EnemyType): void {
    if (type === EnemyType.BOSS) {
      // Boss必掉多个金币
      for (let i = 0; i < BOSS_COIN_COUNT; i++) {
        this.spawnCoin(x, y, COIN_VALUES[type])
      }
    } else if (Math.random() < COIN_DROP_CHANCE) {
      // 普通敌人概率掉落
      this.spawnCoin(x, y, COIN_VALUES[type])
    }
  }

  /** 更新金币位置 */
  private updateCoins(): void {
    for (const c of this.data.coins) {
      if (!c.active) continue
      c.y += c.vy
      // 超出屏幕则移除
      if (c.y > this.canvas.height + 20) {
        c.active = false
      }
    }
    this.data.coins = this.data.coins.filter((c) => c.active)
  }

  useBomb(): void {
    const p = this.data.player
    if (!p.active || p.bombCount <= 0) return
    p.bombCount--

    // Destroy all enemy bullets
    for (const b of this.data.enemyBullets) {
      this.addParticles(b.x + b.width / 2, b.y + b.height / 2, '#FFD700', 3)
      b.active = false
    }

    // Damage all enemies
    for (const e of this.data.enemies) {
      e.hp -= 5
      this.addParticles(e.x + e.width / 2, e.y + e.height / 2, '#FFD700', 8)
      if (e.hp <= 0) {
        e.active = false
        this.data.score += e.score
        this.data.stats.kills++
        if (e.type === EnemyType.BOSS) {
          this.data.stats.bossKills++
          this.data.bossActive = false
        }
        this.addParticles(e.x + e.width / 2, e.y + e.height / 2, ENEMY_CONFIGS[e.type].color, 20)
        this.spawnPowerup(e.x + e.width / 2, e.y + e.height / 2)
        this.spawnCoinsFromEnemy(e.x + e.width / 2, e.y + e.height / 2, e.type)
      }
    }

    // Screen flash effect via shake
    this.data.shakeTimer = 15
    this.data.shakeIntensity = 8

    this.data.enemyBullets = this.data.enemyBullets.filter((b) => b.active)
    this.data.enemies = this.data.enemies.filter((e) => e.active)
  }

  // --- Collision ---

  checkCollisions(): void {
    const p = this.data.player

    // Player bullets vs enemies
    for (const b of this.data.playerBullets) {
      if (!b.active) continue
      for (const e of this.data.enemies) {
        if (!e.active) continue
        if (this.rectCollision(b, e)) {
          b.active = false
          e.hp -= b.damage
          this.addParticles(b.x + b.width / 2, b.y, '#00FFD1', 3)
          if (e.hp <= 0) {
            e.active = false
            this.data.score += e.score
            this.data.stats.kills++
            this.addParticles(e.x + e.width / 2, e.y + e.height / 2, ENEMY_CONFIGS[e.type].color, 20)
            this.spawnPowerup(e.x + e.width / 2, e.y + e.height / 2)
            this.spawnCoinsFromEnemy(e.x + e.width / 2, e.y + e.height / 2, e.type)
            if (e.type === EnemyType.BOSS) {
              this.data.bossActive = false
              this.data.stats.bossKills++
              this.data.shakeTimer = 20
              this.data.shakeIntensity = 10
            }
          }
          break
        }
      }
    }

    // Enemy bullets vs player
    if (p.invincibleTimer <= 0) {
      for (const b of this.data.enemyBullets) {
        if (!b.active) continue
        if (this.rectCollision(b, p)) {
          b.active = false
          if (p.shieldTimer > 0) {
            this.addParticles(b.x + b.width / 2, b.y + b.height / 2, '#00BFFF', 5)
          } else {
            p.hp--
            p.invincibleTimer = 90
            this.data.shakeTimer = 10
            this.data.shakeIntensity = 6
            this.addParticles(p.x + p.width / 2, p.y + p.height / 2, '#FF4D4D', 10)
          }
        }
      }
    }

    // Player vs powerups
    for (const pw of this.data.powerups) {
      if (!pw.active) continue
      if (this.rectCollision(p, pw)) {
        pw.active = false
        this.data.stats.powerupsUsed++
        this.addParticles(pw.x + pw.width / 2, pw.y + pw.height / 2, POWERUP_COLORS[pw.type], 10)
        switch (pw.type) {
          case 'spread':
            p.spreadLevel = Math.min(p.spreadLevel + 1, 3)
            break
          case 'shield':
            p.shieldTimer = 300
            break
          case 'bomb':
            p.bombCount = Math.min(p.bombCount + 1, 5)
            break
          case 'heal':
            p.hp = Math.min(p.hp + 1, p.maxHp)
            break
          case 'bulletspeed':
            p.bulletSpeedMul = Math.min(p.bulletSpeedMul + 0.5, 3)
            break
        }
      }
    }

    // Player vs coins - 拾取金币
    for (const c of this.data.coins) {
      if (!c.active) continue
      if (this.rectCollision(p, c)) {
        c.active = false
        this.data.coinsCollected += c.value
        this.onCoinCollect(c.value)
        this.addParticles(c.x + c.width / 2, c.y + c.height / 2, '#FFD700', 5)
      }
    }

    // Enemies vs player
    if (p.invincibleTimer <= 0) {
      for (const e of this.data.enemies) {
        if (!e.active) continue
        if (this.rectCollision(p, e)) {
          if (p.shieldTimer > 0) {
            e.hp -= 3
            this.addParticles(e.x + e.width / 2, e.y + e.height / 2, '#00BFFF', 10)
            if (e.hp <= 0) {
              e.active = false
              this.data.score += e.score
              this.addParticles(e.x + e.width / 2, e.y + e.height / 2, ENEMY_CONFIGS[e.type].color, 20)
              this.spawnCoinsFromEnemy(e.x + e.width / 2, e.y + e.height / 2, e.type)
            }
          } else {
            p.hp -= 2
            p.invincibleTimer = 90
            this.data.shakeTimer = 15
            this.data.shakeIntensity = 8
            this.addParticles(p.x + p.width / 2, p.y + p.height / 2, '#FF4D4D', 15)
          }
        }
      }
    }

    // Clean up
    this.data.playerBullets = this.data.playerBullets.filter((b) => b.active)
    this.data.enemyBullets = this.data.enemyBullets.filter((b) => b.active)
    this.data.powerups = this.data.powerups.filter((pw) => pw.active)
    this.data.coins = this.data.coins.filter((c) => c.active)
    this.data.enemies = this.data.enemies.filter((e) => e.active)
  }

  // --- Particles ---

  addParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 4 + 1
      this.data.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color,
        size: 1 + Math.random() * 3,
      })
    }
  }

  updateParticles(): void {
    for (const p of this.data.particles) {
      p.x += p.vx
      p.y += p.vy
      p.life--
      p.vx *= 0.98
      p.vy *= 0.98
    }
    this.data.particles = this.data.particles.filter((p) => p.life > 0)
  }

  renderParticles(): void {
    const ctx = this.ctx
    for (const p of this.data.particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.shadowBlur = 6
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  // --- Stars ---

  createStar(): Star {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      speed: 0.2 + Math.random() * 1.5,
      brightness: 0.3 + Math.random() * 0.7,
      size: 0.5 + Math.random() * 2,
    }
  }

  updateStars(): void {
    for (const s of this.data.stars) {
      s.y += s.speed
      if (s.y > this.canvas.height) {
        s.y = 0
        s.x = Math.random() * this.canvas.width
      }
    }
  }

  renderStars(): void {
    const ctx = this.ctx
    for (const s of this.data.stars) {
      ctx.globalAlpha = s.brightness
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // --- Rendering ---

  render(): void {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    ctx.save()

    // Screen shake
    if (this.data.shakeTimer > 0) {
      const intensity = this.data.shakeIntensity * (this.data.shakeTimer / 15)
      ctx.translate(
        (Math.random() - 0.5) * intensity * 2,
        (Math.random() - 0.5) * intensity * 2
      )
    }

    // Clear
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(-10, -10, w + 20, h + 20)

    // Render layers
    this.renderStars()
    this.renderPowerups()
    this.renderCoins()
    this.renderEnemyBullets()
    this.renderEnemies()
    this.renderPlayerBullets()
    this.renderPlayer()
    this.renderParticles()
    this.renderHUD()

    ctx.restore()
  }

  renderPlayer(): void {
    const p = this.data.player
    if (!p.active) return
    const ctx = this.ctx

    // Invincibility blink
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      return
    }

    const cx = p.x + p.width / 2
    const cy = p.y + p.height / 2

    // Engine glow
    const grad = ctx.createLinearGradient(cx, p.y + p.height, cx, p.y + p.height + 20)
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.8)')
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(cx - 8, p.y + p.height)
    ctx.lineTo(cx + 8, p.y + p.height)
    ctx.lineTo(cx, p.y + p.height + 15 + Math.random() * 8)
    ctx.closePath()
    ctx.fill()

    // Ship body - sleek triangular fighter
    ctx.shadowBlur = 15
    ctx.shadowColor = '#00FFD1'

    // Main hull
    ctx.fillStyle = '#0a2a2a'
    ctx.strokeStyle = '#00FFD1'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, p.y) // nose
    ctx.lineTo(cx + p.width / 2 + 4, p.y + p.height) // right wing
    ctx.lineTo(cx + 4, p.y + p.height - 8) // right inner
    ctx.lineTo(cx, p.y + p.height - 4) // center bottom
    ctx.lineTo(cx - 4, p.y + p.height - 8) // left inner
    ctx.lineTo(cx - p.width / 2 - 4, p.y + p.height) // left wing
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Cockpit
    ctx.fillStyle = '#00FFD1'
    ctx.beginPath()
    ctx.ellipse(cx, p.y + p.height * 0.35, 3, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0

    // Shield effect
    if (p.shieldTimer > 0) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.5
      ctx.strokeStyle = `rgba(0, 191, 255, ${pulse})`
      ctx.lineWidth = 2
      ctx.shadowBlur = 15
      ctx.shadowColor = '#00BFFF'
      ctx.beginPath()
      ctx.arc(cx, cy, p.width * 0.9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  renderEnemies(): void {
    for (const e of this.data.enemies) {
      if (!e.active) continue
      this.renderEnemy(e)
    }
  }

  renderEnemy(enemy: Enemy): void {
    const ctx = this.ctx
    const cx = enemy.x + enemy.width / 2
    const cy = enemy.y + enemy.height / 2
    const cfg = ENEMY_CONFIGS[enemy.type]

    ctx.shadowBlur = 10
    ctx.shadowColor = cfg.color
    ctx.fillStyle = cfg.color + '33'
    ctx.strokeStyle = cfg.color
    ctx.lineWidth = 1.5

    switch (enemy.type) {
      case EnemyType.SMALL: {
        // Diamond shape
        const s = enemy.width / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy - s)
        ctx.lineTo(cx + s, cy)
        ctx.lineTo(cx, cy + s)
        ctx.lineTo(cx - s, cy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case EnemyType.MEDIUM: {
        // Pentagon shape
        const r = enemy.width / 2
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const px = cx + Math.cos(angle) * r
          const py = cy + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case EnemyType.LARGE: {
        // Hexagon shape
        const r = enemy.width / 2
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6
          const px = cx + Math.cos(angle) * r
          const py = cy + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case EnemyType.BOSS: {
        // Complex rotating shape
        const r = enemy.width / 2
        const rot = enemy.moveTimer * 0.02

        // Outer ring
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + rot
          const outerR = r * (i % 2 === 0 ? 1 : 0.7)
          const px = cx + Math.cos(angle) * outerR
          const py = cy + Math.sin(angle) * outerR
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Inner core
        ctx.fillStyle = cfg.color
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2)
        ctx.fill()

        // Rotating spikes
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI * 2 * i) / 4 + rot * 1.5
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * r * 0.35, cy + Math.sin(angle) * r * 0.35)
          ctx.lineTo(cx + Math.cos(angle) * r * 0.9, cy + Math.sin(angle) * r * 0.9)
          ctx.strokeStyle = cfg.color
          ctx.lineWidth = 3
          ctx.stroke()
        }

        break
      }
    }

    ctx.shadowBlur = 0

    // Health bar for medium+ enemies
    if (enemy.type !== EnemyType.SMALL) {
      const barWidth = enemy.width
      const barHeight = 3
      const barX = enemy.x
      const barY = enemy.y - 8
      const hpRatio = enemy.hp / enemy.maxHp

      ctx.fillStyle = '#333'
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.fillStyle = cfg.color
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight)
    }
  }

  renderPlayerBullets(): void {
    const ctx = this.ctx
    for (const b of this.data.playerBullets) {
      if (!b.active) continue
      this.renderBullet(b)
    }
  }

  renderEnemyBullets(): void {
    const ctx = this.ctx
    for (const b of this.data.enemyBullets) {
      if (!b.active) continue
      this.renderBullet(b)
    }
  }

  renderBullet(bullet: Bullet): void {
    const ctx = this.ctx
    const cx = bullet.x + bullet.width / 2
    const cy = bullet.y + bullet.height / 2

    if (bullet.owner === 'player') {
      // Player bullet: neon cyan elongated rectangle with glow
      ctx.shadowBlur = 12
      ctx.shadowColor = '#00FFD1'
      ctx.fillStyle = '#00FFD1'
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      ctx.shadowBlur = 0
    } else {
      if (bullet.bulletType === 'boss') {
        // Boss bullet: purple larger circle with glow
        ctx.shadowBlur = 20
        ctx.shadowColor = '#FF00FF'
        ctx.fillStyle = '#FF00FF'
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fill()
        // 内核高亮
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(cx, cy, 4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Normal enemy bullet: orange-red circle with glow
        ctx.shadowBlur = 18
        ctx.shadowColor = '#FF3333'
        ctx.fillStyle = '#FF3333'
        ctx.beginPath()
        ctx.arc(cx, cy, 6, 0, Math.PI * 2)
        ctx.fill()
        // 内核高亮
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }
  }

  renderPowerups(): void {
    const ctx = this.ctx
    for (const pw of this.data.powerups) {
      if (!pw.active) continue
      this.renderPowerup(pw)
    }
  }

  renderPowerup(powerup: Powerup): void {
    const ctx = this.ctx
    const cx = powerup.x + powerup.width / 2
    const cy = powerup.y + powerup.height / 2
    const color = POWERUP_COLORS[powerup.type]
    const rotation = Date.now() * 0.003

    // Powerups fall slowly
    powerup.y += 0.5

    // Glowing circle
    ctx.shadowBlur = 15
    ctx.shadowColor = color
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.fillStyle = color + '22'
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Icon inside
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.fillStyle = color
    ctx.font = 'bold 10px monospace'

    const icons: Record<PowerupType, string> = {
      spread: 'S',
      shield: 'D',
      bomb: 'B',
      heal: '+',
      bulletspeed: 'V',
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icons[powerup.type], 0, 0)
    ctx.restore()

    ctx.shadowBlur = 0

    // Off-screen deactivation
    if (powerup.y > this.canvas.height + 20) {
      powerup.active = false
    }
  }

  renderCoins(): void {
    const ctx = this.ctx
    for (const c of this.data.coins) {
      if (!c.active) continue
      const cx = c.x + c.width / 2
      const cy = c.y + c.height / 2
      const rot = Date.now() * 0.003 + c.id
      const pulse = Math.sin(Date.now() * 0.005 + c.id) * 0.2 + 0.8

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)

      // 金币光晕
      ctx.shadowBlur = 14
      ctx.shadowColor = '#FFD700'
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.25})`
      ctx.beginPath()
      ctx.arc(0, 0, 11, 0, Math.PI * 2)
      ctx.fill()

      // 金币本体 - 菱形
      ctx.fillStyle = '#FFD700'
      ctx.strokeStyle = '#B8860B'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -7)
      ctx.lineTo(7, 0)
      ctx.lineTo(0, 7)
      ctx.lineTo(-7, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // 内层高亮菱形
      ctx.fillStyle = '#FFF8DC'
      ctx.beginPath()
      ctx.moveTo(0, -4)
      ctx.lineTo(4, 0)
      ctx.lineTo(0, 4)
      ctx.lineTo(-4, 0)
      ctx.closePath()
      ctx.fill()

      ctx.restore()

      // "$" 符号（不旋转，保持可读）
      ctx.shadowBlur = 0
      ctx.fillStyle = '#8B6914'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('$', cx, cy + 1)
    }
  }

  renderHUD(): void {
    const ctx = this.ctx
    const p = this.data.player
    const w = this.canvas.width
    const level = getLevel(this.data.wave)

    // HP bar - top left
    const hpBarX = 10
    const hpBarY = 10
    const hpBarW = 120
    const hpBarH = 10
    const hpRatio = p.hp / p.maxHp

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH)
    ctx.fillStyle = '#00FFD1'
    ctx.shadowBlur = 6
    ctx.shadowColor = '#00FFD1'
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#00FFD1'
    ctx.lineWidth = 1
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH)

    ctx.fillStyle = '#00FFD1'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`HP ${p.hp}/${p.maxHp}`, hpBarX, hpBarY + 22)

    // Score - top right
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'right'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#ffffff'
    ctx.fillText(`${this.data.score}`, w - 10, 22)
    ctx.shadowBlur = 0
    ctx.font = '10px monospace'
    ctx.fillStyle = '#888'
    ctx.fillText('SCORE', w - 10, 36)

    // Level & Wave indicator - top center
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 10px monospace'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#FFD700'
    ctx.fillText(`LV.${level}`, w / 2, 12)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(`WAVE ${this.data.wave}`, w / 2, 28)

    // Bomb count - bottom left
    ctx.textAlign = 'left'
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 12px monospace'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#FFD700'
    ctx.fillText(`BOMB x${p.bombCount}`, 10, this.canvas.height - 10)
    ctx.shadowBlur = 0

    // Spread level indicator
    if (p.spreadLevel > 1) {
      ctx.fillStyle = '#00FFD1'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`SPREAD LV${p.spreadLevel}`, 10, this.canvas.height - 28)
    }

    // Bullet speed indicator
    if (p.bulletSpeedMul > 1) {
      ctx.fillStyle = '#FF6600'
      ctx.font = 'bold 10px monospace'
      ctx.shadowBlur = 4
      ctx.shadowColor = '#FF6600'
      ctx.fillText(`BULLET SPD x${p.bulletSpeedMul.toFixed(1)}`, 10, this.canvas.height - 46)
      ctx.shadowBlur = 0
    }

    // Shield indicator
    if (p.shieldTimer > 0) {
      ctx.fillStyle = '#00BFFF'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`SHIELD ${Math.ceil(p.shieldTimer / 60)}s`, 10, this.canvas.height - 64)
    }

    // Coin count - bottom right
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 12px monospace'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#FFD700'
    ctx.fillText(`${this.data.coinsCollected}`, w - 10, this.canvas.height - 10)
    ctx.shadowBlur = 0
    ctx.font = '10px monospace'
    ctx.fillStyle = '#888'
    ctx.fillText('COINS', w - 10, this.canvas.height - 24)
  }

  // --- Wave Management ---

  private updateWaves(): void {
    const speedMul = getGameSpeed(this.data.wave)
    if (this.data.waveTimer > 0) {
      this.data.waveTimer--
      return
    }

    // If no wave is active, spawn one
    if (this.data.enemiesInWave === 0) {
      this.spawnWave()
      return
    }

    // Spawn enemies gradually
    if (this.data.enemiesSpawned < this.data.enemiesInWave) {
      if (this.data.bossActive) {
        this.spawnBoss()
      } else {
        // Weighted random enemy type
        const rand = Math.random()
        let type: EnemyType
        if (rand < 0.5) type = EnemyType.SMALL
        else if (rand < 0.8) type = EnemyType.MEDIUM
        else type = EnemyType.LARGE
        this.spawnEnemy(type)
      }
      // Delay between spawns - 速度系数影响生成间隔（速度越高生成越快）
      this.data.waveTimer = this.data.bossActive ? 0 : Math.max(8, Math.floor(25 / speedMul))
    }

    // Check if wave is complete
    if (
      this.data.enemiesSpawned >= this.data.enemiesInWave &&
      this.data.enemies.length === 0
    ) {
      this.data.enemiesInWave = 0
      this.data.enemiesSpawned = 0
      this.data.waveTimer = 90 // Brief pause before next wave
    }
  }

  // --- Utilities ---

  rectCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val))
  }
}
