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
    engineRef.current = engine
    setEngineReady(true)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      engine.stop()
    }
  }, [setScore, setWave, setStats, endGame])

  // 应用控制模式
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setControlMode(controlMode)
    }
  }, [controlMode, engineReady])

  // 游戏状态变化处理
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    if (gameState === 'playing') {
      // 如果是从暂停恢复，调用resume；否则是新游戏，调用start
      // 通过检查animationId判断是否在运行
      if (engine.animationId === 0) {
        engine.resume()
      }
    } else {
      engine.stop()
    }
  }, [gameState])

  // 监听新游戏：当 gameState 变为 playing 且之前不是 paused 时，需要 start
  const prevGameStateRef = useRef(gameState)
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const prev = prevGameStateRef.current
    prevGameStateRef.current = gameState

    if (gameState === 'playing' && prev !== 'paused') {
      // 新游戏或从menu/gameover开始
      engine.init()
      engine.start()
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

  // 暂停/恢复引擎
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (gameState === 'paused') {
      engine.pause()
    } else if (gameState === 'playing') {
      // resume 由上面的逻辑处理
    }
  }, [gameState])

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
