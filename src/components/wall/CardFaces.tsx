import type { MouseEvent } from 'react'
import type { FakePhoto } from '@/lib/fakePhotos'

interface CardFacesProps {
  photo: FakePhoto
  /** 景深：其余照片变暗模糊（只加在叶子 img 上，保持 preserve-3d） */
  dimmed: boolean
  /** 动态反光扫过的错峰延迟 */
  sheenDelayMs: number
  onFrontContextMenu?: (e: MouseEvent<HTMLImageElement>) => void
}

/**
 * 照片卡片的双面内容（正面 + 半透明镜像背面 + 动态反光层）。
 * 注意：filter/opacity 只能加在叶子 img/overlay 上——加到任何 preserve-3d
 * 容器都会把 3D 子树压塌（MDN transform-style / Chrome 官方示例）。
 */
export function CardFaces({ photo, dimmed, sheenDelayMs, onFrontContextMenu }: CardFacesProps) {
  const faceStyle = {
    backfaceVisibility: 'hidden' as const,
    transition: 'filter 0.4s ease',
    ...(dimmed ? { filter: 'blur(3px) brightness(0.45)' } : {}),
  }
  return (
    <>
      <img
        src={photo.src}
        alt={photo.caption}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none rounded-xl object-cover shadow-lg"
        style={faceStyle}
        onContextMenu={onFrontContextMenu}
      />
      <img
        src={photo.src}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full select-none rounded-xl object-cover shadow-lg"
        style={{ ...faceStyle, transform: 'rotateY(180deg)', opacity: 0.6 }}
      />
      <div
        data-testid="card-sheen"
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%)',
          backgroundSize: '250% 100%',
          mixBlendMode: 'screen',
          animation: `sheen 7s ease-in-out ${sheenDelayMs}ms infinite`,
        }}
      />
    </>
  )
}
