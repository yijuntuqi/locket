import type { ReactNode } from 'react'
import { glassPill } from '@/lib/glass'

export function Dock({ children }: { children: ReactNode }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 px-2 py-1.5 ${glassPill} shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}
    >
      {children}
    </div>
  )
}
