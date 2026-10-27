import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PhotoWall } from '@/components/PhotoWall'
import { ALBUM_UPDATED_EVENT } from '@/components/RealtimeListener'
import { Dock } from '@/components/wall/Dock'
import { HeartCanvas } from '@/components/wall/HeartCanvas'
import { UploadButton } from '@/components/wall/UploadButton'
import type { FakePhoto } from '@/lib/fakePhotos'
import { glassPill } from '@/lib/glass'
import { deletePhoto, listPhotosWithUrls } from '@/lib/photos'
import { publishAlbumEvent } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'
import type { Album, PhotoWithUrl } from '@/lib/types'
import { uploadPhotos } from '@/lib/upload'

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
  const [heartMode, setHeartMode] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

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
    setHeartMode(false)
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
          className={`pointer-events-auto px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10 ${glassPill}`}
        >
          ← 返回
        </Link>
        <div className="pointer-events-auto flex items-center gap-3">
          <span className={`px-3 py-1.5 text-sm text-white ${glassPill}`}>
            {album.name}
          </span>
          <UploadButton pending={uploading} onFiles={(fs) => void handleUpload(fs)} />
        </div>
      </div>

      {uploadMessage && (
        <div className={`absolute bottom-4 left-1/2 z-10 -translate-x-1/2 px-4 py-2 text-sm text-white ${glassPill}`}>
          {uploadMessage}
        </div>
      )}

      {wallItems.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white/50">
          这个相册还没有照片，点右上角上传吧
        </div>
      ) : (
        <div className="h-full">
          {heartMode ? (
            <HeartCanvas photos={wallItems} autoRotateDegPerSec={autoRotate ? 6 : 0} />
          ) : (
            <PhotoWall
              photos={wallItems}
              autoRotateDegPerSec={autoRotate ? 6 : 0}
              onDeletePhoto={(id) => void handleDeletePhoto(id)}
            />
          )}
        </div>
      )}

      <Dock>
        <button
          type="button"
          aria-pressed={heartMode}
          disabled={wallItems.length === 0}
          onClick={() => setHeartMode((prev) => !prev)}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            heartMode ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'
          }`}
        >
          心形
        </button>
        <button
          type="button"
          aria-pressed={autoRotate}
          disabled={wallItems.length === 0}
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            autoRotate ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'
          }`}
        >
          自动旋转
        </button>
      </Dock>
    </div>
  )
}
