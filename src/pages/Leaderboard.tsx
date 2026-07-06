import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getLeaderboard, getPlayerRank, type LeaderboardEntry } from '@/lib/api'
import Avatar from '@/components/Avatar'

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const PODIUM_LABELS = ['冠军', '亚军', '季军']

function Starfield() {
  return (
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
  )
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/profile/${entry.playerId}`)}
      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left backdrop-blur-md transition-all hover:bg-white/10 ${
        isMe ? 'border-[#00FFD1] bg-[#00FFD1]/10' : 'border-white/10 bg-white/5 hover:border-white/30'
      }`}
      style={isMe ? { boxShadow: '0 0 15px rgba(0, 255, 209, 0.3)' } : undefined}
    >
      <span className="w-10 text-center font-orbitron text-lg font-bold text-white/70">
        {entry.rank}
      </span>
      <Avatar index={entry.avatar} nickname={entry.nickname} size={40} />
      <span className="flex-1 truncate font-rajdhani text-lg font-bold text-white">
        {entry.nickname}
      </span>
      <div className="flex flex-col items-end">
        <span className="font-orbitron text-lg font-bold text-[#00FFD1]">
          {entry.score.toLocaleString()}
        </span>
        <span className="font-rajdhani text-xs text-white/50">WAVE {entry.wave}</span>
      </div>
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="flex w-full animate-pulse items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="h-6 w-6 rounded bg-white/20" />
      <div className="h-10 w-10 rounded-full bg-white/20" />
      <div className="h-5 flex-1 rounded bg-white/20" />
      <div className="h-5 w-16 rounded bg-white/20" />
    </div>
  )
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const player = useGameStore((s) => s.player)

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLeaderboard(100)
      .then((data) => {
        if (cancelled) return
        setEntries(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('加载排行榜失败')
        setLoading(false)
      })
    if (player) {
      getPlayerRank(player.id)
        .then((r) => {
          if (!cancelled) setMyRank(r.rank)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [player])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const inTop100 = player ? entries.some((e) => e.playerId === player.id) : false

  return (
    <div className="relative min-h-screen w-screen overflow-y-auto bg-[#0a0a1a]">
      <Starfield />

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0a0a1a]/80 px-6 py-4 backdrop-blur-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-rajdhani text-sm font-bold text-white/80 transition-all hover:border-[#00FFD1] hover:text-[#00FFD1]"
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <h1
          className="flex items-center gap-2 font-orbitron text-2xl font-black text-[#FFD700]"
          style={{ textShadow: '0 0 10px #FFD700, 0 0 20px #FFD700' }}
        >
          <Trophy size={24} />
          全球排行榜
        </h1>
        <div className="w-20" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 pb-24">
        {error && (
          <p className="text-center font-rajdhani text-lg text-[#FF4D4D]">{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Trophy size={48} className="text-white/30" />
            <p className="font-rajdhani text-xl text-white/50">暂无排行榜数据</p>
            <p className="font-rajdhani text-sm text-white/30">成为第一个上榜的飞行员!</p>
          </div>
        )}

        {/* Podium top 3 */}
        {!loading && top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {top3.map((entry, i) => {
              const isMe = player?.id === entry.playerId
              const color = PODIUM_COLORS[i]
              return (
                <button
                  key={entry.playerId}
                  onClick={() => navigate(`/profile/${entry.playerId}`)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 backdrop-blur-md transition-all hover:scale-105 ${
                    isMe ? 'border-[#00FFD1]' : 'border-white/15'
                  }`}
                  style={{
                    backgroundColor: `${color}15`,
                    boxShadow: `0 0 20px ${color}40`,
                  }}
                >
                  {i === 0 ? (
                    <Crown size={28} style={{ color }} />
                  ) : (
                    <Medal size={24} style={{ color }} />
                  )}
                  <span className="font-orbitron text-sm font-bold" style={{ color }}>
                    {PODIUM_LABELS[i]}
                  </span>
                  <Avatar index={entry.avatar} nickname={entry.nickname} size={56} />
                  <span className="max-w-full truncate font-rajdhani text-sm font-bold text-white">
                    {entry.nickname}
                  </span>
                  <span className="font-orbitron text-base font-bold" style={{ color }}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="font-rajdhani text-xs text-white/50">WAVE {entry.wave}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Rest of the list */}
        {!loading && rest.length > 0 && (
          <div className="flex flex-col gap-2">
            {rest.map((entry) => (
              <Row
                key={entry.playerId}
                entry={entry}
                isMe={player?.id === entry.playerId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar: my rank */}
      {player && !inTop100 && myRank !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#00FFD1]/30 bg-[#0a0a1a]/90 px-6 py-4 backdrop-blur-md">
          <p className="text-center font-rajdhani text-lg text-white/70">
            我的排名:{' '}
            <span className="font-orbitron text-xl font-bold text-[#00FFD1]" style={{ textShadow: '0 0 8px #00FFD1' }}>
              #{myRank}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
