import { lazy, Suspense, useEffect, useState } from 'react'

const Aurora = lazy(() => import('@/components/Aurora'))

export function Backdrop() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1200px 800px at 20% 10%, rgba(56,89,199,0.35), transparent 60%),' +
            ' radial-gradient(1000px 700px at 80% 90%, rgba(120,40,160,0.3), transparent 60%),' +
            ' #05070f',
        }}
      />
    )
  }

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <Suspense fallback={<div className="h-full w-full bg-slate-950" />}>
        <Aurora
          colorStops={['#3A29FF', '#FF94B4', '#FF3232']}
          speed={0.5}
          className="h-full w-full"
        />
      </Suspense>
    </div>
  )
}
