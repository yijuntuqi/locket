import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlbumDialog } from '@/components/albums/AlbumDialog'
import { ALBUMS_CHANGED_EVENT } from '@/components/RealtimeListener'
import {
  createAlbum,
  deleteAlbum,
  listAlbums,
  renameAlbum,
  ValidationError,
} from '@/lib/albums'
import { glassPanel } from '@/lib/glass'
import { publishAlbumEvent } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'
import type { Album } from '@/lib/types'

type DialogState =
  | { mode: 'create' }
  | { mode: 'rename'; album: Album }
  | null

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Album | null>(null)

  const refresh = useCallback(async () => {
    try {
      setAlbums(await listAlbums())
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

  async function handleDelete(album: Album) {
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
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">我的相册</h1>
          <button
            onClick={() => {
              setDialogError(null)
              setDialog({ mode: 'create' })
            }}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900"
          >
            新建相册
          </button>
        </div>

        {loadError && <p className="mb-4 text-sm text-red-400">{loadError}</p>}

        {albums.length === 0 && !loadError ? (
          <p className="text-white/50">还没有相册，点右上角新建一个吧</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {albums.map((album) => (
              <li key={album.id} className={`p-4 transition-colors hover:bg-white/10 ${glassPanel}`}>
                <Link
                  to={`/album/${album.id}`}
                  className="block text-lg font-medium text-white hover:underline"
                >
                  {album.name}
                </Link>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setDialogError(null)
                      setDialog({ mode: 'rename', album })
                    }}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    重命名
                  </button>
                  <button
                    onClick={() => setConfirmDelete(album)}
                    disabled={pending}
                    className="text-sm text-red-400/80 hover:text-red-300 disabled:opacity-50"
                  >
                    删除
                  </button>
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

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className={`w-72 space-y-4 p-5 ${glassPanel}`}
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
