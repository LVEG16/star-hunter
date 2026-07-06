import { Monitor, Smartphone, Zap } from 'lucide-react'
import type { ControlMode } from '@/game/engine'

interface ControlSwitcherProps {
  mode: ControlMode
  onChange: (mode: ControlMode) => void
}

/**
 * 控制模式切换器 - 在主菜单显示
 */
export default function ControlSwitcher({ mode, onChange }: ControlSwitcherProps) {
  const options: { value: ControlMode; label: string; icon: typeof Monitor; desc: string }[] = [
    { value: 'auto', label: '自动', icon: Zap, desc: '根据设备自动选择' },
    { value: 'keyboard', label: '电脑', icon: Monitor, desc: 'WASD/方向键' },
    { value: 'touch', label: '手机', icon: Smartphone, desc: '虚拟摇杆' },
  ]

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-orbitron text-xs tracking-widest text-[#00FFD1]/60">
        操作方式
      </span>
      <div className="flex gap-2">
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-2 transition-all ${
                isActive
                  ? 'border-[#00FFD1] bg-[#00FFD1]/10 text-[#00FFD1]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/90'
              }`}
              title={opt.desc}
            >
              <Icon size={18} />
              <span className="font-rajdhani text-xs font-bold">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
