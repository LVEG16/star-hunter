import { useEffect, useState } from 'react'
import type { ControlMode } from '@/game/engine'

/**
 * 设备检测和控制模式管理 Hook
 */
export function useDeviceDetect() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [controlMode, setControlMode] = useState<ControlMode>(() => {
    // 从 localStorage 读取用户偏好
    const saved = localStorage.getItem('controlMode') as ControlMode | null
    return saved || 'auto'
  })

  useEffect(() => {
    const detect = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      setIsTouchDevice(touch)
    }
    detect()
    window.addEventListener('touchstart', detect, { once: true })
    return () => window.removeEventListener('touchstart', detect)
  }, [])

  const changeMode = (mode: ControlMode) => {
    setControlMode(mode)
    localStorage.setItem('controlMode', mode)
  }

  // 实际使用的控制方式
  const activeControl: 'keyboard' | 'touch' =
    controlMode === 'auto' ? (isTouchDevice ? 'touch' : 'keyboard') : controlMode

  return { isTouchDevice, controlMode, setControlMode: changeMode, activeControl }
}
