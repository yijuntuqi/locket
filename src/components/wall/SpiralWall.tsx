import { useLayoutEffect, useRef, useState } from 'react'
import { WallCard, FOCUS_LIFT } from '@/components/wall/WallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import { useWallFocus } from '@/hooks/useWallFocus'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeSpiralPlacements } from '@/lib/layouts/spiralGeometry'

interface SpiralWallProps {
  photos: FakePhoto[]
  autoRotateDegPerSec?: number
  onDeletePhoto?: (id: string) => void
}

/** 螺旋隧道：照片沿黄金角螺旋纵深排开，拖拽绕轴旋转产生穿越感 */
export function SpiralWall({ photos, autoRotateDegPerSec, onDeletePhoto }: SpiralWallProps) {
  const { angleDeg, setPaused, handlers } = usePhotoWallRotation(
    autoRotateDegPerSec === undefined ? {} : { autoRotateDegPerSec }
  )
  const { focusedId, anyFocused, handleHoverChange } = useWallFocus(setPaused)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const radius = (Math.min(size.w, size.h) || 600) * 0.34
  const cardWidth = Math.max(64, Math.round(radius * 0.4))
  const placements = computeSpiralPlacements(photos.length)

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: '1100px' }}
    >
      <div
        {...handlers}
        data-testid="wall-drag-surface"
        className="absolute inset-0 cursor-grab"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateZ(${(angleDeg * 0.6).toFixed(2)}deg)`,
          touchAction: 'none',
        }}
      >
        {photos.map((photo, i) => {
          const p = placements[i]
          const rad = (p.angleDeg * Math.PI) / 180
          const x = Math.cos(rad) * radius
          const y = Math.sin(rad) * radius
          const rotateYDeg = (Math.atan2(x, p.z) * 180) / Math.PI
          const focused = photo.id === focusedId
          return (
            <WallCard
              key={photo.id}
              photo={photo}
              widthPx={cardWidth}
              transition="transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
              transform={`translate(-50%, -50%) translate3d(${Math.round(x)}px, ${Math.round(y)}px, ${p.z}px) rotateY(${rotateYDeg.toFixed(1)}deg)${focused ? FOCUS_LIFT : ''}`}
              focused={focused}
              anyFocused={anyFocused}
              onHoverChange={handleHoverChange}
              sheenDelayMs={i * 220}
              onDelete={onDeletePhoto}
            />
          )
        })}
      </div>
    </div>
  )
}
