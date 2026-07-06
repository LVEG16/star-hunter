import { useEffect, useRef, useState } from 'react'

interface JoystickProps {
  onMove: (x: number, y: number) => void
}

/**
 * 虚拟摇杆组件 - 用于手机端控制飞船移动
 * 左下角固定区域，触摸后摇杆出现
 */
export default function Joystick({ onMove }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const touchIdRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const RADIUS = 60 // 摇杆底座半径
  const KNOB_RADIUS = 30 // 摇杆手柄半径

  useEffect(() => {
    const base = baseRef.current
    if (!base) return

    const handleStart = (e: TouchEvent) => {
      if (touchIdRef.current !== null) return
      const touch = e.changedTouches[0]
      touchIdRef.current = touch.identifier

      const rect = base.getBoundingClientRect()
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
      setActive(true)
      updateKnob(touch.clientX, touch.clientY)
      e.preventDefault()
    }

    const handleMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === touchIdRef.current) {
          updateKnob(touch.clientX, touch.clientY)
          e.preventDefault()
          break
        }
      }
    }

    const handleEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null
          setActive(false)
          setKnobPos({ x: 0, y: 0 })
          onMove(0, 0)
          break
        }
      }
    }

    const updateKnob = (clientX: number, clientY: number) => {
      let dx = clientX - centerRef.current.x
      let dy = clientY - centerRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      // 限制在半径内
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS
        dy = (dy / dist) * RADIUS
      }
      setKnobPos({ x: dx, y: dy })
      // 归一化为 -1..1
      onMove(dx / RADIUS, dy / RADIUS)
    }

    base.addEventListener('touchstart', handleStart, { passive: false })
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)

    return () => {
      base.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [onMove])

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto absolute bottom-8 left-8 z-30 touch-none select-none"
      style={{
        width: RADIUS * 2,
        height: RADIUS * 2,
        borderRadius: '50%',
        background: 'rgba(0, 255, 209, 0.05)',
        border: '2px solid rgba(0, 255, 209, 0.3)',
        backdropFilter: 'blur(4px)',
        boxShadow: active ? '0 0 20px rgba(0, 255, 209, 0.4)' : '0 0 10px rgba(0, 255, 209, 0.15)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* 中心点指示 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 4,
          height: 4,
          background: 'rgba(0, 255, 209, 0.4)',
        }}
      />
      {/* 摇杆手柄 */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          background: 'rgba(0, 255, 209, 0.3)',
          border: '2px solid #00FFD1',
          boxShadow: '0 0 15px rgba(0, 255, 209, 0.6)',
          transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`,
          transition: active ? 'none' : 'transform 0.15s ease-out',
        }}
      />
    </div>
  )
}
