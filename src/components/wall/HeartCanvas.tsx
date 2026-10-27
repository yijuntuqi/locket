import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react'
import { CardFaces } from '@/components/wall/CardFaces'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeHeartCardTransforms } from '@/lib/heartGeometry3d'

interface HeartCardProps {
  photo: FakePhoto
  x: number
  y: number
  z: number
  rotateYDeg: number
  widthPx: number
  delayMs: number
  mounted: boolean
  focused: boolean
  anyFocused: boolean
  onHoverChange: (id: string, active: boolean) => void
  sheenDelayMs: number
}

const HeartCard = memo(function HeartCard({
  photo,
  x,
  y,
  z,
  rotateYDeg,
  widthPx,
  delayMs,
  mounted,
  focused,
  anyFocused,
  onHoverChange,
  sheenDelayMs,
}: HeartCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    transformStyle: 'preserve-3d',
    transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotateYDeg}deg)${
      mounted ? '' : ' scale(0)'
    }${focused ? ' translateZ(48px)' : ''}`,
    transition: `transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
    willChange: 'transform',
  }
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={style}
      onPointerEnter={(e) => {
        if (e.buttons === 0) onHoverChange(photo.id, true)
      }}
      onPointerLeave={() => onHoverChange(photo.id, false)}
    >
      <CardFaces photo={photo} dimmed={anyFocused && !focused} sheenDelayMs={sheenDelayMs} />
    </div>
  )
})

interface HeartCanvasProps {
  photos: FakePhoto[]
  /** 心形整体缩放（每单位对应 px） */
  scalePx?: number
  /** 俯视倾斜角（度），负值 = 从斜上方看 */
  tiltDeg?: number
  /** 自动旋转角速度（度/秒），0 = 不自转 */
  autoRotateDegPerSec?: number
}

export function HeartCanvas({
  photos,
  scalePx,
  tiltDeg = -12,
  autoRotateDegPerSec,
}: HeartCanvasProps) {
  const { angleDeg, isDragging, handlers } = usePhotoWallRotation(
    autoRotateDegPerSec === undefined ? {} : { autoRotateDegPerSec }
  )
  const [mounted, setMounted] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleHoverChange = useCallback((id: string, active: boolean) => {
    setFocusedId((prev) => (active ? id : prev === id ? null : prev))
  }, [])

  const scale = scalePx ?? Math.min(window.innerWidth, window.innerHeight) / 40
  const cardWidth = Math.max(96, Math.round(scale * 12))
  const cards = computeHeartCardTransforms(photos.length)

  return (
    <div
      data-testid="heart-canvas"
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      <div
        {...handlers}
        data-testid="wall-drag-surface"
        className={`absolute inset-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tiltDeg}deg) rotateY(${angleDeg}deg)`,
          touchAction: 'none',
        }}
      >
        {photos.map((photo, i) => {
          const p = cards[i]
          return (
            <HeartCard
              key={photo.id}
              photo={photo}
              x={Math.round(p.x * scale)}
              y={Math.round(-p.y * scale)}
              z={Math.round(p.z * scale)}
              rotateYDeg={Math.round(p.rotateYDeg)}
              widthPx={cardWidth}
              delayMs={i * 45}
              mounted={mounted}
              focused={photo.id === focusedId}
              anyFocused={focusedId !== null}
              onHoverChange={handleHoverChange}
              sheenDelayMs={i * 220}
            />
          )
        })}
      </div>
    </div>
  )
}
