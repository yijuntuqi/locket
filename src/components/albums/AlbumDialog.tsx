import { useEffect, useState, type FormEvent } from 'react'
import { glassPanel } from '@/lib/glass'

interface AlbumDialogProps {
  title: string
  initialName?: string
  pending: boolean
  error: string | null
  onSubmit: (name: string) => void
  onClose: () => void
}

export function AlbumDialog({
  title,
  initialName = '',
  pending,
  error,
  onSubmit,
  onClose,
}: AlbumDialogProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        data-testid="dialog-panel"
        className={`w-72 space-y-4 p-5 ${glassPanel}`}
        style={{ animation: 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <h2 className="font-display text-lg font-bold tracking-wide text-white">{title}</h2>
        <input
          aria-label="相册名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给相册起个名字（50 字内）"
          maxLength={50}
          autoFocus
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-white/60 hover:text-white"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gradient-to-b from-[#f8ecd2] to-gilt px-3 py-2 text-sm font-semibold text-[#3a2c12] shadow-[0_4px_16px_rgba(232,201,138,0.25)] disabled:opacity-50"
          >
            {pending ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
