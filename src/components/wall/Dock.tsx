import type { ReactNode } from 'react'

export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-1.5 backdrop-blur">
      {children}
    </div>
  )
}
