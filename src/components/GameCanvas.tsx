import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { GameEngine } from '@/game/engine'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const gameState = useGameStore((s) => s.gameState)
  const setScore = useGameStore((s) => s.setScore)
  const setWave = useGameStore((s) => s.setWave)
  const setStats = useGameStore((s) => s.setStats)
  const endGame = useGameStore((s) => s.endGame)

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

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      engine.stop()
    }
  }, [setScore, setWave, setStats, endGame])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    if (gameState === 'playing') {
      engine.init()
      engine.start()
    } else {
      engine.stop()
    }
  }, [gameState])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full"
      style={{ background: '#0a0a1a' }}
    />
  )
}
