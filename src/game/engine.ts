import {
  Vector2D,
  Player,
  Enemy,
  EnemyType,
  Bullet,
  Powerup,
  PowerupType,
  Particle,
  Star,
  GameState,
  GameData,
  GameStats,
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
} from './constants'

let nextId = 1
function genId(): number {
  return nextId++
}

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

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState, score: number, wave: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onStateChange = onStateChange
    this.keys = new Set()
    this.mousePos = { x: canvas.width / 2, y: canvas.height / 2 }
    this.mouseDown = false
    this.animationId = 0
    this.lastTime = 0
    this.data = this.createEmptyData()
    this.bindInput()
  }

  private createEmptyData(): GameData {
    return {
      player: this.createPlayer(),
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      powerups: [],
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
    this.data.player = this.createPlayer()
    this.data.enemies = []
    this.data.playerBullets = []
    this.data.enemyBullets = []
    this.data.powerups = []
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

  private loop = (): void => {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    if (delta < 200) {
      this.update()
      this.render()
    }

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
    for (const e of this.data.enemies) {
      if (!e.active) continue
      e.moveTimer++

      switch (e.type) {
        case EnemyType.SMALL:
          e.y += e.speed
          e.x += Math.sin(e.moveTimer * 0.05) * 1.5
          break
        case EnemyType.MEDIUM: {
          e.y += e.speed * 0.7
          const dir = e.movePattern % 2 === 0 ? 1 : -1
          e.x += e.speed * dir
          if (e.x <= 0 || e.x >= this.canvas.width - e.width) {
            e.movePattern++
          }
          break
        }
        case EnemyType.LARGE:
          if (e.y < e.targetY) {
            e.y += e.speed
          } else {
            e.x += Math.sin(e.moveTimer * 0.02) * 2
          }
          break
        case EnemyType.BOSS:
          if (e.y < 80) {
            e.y += e.speed
          } else {
            e.x += Math.sin(e.moveTimer * 0.015) * 3
          }
          break
      }

      // Enemy firing
      if (e.fireRate > 0) {
        e.fireTimer++
        if (e.fireTimer >= e.fireRate) {
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
      this.data.enemiesInWave = WAVE_ENEMIES(this.data.wave)
    }

    this.onStateChange('playing', this.data.score, this.data.wave)
  }

  spawnEnemy(type: EnemyType, x?: number): void {
    const cfg = ENEMY_CONFIGS[type]
    const enemy: Enemy = {
      id: genId(),
      x: x ?? Math.random() * (this.canvas.width - cfg.width),
      y: -cfg.height,
      width: cfg.width,
      height: cfg.height,
      active: true,
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed,
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
    const boss: Enemy = {
      id: genId(),
      x: this.canvas.width / 2 - cfg.width / 2,
      y: -cfg.height,
      width: cfg.width,
      height: cfg.height,
      active: true,
      hp: cfg.hp + (this.data.wave - 1) * 10,
      maxHp: cfg.hp + (this.data.wave - 1) * 10,
      speed: cfg.speed,
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
          speed: PLAYER_BULLET_SPEED,
          damage: 1,
          owner: 'player',
          bulletType: 'spread',
          _vx: Math.sin(a) * PLAYER_BULLET_SPEED,
          _vy: -Math.cos(a) * PLAYER_BULLET_SPEED,
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
          speed: PLAYER_BULLET_SPEED,
          damage: 1,
          owner: 'player',
          bulletType: 'spread',
          _vx: Math.sin(a) * PLAYER_BULLET_SPEED,
          _vy: -Math.cos(a) * PLAYER_BULLET_SPEED,
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
        speed: PLAYER_BULLET_SPEED,
        damage: 1,
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
            speed: 3,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: Math.cos(angle) * 3,
            _vy: Math.sin(angle) * 3,
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
            speed: 4,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: (dx / dist) * 4,
            _vy: (dy / dist) * 4,
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
            speed: 3.5,
            damage: 1,
            owner: 'enemy',
            bulletType: 'boss',
            _vx: Math.cos(a) * 3.5,
            _vy: Math.sin(a) * 3.5,
          } as any)
        }
      }
    } else {
      // Normal enemy fires single bullet aimed at player
      const dx = this.data.player.x + this.data.player.width / 2 - cx
      const dy = this.data.player.y + this.data.player.height / 2 - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const spd = 3
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
    const types: PowerupType[] = ['spread', 'shield', 'bomb', 'heal']
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
        }
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
        ctx.shadowBlur = 12
        ctx.shadowColor = '#9400D3'
        ctx.fillStyle = '#9400D3'
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Normal enemy bullet: orange-red circle with glow
        ctx.shadowBlur = 10
        ctx.shadowColor = '#FF4D4D'
        ctx.fillStyle = '#FF4D4D'
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

  renderHUD(): void {
    const ctx = this.ctx
    const p = this.data.player
    const w = this.canvas.width

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

    // Wave indicator - top center
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(`WAVE ${this.data.wave}`, w / 2, 22)

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

    // Shield indicator
    if (p.shieldTimer > 0) {
      ctx.fillStyle = '#00BFFF'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`SHIELD ${Math.ceil(p.shieldTimer / 60)}s`, 10, this.canvas.height - 46)
    }
  }

  // --- Wave Management ---

  private updateWaves(): void {
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
      // Delay between spawns
      this.data.waveTimer = this.data.bossActive ? 0 : 25
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
