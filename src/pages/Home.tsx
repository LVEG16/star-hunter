import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import GameCanvas from '@/components/GameCanvas'
import MainMenu from '@/components/MainMenu'
import GameOver from '@/components/GameOver'
import LoginScreen from '@/components/LoginScreen'

export default function Home() {
  const gameState = useGameStore((s) => s.gameState)
  const showLogin = useGameStore((s) => s.showLogin)
  const loadPlayer = useGameStore((s) => s.loadPlayer)
  const player = useGameStore((s) => s.player)
  const loadFromServer = useGameStore((s) => s.loadFromServer)

  useEffect(() => {
    loadPlayer()
  }, [loadPlayer])

  // 玩家加载后从服务器同步金币和升级
  useEffect(() => {
    if (player) {
      loadFromServer(player.id)
    }
  }, [player, loadFromServer])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a1a]">
      <GameCanvas />
      {gameState === 'menu' && <MainMenu />}
      {gameState === 'gameover' && <GameOver />}
      {showLogin && <LoginScreen />}
    </div>
  )
}
