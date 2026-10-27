import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PhotoWall } from '@/components/PhotoWall'
import { ALBUM_UPDATED_EVENT } from '@/components/RealtimeListener'
import { MasonryView } from '@/components/wall/MasonryView'
import { Dock } from '@/components/wall/Dock'
import { PhotoLightbox } from '@/components/wall/PhotoLightbox'
import { SortableGridView } from '@/components/wall/SortableGridView'
import { TimelineView } from '@/components/wall/TimelineView'
import { UploadButton } from '@/components/wall/UploadButton'
import type { FakePhoto } from '@/lib/fakePhotos'
import { exportNodeToPng } from '@/lib/exportPng'
import { deletePhoto, listPhotosWithUrls, persistSortOrder, reorderPhotos } from '@/lib/photos'
import { publishAlbumEvent } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'
import type { Album, PhotoWithUrl } from '@/lib/types'
import { uploadPhotos } from '@/lib/upload'

type ViewMode = 'wall' | 'timeline' | 'masonry'

const VIEW_LABELS: Record<ViewMode, string> = {
  wall: '3D 墙',
  timeline: '时间轴',
  masonry: '瀑布流',
}

export default function WallPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const albumIdRef = useRef(albumId)
  const requestSeq = useRef(0)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [wallItems, setWallItems] = useState<FakePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('wall')
  const [sortMode, setSortMode] = useState(false)
  const wallExportRef = useRef<HTMLDivElement>(null)
  const [lightbox, setLightbox] = useState<{
    photos: { id: string; url: string }[]
    index: number
  } | null>(null)

  // 时间轴展示序（与 TimelineView 内部排序保持一致：created_at 新→旧）
  const timelinePhotos = useMemo(
    () => [...photos].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [photos]
  )
  const timelineLightboxPhotos = useMemo(
    () => timelinePhotos.map((p) => ({ id: p.id, url: p.url })),
    [timelinePhotos]
  )
  const masonryLightboxPhotos = useMemo(
    () => photos.map((p) => ({ id: p.id, url: p.url })),
    [photos]
  )

  const load = useCallback(async () => {
    const id = albumId
    if (!id) return
    const seq = ++requestSeq.current
    // 参数切换或新一轮请求开始后，旧响应一律作废
    const isStale = () => seq !== requestSeq.current || albumIdRef.current !== id
    try {
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .single()
      if (isStale()) return
      if (albumError) throw albumError
      setAlbum(albumData as Album)

      const photoList = await listPhotosWithUrls(id)
      if (isStale()) return
      setPhotos(photoList)
      setWallItems(
        photoList.map((p) => ({
          id: p.id,
          src: p.url,
          caption: `照片 ${p.sort_order + 1}`,
        }))
      )
      setError(null)
    } catch (err) {
      if (isStale()) return
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }, [albumId])

  useEffect(() => {
    albumIdRef.current = albumId
    setLightbox(null)
    setSortMode(false)
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [albumId, load])

  useEffect(() => {
    if (!albumId) return
    const onUpdated = (e: Event) => {
      if ((e as CustomEvent<string>).detail === albumId) void load()
    }
    window.addEventListener(ALBUM_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(ALBUM_UPDATED_EVENT, onUpdated)
  }, [albumId, load])

  async function handleUpload(files: File[]) {
    if (!album) return
    setUploading(true)
    setUploadMessage(null)
    try {
      const { results, failures } = await uploadPhotos(album.id, album.owner_id, files)
      if (failures.length > 0) {
        setUploadMessage(
          `${results.length} 张上传成功；${failures.length} 张失败：${failures
            .map((f) => f.fileName)
            .join('、')}`
        )
      } else {
        setUploadMessage(`上传成功 ${results.length} 张`)
        toast.success(`上传成功 ${results.length} 张`)
      }
      await load()
      void publishAlbumEvent(album.owner_id, {
        type: 'album-updated',
        albumId: album.id,
        albumName: album.name,
      }).catch(() => undefined)
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  async function handleExportWall() {
    const node = wallExportRef.current
    if (!node) return
    try {
      await exportNodeToPng(node, `locket-${album?.name ?? 'wall'}.png`)
      toast.success('已导出 PNG')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败')
    }
  }

  async function handleDeletePhoto(id: string) {
    const target = photos.find((p) => p.id === id)
    if (!target) return
    try {
      await deletePhoto(target)
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      setWallItems((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleReorder(from: number, to: number) {
    if (from === to) return
    const reordered = reorderPhotos(photos, from, to)
    try {
      await persistSortOrder(reordered.map((p) => ({ id: p.id, sort_order: p.sort_order })))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序保存失败')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        加载中…
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-red-400">{error ?? '相册不存在'}</p>
        <Link to="/" className="text-white/60 hover:text-white">
          返回相册列表
        </Link>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <Link
          to="/"
          className="pointer-events-auto rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-black/60"
        >
          ← 返回
        </Link>
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-white/20 bg-black/40 backdrop-blur">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === mode
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
          <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur">
            {album.name}
          </span>
          {viewMode !== 'wall' && (
            <button
              type="button"
              aria-pressed={sortMode}
              onClick={() => setSortMode((prev) => !prev)}
              className={`rounded-full border border-white/20 px-3 py-1.5 text-sm backdrop-blur transition-colors ${
                sortMode ? 'bg-white/20 text-white' : 'bg-black/40 text-white/60 hover:text-white'
              }`}
            >
              排序
            </button>
          )}
          <UploadButton pending={uploading} onFiles={(fs) => void handleUpload(fs)} />
        </div>
      </div>

      {uploadMessage && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur">
          {uploadMessage}
        </div>
      )}

      {viewMode === 'wall' ? (
        wallItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/50">
            这个相册还没有照片，点右上角上传吧
          </div>
        ) : (
          <div ref={wallExportRef} className="h-full">
            <PhotoWall photos={wallItems} onDeletePhoto={(id) => void handleDeletePhoto(id)} />
          </div>
        )
      ) : (
        <div className="h-full overflow-y-auto p-4 pt-20">
          {sortMode ? (
            <SortableGridView photos={photos} onReorder={(f, t) => void handleReorder(f, t)} />
          ) : viewMode === 'timeline' ? (
            <TimelineView
              photos={photos}
              onOpen={(i) =>
                setLightbox({ photos: timelineLightboxPhotos, index: i })
              }
            />
          ) : (
            <MasonryView
              photos={photos}
              onOpen={(i) => setLightbox({ photos: masonryLightboxPhotos, index: i })}
            />
          )}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}

      <Dock>
        <button
          type="button"
          disabled={viewMode !== 'wall'}
          onClick={() => void handleExportWall()}
          className="rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          导出 PNG
        </button>
      </Dock>
    </div>
  )
}
