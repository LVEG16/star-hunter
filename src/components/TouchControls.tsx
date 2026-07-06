import { useCallback } from 'react'
import { GameEngine } from '@/game/engine'
import DragControl from './DragControl'

interface TouchControlsProps {
  engine: GameEngine | null
}

/**
 * 手机端触摸控制层
 * 拖动飞船模式：全屏拖动控制飞船 + 右下炸弹按钮
 */
export default function TouchControls({ engine }: TouchControlsProps) {
  const handleMove = useCallback(
    (x: number, y: number) => {
      // 将屏幕坐标转换为canvas坐标
      const canvas = engine?.canvas
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = x - rect.left
      const cy = y - rect.top
      engine?.setTouchTarget(cx, cy)
    },
    [engine]
  )

  const handleEnd = useCallback(() => {
    engine?.clearTouchTarget()
  }, [engine])

  const handleBomb = useCallback(() => {
    engine?.triggerBomb()
  }, [engine])

  return (
    <>
      {/* 全屏拖动控制层 */}
      <DragControl onMove={handleMove} onEnd={handleEnd} />

      {/* 炸弹按钮 */}
      <button
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleBomb()
        }}
        className="pointer-events-auto absolute bottom-12 right-8 z-30 flex h-20 w-20 touch-none select-none items-center justify-center rounded-full font-rajdhani text-sm font-bold text-[#FFD700] transition-all active:scale-90"
        style={{
          background: 'rgba(255, 215, 0, 0.1)',
          border: '2px solid rgba(255, 215, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
        }}
      >
        炸弹
      </button>
    </>
  )
}
