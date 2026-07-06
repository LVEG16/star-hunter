import { create } from 'zustand'
import type { PlayerInfo, GameStats } from '@/game/types'
import type { ControlMode } from '@/game/engine'

type GameState = 'menu' | 'playing' | 'paused' | 'gameover'

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

  // Control mode
  controlMode: ControlMode
  setControlMode: (mode: ControlMode) => void

  // Actions
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: () => void
  resetGame: () => void
  logout: () => void
}

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

  controlMode: ((): ControlMode => {
    const saved = localStorage.getItem('controlMode') as ControlMode | null
    return saved || 'auto'
  })(),
  setControlMode: (controlMode) => {
    localStorage.setItem('controlMode', controlMode)
    set({ controlMode })
  },

  startGame: () => {
    if (!get().player) {
      set({ showLogin: true })
      return
    }
    set({ gameState: 'playing', score: 0, wave: 1, stats: null })
  },
  pauseGame: () => set({ gameState: 'paused' }),
  resumeGame: () => set({ gameState: 'playing' }),
  endGame: () => set({ gameState: 'gameover' }),
  resetGame: () => set({ gameState: 'menu', score: 0, wave: 1, stats: null }),
  logout: () => {
    localStorage.removeItem('player')
    set({ player: null, gameState: 'menu', score: 0, wave: 1, stats: null })
  },
}))
