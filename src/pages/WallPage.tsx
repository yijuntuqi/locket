import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Images, LogIn } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { ALBUM_UPDATED_EVENT } from '@/components/RealtimeListener'
import { ControlsBar } from '@/components/wall/ControlsBar'
import { WallScene } from '@/components/wall/WallScene'
import { EdgeReveal } from '@/components/wall/EdgeReveal'
import { DustMotes, SceneLight } from '@/components/wall/SceneAtmosphere'
import { SceneTitle } from '@/components/wall/SceneTitle'
import { UploadButton } from '@/components/wall/UploadButton'
import type { FakePhoto } from '@/lib/fakePhotos'
import { glassPill } from '@/lib/glass'
import { setAlbumLayout } from '@/lib/albums'
import { DEFAULT_LAYOUT, isWallLayout, type WallLayout } from '@/lib/layouts'
import { deletePhoto, listPhotosWithUrls } from '@/lib/photos'
import { publishAlbumEvent } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'
import type { Album, PhotoWithUrl } from '@/lib/types'
import { uploadPhotos } from '@/lib/upload'

export default function WallPage() {
  // owner 模式走 /album/:albumId；分享访客走 /s/:code（免登录看墙）
  const { albumId, code } = useParams<{ albumId?: string; code?: string }>()
  const routeKey = albumId ?? code
  const isShareMode = code != null
  const routeKeyRef = useRef(routeKey)
  const requestSeq = useRef(0)
  const [user, setUser] = useState<User | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [wallItems, setWallItems] = useState<FakePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [layout, setLayout] = useState<WallLayout>(DEFAULT_LAYOUT)
  const [autoRotate, setAutoRotate] = useState(true)

  // 分享访客也要知道「我是谁」：判 owner / 协作上传资格
  useEffect(() => {
    let mounted = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) setUser(data.user)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [])

  const load = useCallback(async () => {
    const key = routeKey
    if (!key) return
    const seq = ++requestSeq.current
    // 参数切换或新一轮请求开始后，旧响应一律作废
    const isStale = () => seq !== requestSeq.current || routeKeyRef.current !== key
    try {
      const { data: albumData, error: albumError } = isShareMode
        ? await supabase.from('albums').select('*').eq('share_code', key).maybeSingle()
        : await supabase.from('albums').select('*').eq('id', key).single()
      if (isStale()) return
      if (albumError) throw albumError
      if (!albumData) throw new Error('分享链接无效或已被关闭')
      setAlbum(albumData as Album)
      const loadedLayout = (albumData as Album).wall_layout
      setLayout(isWallLayout(loadedLayout) ? loadedLayout : DEFAULT_LAYOUT)

      const photoList = await listPhotosWithUrls((albumData as Album).id)
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
  }, [routeKey, isShareMode])

  useEffect(() => {
    routeKeyRef.current = routeKey
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [routeKey, load])

  useEffect(() => {
    if (!album) return
    const onUpdated = (e: Event) => {
      if ((e as CustomEvent<string>).detail === album.id) void load()
    }
    window.addEventListener(ALBUM_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(ALBUM_UPDATED_EVENT, onUpdated)
  }, [album, load])

  const isOwner = !!user && !!album && user.id === album.owner_id
  // 上传资格：owner，或相册开了协作的登录访客
  const canUpload = !!user && !!album && (isOwner || album.allow_collab_upload)

  async function handleUpload(files: File[]) {
    if (!album || !user) return
    setUploading(true)
    setUploadMessage(null)
    try {
      // 存储路径仍归档在相册 owner 名下，photos.uploader_id 记实际上传者
      const { results, failures } = await uploadPhotos(album.id, album.owner_id, files, user.id)
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
    if (!user || (!isOwner && target.uploader_id !== user.id)) {
      toast.error('只能删除自己上传的照片')
      return
    }
    try {
      await deletePhoto(target)
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      setWallItems((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleLayoutChange(next: WallLayout) {
    if (!album) return
    const previous = layout
    setLayout(next)
    // 访客只调自己的视图，不改相册设置
    if (!isOwner) return
    try {
      await setAlbumLayout(album.id, next)
    } catch (err) {
      setLayout(previous)
      toast.error(err instanceof Error ? err.message : '布局保存失败')
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
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <SceneLight />
      <DustMotes />
      <EdgeReveal edge="top">
        <div className="flex items-center justify-between p-4">
          {user ? (
            <Link
              to="/"
              className={`px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10 ${glassPill}`}
            >
              ← 返回
            </Link>
          ) : (
            <Link
              to={`/login?next=${encodeURIComponent(`/s/${code ?? ''}`)}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10 ${glassPill}`}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              登录
            </Link>
          )}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm text-white ${glassPill}`}>
              {album.name}
            </span>
            {canUpload && (
              <UploadButton pending={uploading} onFiles={(fs) => void handleUpload(fs)} />
            )}
          </div>
        </div>
      </EdgeReveal>

      {uploadMessage && (
        <div className={`absolute bottom-4 left-1/2 z-10 -translate-x-1/2 px-4 py-2 text-sm text-white ${glassPill}`}>
          {uploadMessage}
        </div>
      )}

      {wallItems.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <Images className="h-10 w-10 text-white/25" aria-hidden />
          <p className="font-display text-2xl font-semibold text-white/80">
            这个相册还没有照片
          </p>
          <p className="text-sm text-white/50">
            {canUpload ? '传几张进来，让墙上有点回忆' : '等第一张照片装进这里'}
          </p>
          {canUpload && (
            <UploadButton pending={uploading} onFiles={(fs) => void handleUpload(fs)} />
          )}
        </div>
      ) : (
        <div className="h-full">
          <SceneTitle name={album.name} photoCount={wallItems.length} />
          <WallScene
            layout={layout}
            photos={wallItems}
            autoRotateDegPerSec={autoRotate ? 6 : 0}
            onDeletePhoto={canUpload ? (id) => void handleDeletePhoto(id) : undefined}
          />
        </div>
      )}

      <ControlsBar
        currentLayout={layout}
        onLayoutChange={(next) => void handleLayoutChange(next)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        disabled={wallItems.length === 0}
        autoRotateDisabled={layout === 'drift'}
      />
    </div>
  )
}
