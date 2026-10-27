import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PhotoWallCard } from '@/components/PhotoWallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computePlacements, computeRadius, computeResponsiveScale } from '@/lib/wallGeometry'

interface PhotoWallProps {
  photos: FakePhoto[]
  cardWidthPx?: number
  gapPx?: number
  /** 俯视倾斜角（度），负值 = 从斜上方往下看（CSS rotateX 正值是仰视） */
  tiltDeg?: number
  /** 自动旋转角速度（度/秒），0 = 不自转 */
  autoRotateDegPerSec?: number
  onDeletePhoto?: (id: string) => void
}

export function PhotoWall({
  photos,
  cardWidthPx = 240,
  gapPx = 24,
  tiltDeg = -18,
  autoRotateDegPerSec,
  onDeletePhoto,
}: PhotoWallProps) {
  const { angleDeg, isDragging, setPaused, handlers } = usePhotoWallRotation(
    autoRotateDegPerSec === undefined ? {} : { autoRotateDegPerSec }
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // hover 聚焦时暂停自转：照片稳住了，删除/端详都好操作
  useEffect(() => {
    setPaused(focusedId !== null)
    return () => setPaused(false)
  }, [focusedId, setPaused])

  // 景深聚焦：enter 聚焦、leave 仅在自己仍是焦点时清除（稳定引用，保 memo）
  const handleHoverChange = useCallback((id: string, active: boolean) => {
    if (reducedMotionRef.current) return
    setFocusedId((prev) => (active ? id : prev === id ? null : prev))
  }, [])

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
            focused={photo.id === focusedId}
            anyFocused={focusedId !== null}
            onHoverChange={handleHoverChange}
            sheenDelayMs={i * 220}
            onDelete={onDeletePhoto}
          />
        ))}
      </div>
    </div>
  )
}
