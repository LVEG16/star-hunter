import { Play, RotateCcw, Home, X } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

interface PauseMenuProps {
  onResume: () => void
  onRestart: () => void
}

/**
 * 暂停菜单 - 包含继续、重新开始、退出三个选项
 * 通过单一暂停按钮触发
 */
export default function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  const resetGame = useGameStore((s) => s.resetGame)

  const handleExit = () => {
    resetGame()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div
        className="relative w-80 rounded-2xl border border-[#00FFD1]/30 bg-[#0a0a1a]/90 p-8"
        style={{ boxShadow: '0 0 40px rgba(0, 255, 209, 0.2)' }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onResume}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <div className="mb-8 text-center">
          <h2 className="font-orbitron text-3xl font-black text-[#00FFD1]">
            已暂停
          </h2>
          <p className="mt-1 font-rajdhani text-sm tracking-widest text-[#00FFD1]/50">
            PAUSED
          </p>
        </div>

        {/* 选项按钮 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-3 rounded-xl border-2 border-[#00FFD1] bg-[#00FFD1]/10 px-6 py-3.5 font-rajdhani text-lg font-bold text-[#00FFD1] transition-all hover:bg-[#00FFD1]/20"
          >
            <Play size={20} />
            继续游戏
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-rajdhani text-lg font-bold text-white/85 transition-all hover:border-[#FFD700]/50 hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
          >
            <RotateCcw size={20} />
            重新开始
          </button>

          <button
            onClick={handleExit}
            className="flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-rajdhani text-lg font-bold text-white/85 transition-all hover:border-[#FF4D4D]/50 hover:bg-[#FF4D4D]/10 hover:text-[#FF4D4D]"
          >
            <Home size={20} />
            退出游戏
          </button>
        </div>

        {/* 提示 */}
        <p className="mt-6 text-center font-rajdhani text-xs text-white/30">
          按 ESC 键继续游戏
        </p>
      </div>
    </div>
  )
}
