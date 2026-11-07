import { memo, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { CardFaces } from '@/components/wall/CardFaces'
import { enterDelayFor } from '@/components/wall/WallCard'
import type { FakePhoto } from '@/lib/fakePhotos'

interface PhotoWallCardProps {
  photo: FakePhoto
  angleDeg: number
  radiusPx: number
  widthPx: number
  /** 照片在墙内的序号：派生扫光错峰（i*220ms）与入场错峰 */
  index: number
  /** 当前被 hover 聚焦（浮出） */
  focused: boolean
  /** 场景中存在聚焦卡片（其余进入景深） */
  anyFocused: boolean
  onHoverChange: (id: string, active: boolean) => void
  onDelete?: (id: string) => void
}

export const PhotoWallCard = memo(function PhotoWallCard({
  photo,
  angleDeg,
  radiusPx,
  widthPx,
  index,
  focused,
  anyFocused,
  onHoverChange,
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
      {/* 入场浮现层：与 WallCard 同构（absolute inset-0 撑满卡片，防 absolute 子层塌 0），reduced-motion 下由全局规则关闭 */}
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
          framePadPx={Math.min(6, Math.max(2, widthPx * 0.045))}
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
