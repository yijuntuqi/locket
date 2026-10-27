import { useEffect } from 'react'

/** 场景聚光：柔和光斑跟随指针（CSS 变量驱动，rAF 节流） */
export function SceneLight() {
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    let px = window.innerWidth / 2
    let py = window.innerHeight * 0.4
    const apply = () => {
      raf = 0
      root.style.setProperty('--spot-x', `${Math.round(px)}px`)
      root.style.setProperty('--spot-y', `${Math.round(py)}px`)
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      data-testid="scene-light"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20"
      style={{
        background:
          'radial-gradient(600px 420px at var(--spot-x, 50%) var(--spot-y, 40%), rgba(255,255,255,0.07), transparent 70%)',
        mixBlendMode: 'soft-light',
      }}
    />
  )
}

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

/** 漂浮尘埃：24 颗确定性散布的微粒，缓慢漂移制造空间纵深 */
export function DustMotes({ count = 24 }: { count?: number }) {
  const rand = mulberry32(11)
  const motes = Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 2 + rand() * 2,
    opacity: 0.1 + rand() * 0.2,
    duration: 14 + rand() * 12,
    delay: -rand() * 20,
  }))
  return (
    <div
      data-testid="dust-motes"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
    >
      {motes.map((m, i) => (
        <div
          key={i}
          data-testid="dust-mote"
          className="absolute rounded-full bg-white"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            animation: `dust-drift ${m.duration}s ease-in-out ${m.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
