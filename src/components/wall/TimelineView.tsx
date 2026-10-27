import type { PhotoWithUrl } from '@/lib/types'

interface TimelineViewProps {
  photos: PhotoWithUrl[]
  onOpen: (index: number) => void
}

export function TimelineView({ photos, onOpen }: TimelineViewProps) {
  if (photos.length === 0) {
    return <div className="text-white/50">暂无照片</div>
  }

  const sorted = [...photos].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const groups = new Map<string, PhotoWithUrl[]>()
  for (const p of sorted) {
    const key = p.created_at.slice(0, 7)
    const list = groups.get(key)
    if (list) list.push(p)
    else groups.set(key, [p])
  }

  let flatIndex = 0
  const sections = [...groups.entries()].map(([key, items]) => ({
    key,
    label: `${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月`,
    items: items.map((photo) => ({ photo, index: flatIndex++ })),
  }))

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 text-sm text-white/60">{section.label}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {section.items.map(({ photo, index }) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpen(index)}
                className="overflow-hidden rounded-lg"
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="w-full select-none object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
