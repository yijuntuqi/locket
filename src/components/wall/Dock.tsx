import type { ReactNode } from 'react'
import { glassPill } from '@/lib/glass'

/** 浮动控制栏（定位由外层 EdgeReveal 面板负责） */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 ${glassPill} shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}
    >
      {children}
    </div>
  )
}
