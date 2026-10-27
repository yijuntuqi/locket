import { useEffect, useState, type FormEvent } from 'react'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-72 space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-5"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <input
          aria-label="相册名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给相册起个名字（50 字内）"
          maxLength={50}
          autoFocus
          className="w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
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
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
          >
            {pending ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
