import { useLayoutEffect, useRef, useState } from 'react'
import { WallCard, FOCUS_LIFT } from '@/components/wall/WallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import { useWallFocus } from '@/hooks/useWallFocus'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeSpherePlacements } from '@/lib/layouts/sphereGeometry'

interface SphereWallProps {
  photos: FakePhoto[]
  autoRotateDegPerSec?: number
  onDeletePhoto?: (id: string) => void
}

/** 球形展厅：照片贴满球面，整球拖拽/自转 */
export function SphereWall({ photos, autoRotateDegPerSec, onDeletePhoto }: SphereWallProps) {
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

  const radius = (Math.min(size.w, size.h) || 600) * 0.36
  const cardWidth = Math.max(72, Math.round(radius * 0.42))
  const points = computeSpherePlacements(photos.length, radius)

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      <div
        {...handlers}
        data-testid="wall-drag-surface"
        className="absolute inset-0 cursor-grab"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(-10deg) rotateY(${angleDeg}deg)`,
          touchAction: 'none',
        }}
      >
        {photos.map((photo, i) => {
          const p = points[i]
          const rotateYDeg = (Math.atan2(p.x, p.z) * 180) / Math.PI
          const sinY = Math.max(-1, Math.min(1, p.y / radius))
          const rotateXDeg = (-Math.asin(sinY) * 180) / Math.PI
          const focused = photo.id === focusedId
          return (
            <WallCard
              key={photo.id}
              photo={photo}
              widthPx={cardWidth}
              transition="transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
              transform={`translate(-50%, -50%) translate3d(${Math.round(p.x)}px, ${Math.round(-p.y)}px, ${Math.round(p.z)}px) rotateY(${rotateYDeg.toFixed(1)}deg) rotateX(${rotateXDeg.toFixed(1)}deg)${focused ? FOCUS_LIFT : ''}`}
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
