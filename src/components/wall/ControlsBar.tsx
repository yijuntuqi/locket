import { useEffect, useRef, useState } from 'react'
import { glassPill } from '@/lib/glass'
import { WALL_LAYOUTS, layoutLabel, type WallLayout } from '@/lib/layouts'

interface ControlsBarProps {
  currentLayout: WallLayout
  onLayoutChange: (layout: WallLayout) => void
  autoRotate: boolean
  onToggleAutoRotate: () => void
  disabled: boolean
}

/** 右缘常驻控制条：布局选择 + 自动旋转（垂直 pill，不遮挡中央照片区） */
export function ControlsBar({
  currentLayout,
  onLayoutChange,
  autoRotate,
  onToggleAutoRotate,
  disabled,
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

  return (
    <div ref={rootRef} className="fixed right-3 top-1/2 z-30 -translate-y-1/2">
      <div className={`flex flex-col items-center gap-1 px-1.5 py-2 ${glassPill} shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full px-2 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          布局：{layoutLabel(currentLayout)}
        </button>
        {open &&
          WALL_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onLayoutChange(l.id)
                setOpen(false)
              }}
              className={`rounded-full px-2 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
                l.id === currentLayout ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              布局：{l.label}
            </button>
          ))}
        <div className="h-px w-6 bg-white/15" aria-hidden />
        <button
          type="button"
          aria-pressed={autoRotate}
          disabled={disabled}
          onClick={onToggleAutoRotate}
          className={`rounded-full px-2 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            autoRotate ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          自动旋转
        </button>
      </div>
    </div>
  )
}
