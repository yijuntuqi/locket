import { memo, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { CardFaces } from '@/components/wall/CardFaces'
import type { FakePhoto } from '@/lib/fakePhotos'

interface WallCardProps {
  photo: FakePhoto
  /** 照片在墙内的序号：派生扫光错峰（i*220ms）与入场错峰（i*45ms，封顶 900ms） */
  index: number
  /** 定位 + 朝向 + 聚焦浮出的完整 transform（含 translate(-50%,-50%) 前缀） */
  transform: string
  widthPx: number
  transition?: string
  focused: boolean
  anyFocused: boolean
  onHoverChange: (id: string, active: boolean) => void
  onDelete?: (id: string) => void
}

/** 画廊细框白边：随卡片宽度缩放，6px 封顶 */
function framePadFor(widthPx: number): number {
  return Math.min(6, Math.max(2, widthPx * 0.045))
}

/** 入场 stagger：45ms/张、封顶 900ms，全场总时长 ≤ 1.6s */
export function enterDelayFor(index: number): number {
  return Math.min(index * 45, 900)
}

/** 各布局通用的照片卡片：3D 定位外壳 + 入场浮现 + 画廊细框双面 + 眩光 + 删除按钮 + hover 聚焦 */
export const WallCard = memo(function WallCard({
  photo,
  index,
  transform,
  widthPx,
  transition,
  focused,
  anyFocused,
  onHoverChange,
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
      {/* 入场浮现层：只碰 opacity/transform，保持 preserve-3d；reduced-motion 下由全局规则关闭。
          absolute inset-0 撑满卡片——带 transform 动画的它是 CardFaces 里 absolute 子层的
          containing block，若保持 static（内容全为 absolute）高度会塌成 0，相框随之消失 */}
      <div
        data-testid="wall-card-enter"
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          animation: 'rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
          animationDelay: `${enterDelayFor(index)}ms`,
        }}
      >
        <CardFaces
          photo={photo}
          dimmed={anyFocused && !focused}
          framePadPx={framePadFor(widthPx)}
          sheenDelayMs={index * 220}
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
    </div>
  )
})

/** 聚焦浮出增量（各布局 transform 尾部追加） */
export const FOCUS_LIFT = ' translateZ(48px)'
