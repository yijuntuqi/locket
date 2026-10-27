import { memo, type CSSProperties } from 'react'
import type { FakePhoto } from '@/lib/fakePhotos'

interface PhotoWallCardProps {
  photo: FakePhoto
  angleDeg: number
  radiusPx: number
  widthPx: number
  onDelete?: (id: string) => void
}

export const PhotoWallCard = memo(function PhotoWallCard({
  photo,
  angleDeg,
  radiusPx,
  widthPx,
  onDelete,
}: PhotoWallCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    willChange: 'transform',
    transformStyle: 'preserve-3d',
    transform: `translate(-50%, -50%) rotateY(${angleDeg}deg) translateZ(${radiusPx}px)`,
  }
  const handleDelete = onDelete
    ? () => onDelete(photo.id)
    : undefined
  return (
    <div className="group absolute left-1/2 top-1/2" style={style}>
      <img
        src={photo.src}
        alt={photo.caption}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none rounded-xl object-cover shadow-lg"
        style={{ backfaceVisibility: 'hidden' }}
        onContextMenu={
          handleDelete
            ? (e) => {
                e.preventDefault()
                handleDelete()
              }
            : undefined
        }
      />
      <img
        data-testid="card-back"
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
      {handleDelete && (
        <button
          type="button"
          aria-label={`删除 ${photo.caption}`}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity hover:bg-red-500/80 focus:opacity-100 group-hover:opacity-100"
          style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
        >
          ✕
        </button>
      )}
    </div>
  )
})
