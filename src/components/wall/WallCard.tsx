import { memo, type CSSProperties } from 'react'
import { CardFaces } from '@/components/wall/CardFaces'
import type { FakePhoto } from '@/lib/fakePhotos'

interface WallCardProps {
  photo: FakePhoto
  /** 定位 + 朝向 + 聚焦浮出的完整 transform（含 translate(-50%,-50%) 前缀） */
  transform: string
  widthPx: number
  transition?: string
  focused: boolean
  anyFocused: boolean
  onHoverChange: (id: string, active: boolean) => void
  sheenDelayMs: number
  onDelete?: (id: string) => void
}

/** 各布局通用的照片卡片：3D 定位外壳 + 双面反光内容 + 删除按钮 + hover 聚焦 */
export const WallCard = memo(function WallCard({
  photo,
  transform,
  widthPx,
  transition,
  focused,
  anyFocused,
  onHoverChange,
  sheenDelayMs,
  onDelete,
}: WallCardProps) {
  const style: CSSProperties = {
    width: widthPx,
    aspectRatio: '3 / 4',
    willChange: 'transform',
    transformStyle: 'preserve-3d',
    transform,
    transition,
  }
  const handleDelete = onDelete ? () => onDelete(photo.id) : undefined
  return (
    <div
      className="absolute left-1/2 top-1/2"
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

/** 聚焦浮出增量（各布局 transform 尾部追加） */
export const FOCUS_LIFT = ' translateZ(48px)'
