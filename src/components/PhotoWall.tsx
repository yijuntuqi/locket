import { PhotoWallCard } from '@/components/PhotoWallCard'
import { usePhotoWallRotation } from '@/hooks/usePhotoWallRotation'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computePlacements } from '@/lib/wallGeometry'

interface PhotoWallProps {
  photos: FakePhoto[]
  cardWidthPx?: number
  gapPx?: number
}

export function PhotoWall({ photos, cardWidthPx = 240, gapPx = 24 }: PhotoWallProps) {
  const { angleDeg, isDragging, handlers } = usePhotoWallRotation()
  const placements = computePlacements(photos.length, cardWidthPx, gapPx)
  const radiusPx = placements[0]?.radiusPx ?? 0

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ perspective: '1200px' }}>
      <div
        {...handlers}
        className={`absolute inset-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateZ(-${radiusPx}px) rotateY(${angleDeg}deg)`,
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
            widthPx={cardWidthPx}
          />
        ))}
      </div>
    </div>
  )
}
