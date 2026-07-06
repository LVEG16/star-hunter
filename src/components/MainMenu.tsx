import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, User, LogIn } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getProfile } from '@/lib/api'
import Avatar from './Avatar'
import ControlSwitcher from './ControlSwitcher'

export default function MainMenu() {
  const navigate = useNavigate()
  const player = useGameStore((s) => s.player)
  const startGame = useGameStore((s) => s.startGame)
  const setShowLogin = useGameStore((s) => s.setShowLogin)
  const controlMode = useGameStore((s) => s.controlMode)
  const setControlMode = useGameStore((s) => s.setControlMode)

  const [highScore, setHighScore] = useState<number | null>(null)

  useEffect(() => {
    if (!player) {
      setHighScore(null)
      return
    }
    let cancelled = false
    getProfile(player.id)
      .then((p) => {
        if (!cancelled) setHighScore(p.stats.highestScore)
      })
      .catch(() => {
        if (!cancelled) {
          const saved = localStorage.getItem('highScore')
          setHighScore(saved ? parseInt(saved, 10) : 0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [player])

  const handleProfileNav = () => {
    if (player) navigate(`/profile/${player.id}`)
    else setShowLogin(true)
  }

  // 根据当前控制模式显示不同的操作说明
  const isTouchMode =
    controlMode === 'touch' ||
    (controlMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#00FFD1]/30 float-anim"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Top-left: player info / login */}
      <div className="absolute left-6 top-6 z-20">
        {player ? (
          <button
            onClick={() => navigate(`/profile/${player.id}`)}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md transition-all hover:border-[#00FFD1]/50 hover:bg-[#00FFD1]/5"
          >
            <Avatar index={player.avatar} nickname={player.nickname} size={40} />
            <div className="flex flex-col items-start">
              <span className="font-rajdhani text-base font-bold text-white">{player.nickname}</span>
              <span className="font-rajdhani text-xs text-[#00FFD1]/70">查看资料</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 rounded-xl border-2 border-[#00FFD1]/40 bg-[#00FFD1]/5 px-5 py-2.5 font-rajdhani text-base font-bold text-[#00FFD1] transition-all hover:border-[#00FFD1] hover:bg-[#00FFD1]/10"
          >
            <LogIn size={18} />
            登录
          </button>
        )}
      </div>

      {/* Top-right: navigation buttons */}
      <div className="absolute right-6 top-6 z-20 flex gap-3">
        <button
          onClick={() => navigate('/leaderboard')}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-rajdhani text-sm font-bold text-white/80 backdrop-blur-md transition-all hover:border-[#FFD700]/50 hover:text-[#FFD700]"
        >
          <Trophy size={18} />
          排行榜
        </button>
        <button
          onClick={handleProfileNav}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-rajdhani text-sm font-bold text-white/80 backdrop-blur-md transition-all hover:border-[#00FFD1]/50 hover:text-[#00FFD1]"
        >
          <User size={18} />
          个人资料
        </button>
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="neon-title font-orbitron text-6xl font-black text-[#00FFD1] sm:text-7xl">
            星际猎手
          </h1>
          <p className="font-orbitron text-lg tracking-[0.5em] text-[#00FFD1]/70">
            STAR HUNTER
          </p>
        </div>

        {/* Start button */}
        <button
          onClick={startGame}
          className="neon-button rounded-lg border-2 border-[#00FFD1] bg-[#00FFD1]/10 px-12 py-4 font-rajdhani text-2xl font-bold tracking-wider text-[#00FFD1] transition-all"
        >
          开始游戏
        </button>

        {/* Control mode switcher */}
        <ControlSwitcher mode={controlMode} onChange={setControlMode} />

        {/* Instructions - 根据控制模式显示不同内容 */}
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          style={{ boxShadow: '0 0 20px rgba(0, 255, 209, 0.1)' }}
        >
          <h3 className="mb-4 text-center font-orbitron text-sm tracking-widest text-[#00FFD1]/80">
            操作说明
          </h3>
          {isTouchMode ? (
            <div className="flex flex-col gap-2 font-rajdhani text-lg text-white/80">
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  拖动屏幕
                </span>
                <span>- 移动飞船</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  自动射击
                </span>
                <span>- 持续开火</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  右下按钮
                </span>
                <span>- 释放炸弹</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 font-rajdhani text-lg text-white/80">
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  WASD / 方向键
                </span>
                <span>- 移动</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  自动射击
                </span>
                <span>- 持续开火</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-28 text-right font-semibold text-[#00FFD1]">
                  空格键
                </span>
                <span>- 炸弹</span>
              </div>
            </div>
          )}
        </div>

        {/* High score */}
        {player && highScore !== null && highScore > 0 && (
          <p className="font-rajdhani text-lg text-[#00FFD1]/60">
            最高分: <span className="font-bold text-[#00FFD1]">{highScore.toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  )
}
