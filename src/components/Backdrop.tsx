import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'

const Aurora = lazy(() => import('@/components/Aurora'))

/** 确定性伪随机（星星布局，避免每次渲染闪烁） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function starfieldStyle(): CSSProperties {
  const rand = mulberry32(7)
  const layers: string[] = []
  for (let layer = 0; layer < 3; layer++) {
    const count = 40 + layer * 20
    const size = 1 + layer * 0.5
    const alpha = 0.5 - layer * 0.12
    for (let i = 0; i < count; i++) {
      const x = Math.round(rand() * 1000) / 10
      const y = Math.round(rand() * 1000) / 10
      layers.push(
        `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${alpha}), transparent 70%)`
      )
    }
  }
  return { backgroundImage: layers.join(',') }
}

function Starfield() {
  return (
    <div
      data-testid="starfield"
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={starfieldStyle()}
    />
  )
}

function Vignette() {
  return (
    <div
      data-testid="vignette"
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(2,3,10,0.55) 100%)',
      }}
    />
  )
}

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
            ' #05060f',
        }}
      >
        <Starfield />
        <Vignette />
      </div>
    )
  }

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#05060f]">
      {/* 底层：底部升起的蓝紫光带，慢速 */}
      <Suspense fallback={null}>
        <Aurora
          colorStops={['#1e1b4b', '#6d28d9', '#0e7490']}
          direction="bottom"
          speed={0.35}
          opacity={0.9}
          layers={2}
          className="absolute inset-x-0 bottom-0 h-[70%] w-full"
        />
      </Suspense>
      {/* 顶层：粉紫极光帘，稍快，制造视差 */}
      <Suspense fallback={null}>
        <Aurora
          colorStops={['#3A29FF', '#FF94B4', '#FF3232']}
          direction="top"
          speed={0.55}
          opacity={0.65}
          layers={2}
          className="absolute inset-x-0 top-0 h-[55%] w-full"
        />
      </Suspense>
      <Starfield />
      <Vignette />
    </div>
  )
}
