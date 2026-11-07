import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Link2, Share2 } from 'lucide-react'
import {
  setAlbumCollabUpload,
  setAlbumSharing,
} from '@/lib/albums'
import { glassPanel } from '@/lib/glass'
import type { Album } from '@/lib/types'

interface ShareDialogProps {
  album: Album
  /** 分享状态变化后通知列表刷新 */
  onChanged: () => void
  onClose: () => void
}

/** 玻璃开关：滑块 + 轨道 */
function Toggle({
  on,
  disabled,
  onToggle,
  label,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
        on ? 'border-gilt/60 bg-gilt/40' : 'border-white/15 bg-white/10'
      }`}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow transition-transform"
        style={{ height: 18, width: 18, transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

/** 分享弹窗：生成/关闭 /s/{code} 链接 + 访客协作上传开关 */
export function ShareDialog({ album, onChanged, onClose }: ShareDialogProps) {
  const [shared, setShared] = useState(album.share_code != null)
  const [code, setCode] = useState(album.share_code)
  const [collab, setCollab] = useState(album.allow_collab_upload)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const shareUrl = code ? `${window.location.origin}/s/${code}` : ''

  async function handleToggleSharing() {
    setBusy(true)
    try {
      const next = !shared
      const nextCode = await setAlbumSharing(album.id, next)
      setShared(next)
      setCode(nextCode)
      setCopied(false)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleCollab() {
    setBusy(true)
    try {
      const next = !collab
      await setAlbumCollabUpload(album.id, next)
      setCollab(next)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('链接已复制')
    } catch {
      toast.error('复制失败，请手动选中链接复制')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        data-testid="dialog-panel"
        className={`w-80 space-y-4 p-6 ${glassPanel}`}
        style={{ animation: 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gilt" aria-hidden />
          <h2 className="font-display text-lg font-bold text-white">分享相册</h2>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white">链接分享</p>
            <p className="text-xs text-white/50">拿到链接的人无需登录即可查看</p>
          </div>
          <Toggle
            on={shared}
            disabled={busy}
            onToggle={() => void handleToggleSharing()}
            label="开关链接分享"
          />
        </div>

        {shared && code && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden />
                <span className="truncate text-xs text-white/70">{shareUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-[#f8ecd2] to-gilt px-3 py-2 text-xs font-semibold text-[#3a2c12] disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {copied ? '已复制' : '复制'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">允许访客上传</p>
                <p className="text-xs text-white/50">对方需登录后才能往相册传照片</p>
              </div>
              <Toggle
                on={collab}
                disabled={busy}
                onToggle={() => void handleToggleCollab()}
                label="开关访客上传"
              />
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
