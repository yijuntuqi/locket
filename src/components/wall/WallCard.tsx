import { memo, type CSSProperties } from 'react'
import { X } from 'lucide-react'
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

/** 画廊细框白边：随卡片宽度缩放，6px 封顶 */
function framePadFor(widthPx: number): number {
  return Math.min(6, Math.max(2, widthPx * 0.045))
}

/** 各布局通用的照片卡片：3D 定位外壳 + 画廊细框双面 + 眩光 + 删除按钮 + hover 聚焦 */
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
      data-testid="wall-card"
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
        framePadPx={framePadFor(widthPx)}
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
          className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-red-500/80 focus:opacity-100 group-hover:opacity-100"
          style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
})

/** 聚焦浮出增量（各布局 transform 尾部追加） */
export const FOCUS_LIFT = ' translateZ(48px)'
