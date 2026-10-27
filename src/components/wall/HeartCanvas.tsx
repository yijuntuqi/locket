import { memo, useEffect, useState, type CSSProperties } from 'react'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeHeartPositions3D } from '@/lib/heartGeometry3d'

interface HeartCardProps {
  photo: FakePhoto
  x: number
  y: number
  z: number
  rotateYDeg: number
  widthPx: number
  delayMs: number
  mounted: boolean
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
}: HeartCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    transformStyle: 'preserve-3d',
    transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotateYDeg}deg)${
      mounted ? '' : ' scale(0)'
    }`,
    transition: `transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
    willChange: 'transform',
  }
  return (
    <div className="absolute left-1/2 top-1/2" style={style}>
      <img
        src={photo.src}
        alt={photo.caption}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none rounded-xl object-cover shadow-lg"
        style={{ backfaceVisibility: 'hidden' }}
      />
      <img
        src={photo.src}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full select-none rounded-xl object-cover shadow-lg"
        style={{
          transform: 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
          opacity: 0.6,
        }}
      />
    </div>
  )
})

interface HeartCanvasProps {
  photos: FakePhoto[]
  /** 心形整体缩放（每单位对应 px） */
  scalePx?: number
  /** 俯视倾斜角（度），负值 = 从斜上方看 */
  tiltDeg?: number
}

export function HeartCanvas({ photos, scalePx, tiltDeg = -12 }: HeartCanvasProps) {
  const { angleDeg, isDragging, handlers } = usePhotoWallRotation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const scale = scalePx ?? Math.min(window.innerWidth, window.innerHeight) / 40
  const cardWidth = Math.max(96, Math.round(scale * 12))
  const positions = computeHeartPositions3D(photos.length)

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
          const p = positions[i]
          const rotateYDeg = (Math.atan2(p.x, p.z) * 180) / Math.PI
          return (
            <HeartCard
              key={photo.id}
              photo={photo}
              x={Math.round(p.x * scale)}
              y={Math.round(-p.y * scale)}
              z={Math.round(p.z * scale)}
              rotateYDeg={Math.round(rotateYDeg)}
              widthPx={cardWidth}
              delayMs={i * 45}
              mounted={mounted}
            />
          )
        })}
      </div>
    </div>
  )
}
