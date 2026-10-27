import { useEffect } from 'react'

interface LightboxPhoto {
  id: string
  url: string
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}

export function PhotoLightbox({ photos, index, onIndexChange, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onClose, onIndexChange])

  const current = photos[index]
  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        aria-label="上一张"
        onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
        className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
      >
        ‹
      </button>
      <img src={current.url} alt="" className="max-h-[80vh] max-w-[90vw] object-contain" />
      <button
        type="button"
        aria-label="下一张"
        onClick={() => onIndexChange((index + 1) % photos.length)}
        className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
      >
        ›
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}
