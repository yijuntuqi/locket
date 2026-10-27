import { useLayoutEffect, useRef, useState } from 'react'
import { WallCard, FOCUS_LIFT } from '@/components/wall/WallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import { useWallFocus } from '@/hooks/useWallFocus'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeScatterPlacements } from '@/lib/layouts/scatterGeometry'

interface ScatterWallProps {
  photos: FakePhoto[]
  autoRotateDegPerSec?: number
  onDeletePhoto?: (id: string) => void
}

/** 散落拍立得：照片钉在墙面，带随机角度与缓慢浮动，拖拽时整面墙轻微 3D 倾斜 */
export function ScatterWall({ photos, autoRotateDegPerSec, onDeletePhoto }: ScatterWallProps) {
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

  const placements = computeScatterPlacements(
    photos.length,
    size.w || 1200,
    size.h || 800
  )

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
          transform: `rotateX(-6deg) rotateY(${(angleDeg * 0.2).toFixed(2)}deg)`,
          touchAction: 'none',
        }}
      >
        {photos.map((photo, i) => {
          const p = placements[i]
          const focused = photo.id === focusedId
          return (
            <div
              key={photo.id}
              data-testid="scatter-card"
              className="absolute"
              style={{
                left: Math.round(p.x),
                top: Math.round(p.y),
                animation: `float-drift ${9 + (i % 5)}s ease-in-out ${p.driftDelayMs}ms infinite`,
              }}
            >
              <WallCard
                photo={photo}
                widthPx={Math.round(170 * p.scale)}
                transition="transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
                transform={`translate(-50%, -50%) rotate(${p.rotateDeg}deg)${focused ? FOCUS_LIFT : ''}`}
                focused={focused}
                anyFocused={anyFocused}
                onHoverChange={handleHoverChange}
                sheenDelayMs={i * 220}
                onDelete={onDeletePhoto}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
