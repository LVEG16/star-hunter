import { useEffect, useRef } from 'react'

interface DragControlProps {
  onMove: (x: number, y: number) => void
  onEnd: () => void
}

/**
 * 拖动飞船控制层 - 全屏触摸区域，手指拖动控制飞船位置
 * 飞船会平滑跟随手指移动
 */
export default function DragControl({ onMove, onEnd }: DragControlProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const touchIdRef = useRef<number | null>(null)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return

    const handleStart = (e: TouchEvent) => {
      if (touchIdRef.current !== null) return
      const touch = e.changedTouches[0]
      touchIdRef.current = touch.identifier
      onMove(touch.clientX, touch.clientY)
      e.preventDefault()
    }

    const handleMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === touchIdRef.current) {
          onMove(touch.clientX, touch.clientY)
          e.preventDefault()
          break
        }
      }
    }

    const handleEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null
          onEnd()
          break
        }
      }
    }

    area.addEventListener('touchstart', handleStart, { passive: false })
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)

    return () => {
      area.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [onMove, onEnd])

  // 全屏透明触摸层，z-index低于炸弹按钮和暂停按钮
  return (
    <div
      ref={areaRef}
      className="pointer-events-auto absolute inset-0 z-20 touch-none select-none"
    />
  )
}
