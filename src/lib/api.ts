const API_BASE = '/api'

export interface PlayerData {
  id: number
  nickname: string
  avatar: number
  createdAt: string
}

export interface ScoreSubmission {
  playerId: number
  score: number
  wave: number
  kills: number
  bossKills: number
  powerupsUsed: number
  playTime: number
}

export interface ScoreResponse {
  success: boolean
  rank: number
  isNewRecord: boolean
}

export interface LeaderboardEntry {
  rank: number
  playerId: number
  nickname: string
  avatar: number
  score: number
  wave: number
  createdAt: string
}

export interface RankData {
  rank: number
  totalPlayers: number
}

export interface PlayerProfile {
  player: PlayerData
  stats: {
    totalGames: number
    highestScore: number
    highestWave: number
    totalKills: number
    totalBossKills: number
    totalPowerupsUsed: number
    totalPlayTime: number
  }
  achievements: Array<{
    id: string
    name: string
    description: string
    unlocked: boolean
  }>
}

export async function registerPlayer(nickname: string, avatar: number): Promise<PlayerData> {
  const res = await fetch(`${API_BASE}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, avatar }),
  })
  if (!res.ok) throw new Error('Failed to register player')
  return res.json()
}

export async function submitScore(data: ScoreSubmission): Promise<ScoreResponse> {
  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit score')
  return res.json()
}

export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function getPlayerRank(playerId: number): Promise<RankData> {
  const res = await fetch(`${API_BASE}/leaderboard/rank/${playerId}`)
  if (!res.ok) throw new Error('Failed to fetch rank')
  return res.json()
}

export async function getProfile(playerId: number): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/profile/${playerId}`)
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

// 玩家进度（金币+升级等级）
export interface PlayerProgress {
  coins: number
  upgradeLevels: Record<string, number> | null
}

/** 从服务器获取玩家金币和升级等级 */
export async function getPlayerProgress(playerId: number): Promise<PlayerProgress> {
  const res = await fetch(`${API_BASE}/players/${playerId}/progress`)
  if (!res.ok) throw new Error('Failed to fetch progress')
  return res.json()
}

/** 同步金币和升级等级到服务器 */
export async function syncPlayerProgress(
  playerId: number,
  coins: number,
  upgradeLevels: { attack: number; fireRate: number; maxHp: number; speed: number; bulletSpeed: number }
): Promise<void> {
  const res = await fetch(`${API_BASE}/players/${playerId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coins, upgradeLevels }),
  })
  if (!res.ok) throw new Error('Failed to sync progress')
}
