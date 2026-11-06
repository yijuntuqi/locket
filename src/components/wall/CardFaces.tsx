import { useRef, type MouseEvent } from 'react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { GlareLayer } from '@/components/wall/GlareLayer'

interface CardFacesProps {
  photo: FakePhoto
  /** 景深：其余照片变暗模糊（加在相框容器上——其子树是 2D 的，压塌无副作用） */
  dimmed: boolean
  /** 画廊细框的白边宽度 */
  framePadPx: number
  /** 触屏周期扫光的错峰延迟 */
  sheenDelayMs: number
  onFrontContextMenu?: (e: MouseEvent<HTMLDivElement>) => void
}

/** 卡纸暖白与暗背板：画廊细框的双面 */
const FRONT_MAT = '#faf8f4'
const BACK_MAT = '#1c1f2b'
/** 多层投影：近处接触影 + 远处环境影；内描边：外缘暗线 + 上缘高光 */
const FRONT_SHADOW =
  '0 2px 6px rgba(0,0,0,0.45), 0 18px 44px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
const BACK_SHADOW =
  '0 2px 6px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)'

/**
 * 照片卡片的双面内容：画廊细框正面 + 暗背板背面 + 眩光层。
 * 注意：filter 只加在相框容器上（其子树无 3D 元素，不会压塌 preserve-3d）；
 * 相框本身仍受外层卡片容器的 preserve-3d 管辖（backface-visibility 生效）。
 */
export function CardFaces({
  photo,
  dimmed,
  framePadPx,
  sheenDelayMs,
  onFrontContextMenu,
}: CardFacesProps) {
  const glareRef = useRef<HTMLDivElement | null>(null)
  const dimStyle = {
    transition: 'filter 0.4s ease',
    ...(dimmed ? { filter: 'blur(3px) brightness(0.45)' } : {}),
  }
  return (
    <>
      {/* 正面：画廊细框 */}
      <div
        data-testid="card-frame-front"
        className="absolute inset-0 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: FRONT_MAT,
          padding: framePadPx,
          boxShadow: FRONT_SHADOW,
          backfaceVisibility: 'hidden',
          ...dimStyle,
        }}
        onContextMenu={onFrontContextMenu}
        onPointerMove={(e) => {
          const glare = glareRef.current
          if (!glare) return
          const rect = e.currentTarget.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return
          glare.style.setProperty('--gx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
          glare.style.setProperty('--gy', `${((e.clientY - rect.top) / rect.height) * 100}%`)
          glare.style.opacity = '1'
        }}
        onPointerLeave={() => {
          const glare = glareRef.current
          if (glare) glare.style.opacity = '0'
        }}
      >
        <img
          src={photo.src}
          alt={photo.caption}
          draggable={false}
          className="h-full w-full select-none rounded-lg object-cover"
        />
      </div>
      {/* 背面：暗背板 + 半透明镜像 */}
      <div
        data-testid="card-frame-back"
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: BACK_MAT,
          padding: framePadPx,
          boxShadow: BACK_SHADOW,
          transform: 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
          ...dimStyle,
        }}
      >
        <img
          src={photo.src}
          alt=""
          aria-hidden
          draggable={false}
          className="h-full w-full select-none rounded-lg object-cover"
          style={{ opacity: 0.5 }}
        />
      </div>
      <GlareLayer glareRef={glareRef} insetPx={framePadPx} sheenDelayMs={sheenDelayMs} />
    </>
  )
}
