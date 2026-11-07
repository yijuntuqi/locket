import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Images, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { AlbumDialog } from '@/components/albums/AlbumDialog'
import { ShareDialog } from '@/components/albums/ShareDialog'
import { ALBUMS_CHANGED_EVENT } from '@/components/RealtimeListener'
import {
  createAlbum,
  deleteAlbum,
  listAlbumsWithSummaries,
  renameAlbum,
  ValidationError,
  type AlbumWithSummary,
} from '@/lib/albums'
import { glassPanel, glassPill } from '@/lib/glass'
import { publishAlbumEvent } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'

type DialogState =
  | { mode: 'create' }
  | { mode: 'rename'; album: AlbumWithSummary }
  | null

/** 入场 stagger：70ms/张，封顶 560ms */
function enterDelayFor(i: number): number {
  return Math.min(i * 70, 560)
}

/** 相册封面的光标跟随眩光：位置写 CSS 变量（--gx/--gy/--go），overlay 继承消费 */
function trackGlare(e: PointerEvent<HTMLElement>, active: boolean) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  el.style.setProperty('--gx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
  el.style.setProperty('--gy', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  el.style.setProperty('--go', active ? '1' : '0')
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AlbumWithSummary | null>(null)
  const [shareAlbum, setShareAlbum] = useState<AlbumWithSummary | null>(null)

  const refresh = useCallback(async () => {
    try {
      setAlbums(await listAlbumsWithSummaries())
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '相册加载失败')
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    const onChanged = () => void refresh()
    window.addEventListener(ALBUMS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(ALBUMS_CHANGED_EVENT, onChanged)
  }, [refresh])

  // 纪念日：以账号创建日为起点，「吊坠盒已陪伴 N 天」
  const [anniversaryDays, setAnniversaryDays] = useState<number | null>(null)
  useEffect(() => {
    let mounted = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted || !data.user?.created_at) return
        const days =
          Math.floor((Date.now() - new Date(data.user.created_at).getTime()) / 86_400_000) + 1
        if (days > 0) setAnniversaryDays(days)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(name: string) {
    if (!dialog) return
    setDialogError(null)
    setPending(true)
    try {
      if (dialog.mode === 'create') {
        const album = await createAlbum(name)
        toast.success(`相册「${album.name}」建好啦`)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          void publishAlbumEvent(user.id, {
            type: 'album-created',
            albumId: album.id,
            albumName: album.name,
          }).catch(() => undefined)
        }
      } else {
        await renameAlbum(dialog.album.id, name)
      }
      setDialog(null)
      await refresh()
    } catch (err) {
      setDialogError(
        err instanceof ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : '保存失败，请重试'
      )
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(album: AlbumWithSummary) {
    setPending(true)
    try {
      await deleteAlbum(album)
      setAlbums((prev) => prev.filter((a) => a.id !== album.id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '删除失败，请重试')
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        加载中…
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display-gradient font-display text-4xl font-black tracking-wide">
              我的相册
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {anniversaryDays != null
                ? `这个吊坠盒已陪伴你 ${anniversaryDays} 天`
                : '把回忆装进吊坠盒'}
            </p>
          </div>
          <button
            onClick={() => {
              setDialogError(null)
              setDialog({ mode: 'create' })
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 ${glassPill}`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            新建相册
          </button>
        </div>

        {loadError && <p className="mb-4 text-sm text-red-400">{loadError}</p>}

        {albums.length === 0 && !loadError ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Images className="h-10 w-10 text-white/25" aria-hidden />
            <p className="font-display text-2xl font-semibold text-white/80">还没有相册</p>
            <p className="text-sm text-white/50">建第一个相册，装进你们的照片</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-5 md:grid-cols-3">
            {albums.map((album, i) => (
              <li
                key={album.id}
                data-testid="page-enter"
                style={{
                  animation: 'fade-blur-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
                  animationDelay: `${enterDelayFor(i)}ms`,
                }}
              >
                <div
                  className={`group relative overflow-hidden transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${glassPanel}`}
                  onPointerMove={(e) => trackGlare(e, true)}
                  onPointerLeave={(e) => trackGlare(e, false)}
                >
                  {/* 光标跟随眩光（位置走 CSS 变量继承） */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 opacity-[var(--go,0)] mix-blend-screen transition-opacity duration-300"
                    style={{
                      background:
                        'radial-gradient(180px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.18), transparent 70%)',
                    }}
                  />
                  <Link to={`/album/${album.id}`} className="block" aria-label={`打开相册 ${album.name}`}>
                    <div className="relative aspect-[3/4] bg-gradient-to-br from-indigo-950/60 via-slate-900/40 to-slate-950">
                      {album.coverUrl ? (
                        <img
                          src={album.coverUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Images className="h-9 w-9 text-white/15" aria-hidden />
                        </div>
                      )}
                      {/* 底部渐隐把名字托出来 */}
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h2 className="font-display text-xl font-bold text-white">
                          {album.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-white/60">
                          {album.photoCount} 张照片
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-end gap-1 px-3 py-2">
                    <button
                      onClick={() => setShareAlbum(album)}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                      分享
                    </button>
                    <button
                      onClick={() => {
                        setDialogError(null)
                        setDialog({ mode: 'rename', album })
                      }}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      重命名
                    </button>
                    <button
                      onClick={() => setConfirmDelete(album)}
                      disabled={pending}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-red-300/70 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <AlbumDialog
          title={dialog.mode === 'create' ? '新建相册' : '重命名相册'}
          initialName={dialog.mode === 'rename' ? dialog.album.name : ''}
          pending={pending}
          error={dialogError}
          onSubmit={(name) => void handleSubmit(name)}
          onClose={() => setDialog(null)}
        />
      )}

      {shareAlbum && (
        <ShareDialog
          album={shareAlbum}
          onChanged={() => void refresh()}
          onClose={() => setShareAlbum(null)}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            data-testid="dialog-panel"
            className={`w-72 space-y-4 p-5 ${glassPanel}`}
            style={{ animation: 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white">
              确认删除相册「{confirmDelete.name}」？里面的照片会一并删除，不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-md px-3 py-2 text-sm text-white/60 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const target = confirmDelete
                  setConfirmDelete(null)
                  void handleDelete(target)
                }}
                className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
