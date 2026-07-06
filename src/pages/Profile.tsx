import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, LogOut } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getProfile, getPlayerRank, type PlayerProfile } from '@/lib/api'
import Avatar from '@/components/Avatar'

function formatPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
      <span className="font-rajdhani text-xs text-white/50">{label}</span>
      <span className="font-orbitron text-lg font-bold" style={{ color, textShadow: `0 0 8px ${color}80` }}>
        {value}
      </span>
    </div>
  )
}

export default function Profile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const player = useGameStore((s) => s.player)
  const logout = useGameStore((s) => s.logout)

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const playerId = Number(id)

  useEffect(() => {
    if (!id || isNaN(playerId)) {
      setError('无效的玩家ID')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getProfile(playerId)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('未找到该玩家')
        setLoading(false)
      })
    getPlayerRank(playerId)
      .then((r) => {
        if (!cancelled) setRank(r.rank)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, playerId])

  const isOwnProfile = player?.id === playerId

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const s = profile?.stats
  const unlockedCount = profile?.achievements.filter((a) => a.unlocked).length ?? 0

  return (
    <div className="relative min-h-screen w-screen overflow-y-auto bg-[#0a0a1a]">
      {/* Starfield */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/40 float-anim"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0a0a1a]/80 px-6 py-4 backdrop-blur-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-rajdhani text-sm font-bold text-white/80 transition-all hover:border-[#00FFD1] hover:text-[#00FFD1]"
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <h1 className="font-orbitron text-xl font-black text-[#00FFD1]" style={{ textShadow: '0 0 10px #00FFD1' }}>
          飞行员档案
        </h1>
        <div className="w-20" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        {/* Error */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="font-rajdhani text-xl text-[#FF4D4D]">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-lg border-2 border-[#00FFD1]/40 bg-[#00FFD1]/5 px-6 py-2 font-rajdhani text-base font-bold text-[#00FFD1] transition-all hover:border-[#00FFD1]"
            >
              返回主页
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
          </div>
        )}

        {/* Profile content */}
        {profile && !loading && (
          <>
            {/* Player header */}
            <div
              className="flex flex-col items-center gap-3 rounded-2xl border border-[#00FFD1]/20 bg-white/5 p-6 backdrop-blur-md"
              style={{ boxShadow: '0 0 20px rgba(0, 255, 209, 0.1)' }}
            >
              <Avatar index={profile.player.avatar} nickname={profile.player.nickname} size={80} />
              <h2 className="font-orbitron text-2xl font-black text-white">
                {profile.player.nickname}
              </h2>
              <p className="font-rajdhani text-sm text-white/50">
                注册时间: {formatDate(profile.player.createdAt)}
              </p>
              {rank !== null && (
                <div
                  className="rounded-full border-2 border-[#FFD700]/50 bg-[#FFD700]/10 px-4 py-1 font-rajdhani text-sm font-bold text-[#FFD700]"
                  style={{ textShadow: '0 0 8px #FFD700' }}
                >
                  全球排名 #{rank}
                </div>
              )}
            </div>

            {/* Stats grid 2x4 */}
            {s && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="总场次" value={String(s.totalGames)} color="#00FFD1" />
                <StatCard label="最高分" value={s.highestScore.toLocaleString()} color="#FFD700" />
                <StatCard label="最高波次" value={String(s.highestWave)} color="#00FF88" />
                <StatCard label="成就数" value={`${unlockedCount}/${profile.achievements.length}`} color="#9D00FF" />
                <StatCard label="总击杀" value={String(s.totalKills)} color="#00FFD1" />
                <StatCard label="Boss击杀" value={String(s.totalBossKills)} color="#FF00AA" />
                <StatCard label="道具使用" value={String(s.totalPowerupsUsed)} color="#FFD700" />
                <StatCard label="游戏时长" value={formatPlayTime(s.totalPlayTime)} color="#00FF88" />
              </div>
            )}

            {/* Achievement wall */}
            <div className="flex flex-col gap-3">
              <h3 className="font-orbitron text-sm tracking-widest text-[#00FFD1]/80">
                成就墙
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`flex flex-col gap-1 rounded-xl border p-3 backdrop-blur-md transition-all ${
                      a.unlocked
                        ? 'border-[#00FFD1]/50 bg-[#00FFD1]/10'
                        : 'border-white/10 bg-white/5 opacity-50'
                    }`}
                    style={a.unlocked ? { boxShadow: '0 0 12px rgba(0, 255, 209, 0.25)' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {a.unlocked ? (
                        <span className="text-[#00FFD1]">★</span>
                      ) : (
                        <Lock size={14} className="text-white/40" />
                      )}
                      <span className={`font-rajdhani text-sm font-bold ${a.unlocked ? 'text-white' : 'text-white/60'}`}>
                        {a.name}
                      </span>
                    </div>
                    <p className="font-rajdhani text-xs text-white/50">{a.description}</p>
                  </div>
                ))}
              </div>
              {profile.achievements.length === 0 && (
                <p className="text-center font-rajdhani text-sm text-white/30">暂无成就</p>
              )}
            </div>

            {/* Logout */}
            {isOwnProfile && (
              <button
                onClick={handleLogout}
                className="mx-auto flex items-center gap-2 rounded-lg border-2 border-[#FF4D4D]/40 bg-[#FF4D4D]/5 px-6 py-3 font-rajdhani text-base font-bold text-[#FF4D4D] transition-all hover:border-[#FF4D4D] hover:bg-[#FF4D4D]/10"
              >
                <LogOut size={18} />
                退出登录
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
