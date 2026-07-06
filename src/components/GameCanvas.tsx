import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { GameEngine } from '@/game/engine'
import TouchControls from './TouchControls'
import PauseButton from './PauseButton'
import PauseMenu from './PauseMenu'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const gameState = useGameStore((s) => s.gameState)
  const setScore = useGameStore((s) => s.setScore)
  const setWave = useGameStore((s) => s.setWave)
  const setStats = useGameStore((s) => s.setStats)
  const endGame = useGameStore((s) => s.endGame)
  const pauseGame = useGameStore((s) => s.pauseGame)
  const resumeGame = useGameStore((s) => s.resumeGame)
  const controlMode = useGameStore((s) => s.controlMode)
  const addCoins = useGameStore((s) => s.addCoins)
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const engine = new GameEngine(canvas, (state, score, wave) => {
      setScore(score)
      setWave(wave)
      if (state === 'gameover') {
        setStats(engine.getStats())
        endGame()
      }
    })
    engine.setOnCoinCollect((count) => addCoins(count))
    engine.setUpgradeLevels(useGameStore.getState().upgradeLevels)
    engineRef.current = engine
    setEngineReady(true)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      engine.stop()
    }
  }, [setScore, setWave, setStats, endGame, addCoins])

  // 应用控制模式
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setControlMode(controlMode)
    }
  }, [controlMode, engineReady])

  // 同步升级等级到引擎
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setUpgradeLevels(upgradeLevels)
    }
  }, [upgradeLevels, engineReady])

  // 游戏状态变化处理 - 统一管理，避免双循环
  const prevGameStateRef = useRef(gameState)
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const prev = prevGameStateRef.current
    prevGameStateRef.current = gameState

    if (gameState === 'playing') {
      if (prev === 'paused') {
        // 从暂停恢复
        engine.resume()
      } else {
        // 新游戏（从menu/gameover开始）
        engine.init()
        engine.start()
      }
    } else if (gameState === 'paused') {
      engine.pause()
    } else {
      // menu/gameover - 停止循环
      engine.stop()
    }
  }, [gameState])

  // ESC 键切换暂停
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        const current = useGameStore.getState().gameState
        if (current === 'playing') {
          pauseGame()
        } else if (current === 'paused') {
          resumeGame()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pauseGame, resumeGame])

  const handleResume = useCallback(() => {
    resumeGame()
  }, [resumeGame])

  const handleRestart = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.restart()
    // 重置store状态
    useGameStore.setState({ score: 0, wave: 1, stats: null, gameState: 'playing' })
  }, [])

  // 判断是否显示触摸控制
  const showTouchControls = gameState === 'playing' && (
    controlMode === 'touch' ||
    (controlMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))
  )

  const isPlaying = gameState === 'playing'
  const isPaused = gameState === 'paused'

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ background: '#0a0a1a' }}
      />

      {/* 暂停按钮 - 仅在游戏中显示 */}
      {isPlaying && engineReady && (
        <PauseButton onClick={pauseGame} />
      )}

      {/* 触摸控制 - 仅在游戏中显示 */}
      {showTouchControls && engineReady && (
        <TouchControls engine={engineRef.current} />
      )}

      {/* 暂停菜单 - 仅在暂停时显示 */}
      {isPaused && engineReady && (
        <PauseMenu onResume={handleResume} onRestart={handleRestart} />
      )}
    </>
  )
}
