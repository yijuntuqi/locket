import type { CSSProperties } from 'react'
import type { FakePhoto } from '@/lib/fakePhotos'

interface PhotoWallCardProps {
  photo: FakePhoto
  angleDeg: number
  radiusPx: number
  widthPx: number
}

export function PhotoWallCard({ photo, angleDeg, radiusPx, widthPx }: PhotoWallCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
    transform: `translate(-50%, -50%) rotateY(${angleDeg}deg) translateZ(${radiusPx}px)`,
  }
  return (
    <img
      src={photo.src}
      alt={photo.caption}
      draggable={false}
      className="absolute left-1/2 top-1/2 select-none rounded-xl shadow-lg"
      style={style}
    />
  )
}
