import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { submitScore } from '@/lib/api'

type UploadState = 'idle' | 'uploading' | 'success' | 'failed'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="font-rajdhani text-xs text-white/50">{label}</span>
      <span className="font-orbitron text-lg font-bold" style={{ color, textShadow: `0 0 8px ${color}` }}>
        {value}
      </span>
    </div>
  )
}

export default function GameOver() {
  const navigate = useNavigate()
  const score = useGameStore((s) => s.score)
  const wave = useGameStore((s) => s.wave)
  const stats = useGameStore((s) => s.stats)
  const player = useGameStore((s) => s.player)
  const startGame = useGameStore((s) => s.startGame)
  const resetGame = useGameStore((s) => s.resetGame)

  const [displayScore, setDisplayScore] = useState(0)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [rank, setRank] = useState<number | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)

  // Animated counter effect
  useEffect(() => {
    if (score === 0) return
    const duration = 1500
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.floor(eased * score))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [score])

  // Submit score on mount
  useEffect(() => {
    if (!player || !stats) return
    let cancelled = false
    setUploadState('uploading')
    submitScore({
      playerId: player.id,
      score,
      wave,
      kills: stats.kills,
      bossKills: stats.bossKills,
      powerupsUsed: stats.powerupsUsed,
      playTime: stats.playTime,
    })
      .then((res) => {
        if (cancelled) return
        setRank(res.rank)
        setIsNewRecord(res.isNewRecord)
        setUploadState('success')
      })
      .catch(() => {
        if (!cancelled) setUploadState('failed')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRestart = () => {
    startGame()
  }

  const handleMenu = () => {
    resetGame()
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        style={{ boxShadow: '0 0 30px rgba(255, 77, 77, 0.15)' }}
      >
        {/* Title */}
        <h1
          className="font-orbitron text-4xl font-black text-[#FF4D4D]"
          style={{ textShadow: '0 0 10px #FF4D4D, 0 0 20px #FF4D4D, 0 0 40px #FF4D4D' }}
        >
          任务失败
        </h1>

        {/* Score */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-rajdhani text-lg text-white/60">得分</p>
          <p
            className="font-orbitron text-5xl font-black text-white"
            style={{ animation: 'scoreCount 0.5s ease-out' }}
          >
            {displayScore.toLocaleString()}
          </p>
        </div>

        {/* Wave reached */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-rajdhani text-sm text-white/60">到达波次</p>
          <p className="font-orbitron text-xl font-bold text-[#00FFD1]">
            WAVE {wave}
          </p>
        </div>

        {/* Detailed stats */}
        {stats && (
          <div className="grid w-full grid-cols-2 gap-2">
            <StatItem label="击杀数" value={String(stats.kills)} color="#00FFD1" />
            <StatItem label="Boss击杀" value={String(stats.bossKills)} color="#9D00FF" />
            <StatItem label="道具使用" value={String(stats.powerupsUsed)} color="#FFD700" />
            <StatItem label="存活时间" value={formatTime(stats.playTime)} color="#00FF88" />
          </div>
        )}

        {/* Upload status */}
        {player && stats && (
          <div className="font-rajdhani text-sm">
            {uploadState === 'uploading' && <span className="text-white/60">上传中...</span>}
            {uploadState === 'success' && (
              <span className="text-[#00FFD1]" style={{ textShadow: '0 0 8px #00FFD1' }}>
                已上传! 排名: #{rank}
              </span>
            )}
            {uploadState === 'failed' && <span className="text-[#FF4D4D]">上传失败</span>}
          </div>
        )}

        {/* New high score */}
        {isNewRecord && uploadState === 'success' && (
          <p className="new-high-score font-orbitron text-xl font-bold text-[#FFD700]">
            ★ NEW HIGH SCORE! ★
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={handleRestart}
            className="neon-button rounded-lg border-2 border-[#00FFD1] bg-[#00FFD1]/10 px-6 py-3 font-rajdhani text-lg font-bold tracking-wider text-[#00FFD1] transition-all"
          >
            再来一局
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="rounded-lg border-2 border-[#FFD700]/50 bg-[#FFD700]/10 px-6 py-3 font-rajdhani text-lg font-bold tracking-wider text-[#FFD700] transition-all hover:border-[#FFD700] hover:bg-[#FFD700]/20"
          >
            查看排名
          </button>
          <button
            onClick={handleMenu}
            className="rounded-lg border-2 border-white/30 bg-white/5 px-6 py-3 font-rajdhani text-lg font-bold tracking-wider text-white/70 transition-all hover:border-white/50 hover:bg-white/10 hover:text-white"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  )
}
