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
    backfaceVisibility: 'hidden',
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
        className="h-full w-full select-none rounded-xl object-cover shadow-lg"
        onContextMenu={
          handleDelete
            ? (e) => {
                e.preventDefault()
                handleDelete()
              }
            : undefined
        }
      />
      {handleDelete && (
        <button
          type="button"
          aria-label={`删除 ${photo.caption}`}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity hover:bg-red-500/80 focus:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  )
})
