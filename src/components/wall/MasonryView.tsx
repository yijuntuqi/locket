import type { PhotoWithUrl } from '@/lib/types'

interface MasonryViewProps {
  photos: PhotoWithUrl[]
  onOpen: (index: number) => void
}

export function MasonryView({ photos, onOpen }: MasonryViewProps) {
  if (photos.length === 0) {
    return <div className="text-white/50">暂无照片</div>
  }

  return (
    <div className="gap-3 columns-2 md:columns-3 xl:columns-4">
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onOpen(i)}
          className="mb-3 block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-xl"
        >
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            draggable={false}
            className="w-full select-none"
          />
        </button>
      ))}
    </div>
  )
}
