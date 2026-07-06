import { useGameStore } from '@/store/gameStore'
import type { UpgradeType } from '@/game/types'
import { UPGRADE_CONFIGS, UPGRADE_MAX_LEVEL, getUpgradeCost } from '@/game/constants'
import { X, Coins } from 'lucide-react'

const UPGRADE_KEYS: UpgradeType[] = ['attack', 'fireRate', 'maxHp', 'speed', 'bulletSpeed']

export default function UpgradeShop() {
  const coins = useGameStore((s) => s.coins)
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)
  const upgrade = useGameStore((s) => s.upgrade)
  const setShowUpgradeShop = useGameStore((s) => s.setShowUpgradeShop)

  const handleUpgrade = (type: UpgradeType) => {
    const level = upgradeLevels[type]
    if (level >= UPGRADE_MAX_LEVEL) return
    const cost = getUpgradeCost(type, level)
    if (coins < cost) return
    upgrade(type)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[90vw] max-w-md rounded-2xl border border-[#FFD700]/30 bg-[#0a0a1a]/95 p-6 shadow-[0_0_30px_rgba(255,215,0,0.15)]">
        {/* 关闭按钮 */}
        <button
          onClick={() => setShowUpgradeShop(false)}
          className="absolute right-4 top-4 text-white/50 transition-colors hover:text-white"
        >
          <X size={20} />
        </button>

        {/* 标题 */}
        <h2 className="mb-1 text-center font-orbitron text-xl font-bold text-[#FFD700]">
          战机升级
        </h2>
        <p className="mb-4 text-center font-orbitron text-xs tracking-widest text-[#FFD700]/60">
          UPGRADE
        </p>

        {/* 金币余额 */}
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/5 px-4 py-2">
          <Coins size={18} className="text-[#FFD700]" />
          <span className="font-rajdhani text-lg font-bold text-[#FFD700]">{coins}</span>
        </div>

        {/* 升级列表 */}
        <div className="flex flex-col gap-3">
          {UPGRADE_KEYS.map((type) => {
            const cfg = UPGRADE_CONFIGS[type]
            const level = upgradeLevels[type]
            const maxed = level >= UPGRADE_MAX_LEVEL
            const cost = maxed ? 0 : getUpgradeCost(type, level)
            const canAfford = coins >= cost && !maxed

            return (
              <div
                key={type}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  maxed
                    ? 'border-[#00FFD1]/20 bg-[#00FFD1]/5'
                    : canAfford
                    ? 'border-[#FFD700]/30 bg-[#FFD700]/5 hover:border-[#FFD700]/50 hover:bg-[#FFD700]/10'
                    : 'border-white/10 bg-white/5 opacity-60'
                }`}
              >
                {/* 图标 */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">
                  {cfg.icon}
                </div>

                {/* 信息 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-rajdhani text-sm font-bold text-white">{cfg.name}</span>
                    <span className="rounded bg-[#FFD700]/20 px-1.5 py-0.5 font-rajdhani text-xs font-bold text-[#FFD700]">
                      Lv.{level}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">{cfg.effect}</p>
                  {/* 等级进度条 */}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#FFD700] transition-all"
                      style={{ width: `${(level / UPGRADE_MAX_LEVEL) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 升级按钮 */}
                <button
                  onClick={() => handleUpgrade(type)}
                  disabled={!canAfford}
                  className={`flex flex-shrink-0 flex-col items-center rounded-lg px-3 py-1.5 font-rajdhani text-sm font-bold transition-all ${
                    maxed
                      ? 'bg-[#00FFD1]/20 text-[#00FFD1]'
                      : canAfford
                      ? 'bg-[#FFD700] text-black hover:bg-[#FFD700]/80 active:scale-95'
                      : 'bg-white/10 text-white/30'
                  }`}
                >
                  {maxed ? (
                    <span>MAX</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1">
                        <Coins size={12} />
                        {cost}
                      </span>
                      <span className="text-[10px] opacity-70">UPGRADE</span>
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
