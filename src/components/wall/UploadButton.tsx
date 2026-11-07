import { useRef, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { glassPill } from '@/lib/glass'

interface UploadButtonProps {
  pending: boolean
  onFiles: (files: File[]) => void
}

/** 相册页主行动按钮：鎏金渐变（玻璃 pill 打底），空状态与顶栏共用 */
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
        className={`flex items-center gap-1.5 bg-gradient-to-b from-[#f8ecd2] to-gilt px-4 py-2 text-sm font-semibold text-[#3a2c12] shadow-[0_4px_16px_rgba(232,201,138,0.25)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,201,138,0.35)] disabled:opacity-50 ${glassPill}`}
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
        {pending ? '上传中…' : '上传照片'}
      </button>
    </>
  )
}
