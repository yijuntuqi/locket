import { useLayoutEffect, useRef, useState } from 'react'
import { PhotoWallCard } from '@/components/PhotoWallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computePlacements, computeRadius, computeResponsiveScale } from '@/lib/wallGeometry'

interface PhotoWallProps {
  photos: FakePhoto[]
  cardWidthPx?: number
  gapPx?: number
  /** 俯视倾斜角（度），让圆柱呈现从斜上方往下看的纵深 */
  tiltDeg?: number
  onDeletePhoto?: (id: string) => void
}

export function PhotoWall({
  photos,
  cardWidthPx = 240,
  gapPx = 24,
  tiltDeg = 18,
  onDeletePhoto,
}: PhotoWallProps) {
  const { angleDeg, isDragging, handlers } = usePhotoWallRotation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 容器过窄时按比例缩小卡片与圆柱，避免两侧照片被 overflow 裁掉
  const baseRadius = computeRadius(photos.length, cardWidthPx, gapPx)
  const scale =
    containerWidth > 0
      ? computeResponsiveScale(containerWidth, baseRadius, cardWidthPx)
      : 1
  const scaledCardWidth = Math.round(cardWidthPx * scale)
  const scaledGap = Math.round(gapPx * scale)
  const placements = computePlacements(photos.length, scaledCardWidth, scaledGap)
  const radiusPx = placements[0]?.radiusPx ?? 0

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      <div
        {...handlers}
        data-testid="wall-drag-surface"
        className={`absolute inset-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tiltDeg}deg) translateZ(-${radiusPx}px) rotateY(${angleDeg}deg)`,
          touchAction: 'none',
        }}
      >
        {photos.length === 0 && (
          <div className="flex h-full items-center justify-center text-white/60">
            还没有照片
          </div>
        )}
        {photos.map((photo, i) => (
          <PhotoWallCard
            key={photo.id}
            photo={photo}
            angleDeg={placements[i].angleDeg}
            radiusPx={placements[i].radiusPx}
            widthPx={scaledCardWidth}
            onDelete={onDeletePhoto}
          />
        ))}
      </div>
    </div>
  )
}
