import { Pause } from 'lucide-react'

interface PauseButtonProps {
  onClick: () => void
}

/**
 * 暂停按钮 - 游戏中右上角显示，点击触发暂停菜单
 */
export default function PauseButton({ onClick }: PauseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:border-[#00FFD1]/50 hover:bg-[#00FFD1]/10 hover:text-[#00FFD1]"
      aria-label="暂停游戏"
    >
      <Pause size={20} />
    </button>
  )
}
