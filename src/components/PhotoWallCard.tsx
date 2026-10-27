import { memo, type CSSProperties } from 'react'
import { CardFaces } from '@/components/wall/CardFaces'
import type { FakePhoto } from '@/lib/fakePhotos'

interface PhotoWallCardProps {
  photo: FakePhoto
  angleDeg: number
  radiusPx: number
  widthPx: number
  /** 当前被 hover 聚焦（浮出） */
  focused: boolean
  /** 场景中存在聚焦卡片（其余进入景深） */
  anyFocused: boolean
  onHoverChange: (id: string, active: boolean) => void
  sheenDelayMs: number
  onDelete?: (id: string) => void
}

export const PhotoWallCard = memo(function PhotoWallCard({
  photo,
  angleDeg,
  radiusPx,
  widthPx,
  focused,
  anyFocused,
  onHoverChange,
  sheenDelayMs,
  onDelete,
}: PhotoWallCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    willChange: 'transform',
    transformStyle: 'preserve-3d',
    transform: `translate(-50%, -50%) rotateY(${angleDeg}deg) translateZ(${radiusPx}px)${
      focused ? ' translateZ(48px)' : ''
    }`,
    transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
  }
  const handleDelete = onDelete
    ? () => onDelete(photo.id)
    : undefined
  return (
    <div
      className="group absolute left-1/2 top-1/2"
      style={style}
      onPointerEnter={(e) => {
        if (e.buttons === 0) onHoverChange(photo.id, true)
      }}
      onPointerLeave={() => onHoverChange(photo.id, false)}
    >
      <CardFaces
        photo={photo}
        dimmed={anyFocused && !focused}
        sheenDelayMs={sheenDelayMs}
        onFrontContextMenu={
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
          className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm text-white opacity-0 transition-opacity hover:bg-red-500/80 focus:opacity-100 group-hover:opacity-100"
          style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
        >
          ✕
        </button>
      )}
    </div>
  )
})
