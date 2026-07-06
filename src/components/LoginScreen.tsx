import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { registerPlayer } from '@/lib/api'
import Avatar from './Avatar'

const AVATAR_COUNT = 6

export default function LoginScreen() {
  const setPlayer = useGameStore((s) => s.setPlayer)
  const setShowLogin = useGameStore((s) => s.setShowLogin)

  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trimmed = nickname.trim()
  const valid = trimmed.length >= 2 && trimmed.length <= 12

  const handleSubmit = async () => {
    if (!valid || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await registerPlayer(trimmed, avatar)
      setPlayer(data)
      setShowLogin(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md">
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

      {/* Close button */}
      <button
        onClick={() => setShowLogin(false)}
        className="absolute right-6 top-6 z-10 rounded-full border border-white/20 p-2 text-white/60 transition-all hover:border-[#FF4D4D]/60 hover:text-[#FF4D4D]"
        aria-label="关闭"
      >
        <X size={20} />
      </button>

      <div
        className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-[#00FFD1]/30 bg-white/5 p-8 backdrop-blur-xl"
        style={{ boxShadow: '0 0 30px rgba(0, 255, 209, 0.15)' }}
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h1
            className="font-orbitron text-3xl font-black text-[#00FFD1]"
            style={{ textShadow: '0 0 10px #00FFD1, 0 0 20px #00FFD1, 0 0 40px #00FFD1' }}
          >
            飞行员注册
          </h1>
          <p className="font-orbitron text-xs tracking-[0.4em] text-[#00FFD1]/60">
            PILOT REGISTRATION
          </p>
        </div>

        {/* Nickname input */}
        <div className="flex w-full flex-col gap-1">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 12))}
            placeholder="输入昵称 (2-12字符)"
            maxLength={12}
            className="w-full rounded-lg border-2 border-[#00FFD1]/40 bg-[#00FFD1]/5 px-4 py-3 font-rajdhani text-lg text-white placeholder-white/30 outline-none transition-all focus:border-[#00FFD1] focus:bg-[#00FFD1]/10"
            style={{ boxShadow: nickname ? '0 0 12px rgba(0, 255, 209, 0.3)' : 'none' }}
          />
          <div className="flex justify-between px-1 font-rajdhani text-xs">
            <span className={valid ? 'text-[#00FFD1]/60' : 'text-[#FF4D4D]/70'}>
              {trimmed.length < 2 ? '至少2个字符' : '✓ 可用'}
            </span>
            <span className="text-white/40">{trimmed.length}/12</span>
          </div>
        </div>

        {/* Avatar grid 3x2 */}
        <div className="flex w-full flex-col gap-2">
          <p className="font-rajdhani text-sm text-white/60">选择头像</p>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: AVATAR_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => setAvatar(i)}
                className={`flex items-center justify-center rounded-lg border-2 p-2 transition-all ${
                  avatar === i
                    ? 'border-[#00FFD1] bg-[#00FFD1]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
                style={avatar === i ? { boxShadow: '0 0 12px rgba(0, 255, 209, 0.4)' } : undefined}
              >
                <Avatar index={i} nickname={trimmed || '?'} size={48} />
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="font-rajdhani text-sm text-[#FF4D4D]" style={{ textShadow: '0 0 8px #FF4D4D' }}>
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!valid || loading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 px-8 py-3 font-rajdhani text-xl font-bold tracking-wider transition-all ${
            valid && !loading
              ? 'neon-button border-[#00FFD1] bg-[#00FFD1]/10 text-[#00FFD1]'
              : 'cursor-not-allowed border-white/20 bg-white/5 text-white/30'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              注册中...
            </>
          ) : (
            '进入游戏'
          )}
        </button>
      </div>
    </div>
  )
}
