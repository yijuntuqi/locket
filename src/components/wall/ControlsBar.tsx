import { useEffect, useRef, useState } from 'react'
import {
  Columns3,
  Orbit,
  RefreshCw,
  Shell,
  Sparkles,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { glassPill } from '@/lib/glass'
import { WALL_LAYOUTS, layoutLabel, type WallLayout } from '@/lib/layouts'

/** 每个布局一枚图标，让选项一眼可辨 */
const LAYOUT_ICONS: Record<WallLayout, LucideIcon> = {
  cylinder: Columns3,
  sphere: Orbit,
  scatter: Sparkles,
  spiral: Shell,
  drift: Waves,
}

interface ControlsBarProps {
  currentLayout: WallLayout
  onLayoutChange: (layout: WallLayout) => void
  autoRotate: boolean
  onToggleAutoRotate: () => void
  disabled: boolean
  /** 漂移墙恒定漂移，自动旋转开关无意义时置灰 */
  autoRotateDisabled?: boolean
}

/** 右缘常驻控制条：布局选择 + 自动旋转（垂直 pill，不遮挡中央照片区） */
export function ControlsBar({
  currentLayout,
  onLayoutChange,
  autoRotate,
  onToggleAutoRotate,
  disabled,
  autoRotateDisabled = false,
}: ControlsBarProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const CurrentIcon = LAYOUT_ICONS[currentLayout]

  return (
    <div ref={rootRef} className="fixed right-3 top-1/2 z-30 -translate-y-1/2">
      <div className={`flex flex-col items-center gap-1 px-1.5 py-2 ${glassPill} shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CurrentIcon className="h-3.5 w-3.5" aria-hidden />
          布局：{layoutLabel(currentLayout)}
        </button>
        {open && (
          <div
            data-testid="layout-menu"
            className="flex flex-col items-center gap-1"
            style={{
              animation: 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
              transformOrigin: 'top center',
            }}
          >
            {WALL_LAYOUTS.map((l) => {
              const Icon = LAYOUT_ICONS[l.id]
              const active = l.id === currentLayout
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onLayoutChange(l.id)
                    setOpen(false)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  布局：{l.label}
                </button>
              )
            })}
          </div>
        )}
        <div className="h-px w-6 bg-white/15" aria-hidden />
        <button
          type="button"
          aria-pressed={autoRotate}
          disabled={disabled || autoRotateDisabled}
          onClick={onToggleAutoRotate}
          className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            autoRotate ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          自动旋转
        </button>
      </div>
    </div>
  )
}
