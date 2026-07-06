import { create } from 'zustand'
import type { PlayerInfo, GameStats, UpgradeLevels, UpgradeType } from '@/game/types'
import type { ControlMode } from '@/game/engine'
import { UPGRADE_MAX_LEVEL, getUpgradeCost } from '@/game/constants'
import { getPlayerProgress, syncPlayerProgress } from '@/lib/api'

type GameState = 'menu' | 'playing' | 'paused' | 'gameover'

// 默认升级等级
const DEFAULT_UPGRADE_LEVELS: UpgradeLevels = {
  attack: 0,
  fireRate: 0,
  maxHp: 0,
  speed: 0,
  bulletSpeed: 0,
}

interface GameStore {
  // Auth
  player: PlayerInfo | null
  setPlayer: (player: PlayerInfo | null) => void
  loadPlayer: () => void

  // Game state
  gameState: GameState
  score: number
  wave: number
  stats: GameStats | null
  setGameState: (state: GameState) => void
  setScore: (score: number) => void
  setWave: (wave: number) => void
  setStats: (stats: GameStats | null) => void

  // UI
  showLogin: boolean
  setShowLogin: (show: boolean) => void
  showUpgradeShop: boolean
  setShowUpgradeShop: (show: boolean) => void

  // Control mode
  controlMode: ControlMode
  setControlMode: (mode: ControlMode) => void

  // 金币系统
  coins: number
  addCoins: (count: number) => void
  spendCoins: (count: number) => boolean

  // 升级系统
  upgradeLevels: UpgradeLevels
  upgrade: (type: UpgradeType) => boolean

  // 同步到服务器
  syncToServer: () => void
  loadFromServer: (playerId: number) => Promise<void>

  // Actions
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: () => void
  resetGame: () => void
  logout: () => void
}

// 防抖同步定时器
let syncTimer: ReturnType<typeof setTimeout> | null = null

// 从localStorage加载金币和升级数据
function loadSavedData(): { coins: number; upgradeLevels: UpgradeLevels } {
  try {
    const savedCoins = localStorage.getItem('coins')
    const savedUpgrades = localStorage.getItem('upgradeLevels')
    return {
      coins: savedCoins ? parseInt(savedCoins, 10) || 0 : 0,
      upgradeLevels: savedUpgrades ? { ...DEFAULT_UPGRADE_LEVELS, ...JSON.parse(savedUpgrades) } : { ...DEFAULT_UPGRADE_LEVELS },
    }
  } catch {
    return { coins: 0, upgradeLevels: { ...DEFAULT_UPGRADE_LEVELS } }
  }
}

const savedData = loadSavedData()

export const useGameStore = create<GameStore>((set, get) => ({
  player: null,
  setPlayer: (player) => {
    if (player) {
      localStorage.setItem('player', JSON.stringify(player))
    } else {
      localStorage.removeItem('player')
    }
    set({ player })
  },
  loadPlayer: () => {
    const saved = localStorage.getItem('player')
    if (saved) {
      try {
        set({ player: JSON.parse(saved) })
      } catch {
        localStorage.removeItem('player')
      }
    }
  },

  gameState: 'menu',
  score: 0,
  wave: 1,
  stats: null,
  setGameState: (gameState) => set({ gameState }),
  setScore: (score) => set({ score }),
  setWave: (wave) => set({ wave }),
  setStats: (stats) => set({ stats }),

  showLogin: false,
  setShowLogin: (showLogin) => set({ showLogin }),
  showUpgradeShop: false,
  setShowUpgradeShop: (showUpgradeShop) => set({ showUpgradeShop }),

  controlMode: ((): ControlMode => {
    const saved = localStorage.getItem('controlMode') as ControlMode | null
    return saved || 'auto'
  })(),
  setControlMode: (controlMode) => {
    localStorage.setItem('controlMode', controlMode)
    set({ controlMode })
  },

  // 金币系统
  coins: savedData.coins,
  addCoins: (count) => {
    const newCoins = get().coins + count
    localStorage.setItem('coins', String(newCoins))
    set({ coins: newCoins })
    // 防抖同步到服务器（3秒后）
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => get().syncToServer(), 3000)
  },
  spendCoins: (count) => {
    const current = get().coins
    if (current < count) return false
    const newCoins = current - count
    localStorage.setItem('coins', String(newCoins))
    set({ coins: newCoins })
    // 花费金币立即同步
    get().syncToServer()
    return true
  },

  // 升级系统
  upgradeLevels: savedData.upgradeLevels,
  upgrade: (type) => {
    const levels = get().upgradeLevels
    const currentLevel = levels[type]
    if (currentLevel >= UPGRADE_MAX_LEVEL) return false
    const cost = getUpgradeCost(type, currentLevel)
    if (!get().spendCoins(cost)) return false
    const newLevels = { ...levels, [type]: currentLevel + 1 }
    localStorage.setItem('upgradeLevels', JSON.stringify(newLevels))
    set({ upgradeLevels: newLevels })
    // 升级后立即同步
    get().syncToServer()
    return true
  },

  // 同步到服务器
  syncToServer: () => {
    const { player, coins, upgradeLevels } = get()
    if (!player) return
    syncPlayerProgress(player.id, coins, upgradeLevels).catch(() => {
      // 静默失败，下次再同步
    })
  },

  // 从服务器加载
  loadFromServer: async (playerId) => {
    try {
      const progress = await getPlayerProgress(playerId)
      if (progress.upgradeLevels) {
        const levels = { ...DEFAULT_UPGRADE_LEVELS, ...progress.upgradeLevels }
        localStorage.setItem('upgradeLevels', JSON.stringify(levels))
        set({ upgradeLevels: levels })
      }
      localStorage.setItem('coins', String(progress.coins))
      set({ coins: progress.coins })
    } catch {
      // 静默失败，使用本地数据
    }
  },

  startGame: () => {
    if (!get().player) {
      set({ showLogin: true })
      return
    }
    set({ gameState: 'playing', score: 0, wave: 1, stats: null })
  },
  pauseGame: () => {
    get().syncToServer()  // 暂停时同步
    set({ gameState: 'paused' })
  },
  resumeGame: () => set({ gameState: 'playing' }),
  endGame: () => {
    get().syncToServer()  // 游戏结束时同步
    set({ gameState: 'gameover' })
  },
  resetGame: () => set({ gameState: 'menu', score: 0, wave: 1, stats: null }),
  logout: () => {
    localStorage.removeItem('player')
    set({ player: null, gameState: 'menu', score: 0, wave: 1, stats: null })
  },
}))
