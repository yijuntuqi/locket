import type { PhotoWithUrl } from '@/lib/types'

interface SortableGridViewProps {
  photos: PhotoWithUrl[]
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function SortableGridView({ photos, onReorder }: SortableGridViewProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {photos.map((photo, i) => (
        <div
          key={photo.id}
          data-testid="sortable-item"
          data-index={i}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', String(i))
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            const from = Number(e.dataTransfer.getData('text/plain'))
            if (Number.isInteger(from)) onReorder(from, i)
          }}
          className="cursor-move overflow-hidden rounded-lg border border-white/10"
        >
          <img
            src={photo.url}
            alt=""
            draggable={false}
            className="w-full select-none object-cover"
          />
        </div>
      ))}
    </div>
  )
}
