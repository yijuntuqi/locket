import { useRef, type ChangeEvent } from 'react'
import { glassPill } from '@/lib/glass'

interface UploadButtonProps {
  pending: boolean
  onFiles: (files: File[]) => void
}

export function UploadButton({ pending, onFiles }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > 0) onFiles(files)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="选择照片"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={`px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-50 ${glassPill}`}
      >
        {pending ? '上传中…' : '上传照片'}
      </button>
    </>
  )
}
