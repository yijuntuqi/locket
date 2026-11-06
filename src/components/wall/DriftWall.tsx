import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { WallCard } from '@/components/wall/WallCard'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeDriftLayout, DRIFT_SPEED_PX_PER_SEC } from '@/lib/layouts/driftGeometry'

interface DriftWallProps {
  photos: FakePhoto[]
  onDeletePhoto?: (id: string) => void
}

/**
 * 漂移墙（vendor react-bits DriftWall 概念，项目 3D 约束改造）：
 * 透视瓷砖墙向上无限漂移；垂直拖拽直接拉动墙面；hover 瓦片浮起并暂停漂移；
 * 边缘双重渐隐 mask；reduced-motion 下停漂成静态透视墙。
 * 漂移偏移走 ref + 直更列容器 transform，不进 React state。
 */
export function DriftWall({ photos, onDeletePhoto }: DriftWallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const offsetRef = useRef(0)
  const lastYRef = useRef(0)
  const hoveredRef = useRef(false)
  const draggingRef = useRef(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const spec = useMemo(
    () => computeDriftLayout(photos.length, size.w || 1200, size.h || 800),
    [photos.length, size.w, size.h]
  )

  const applyOffsets = useCallback(() => {
    spec.columns.forEach((col, c) => {
      const el = columnRefs.current[c]
      if (!el) return
      const y = -(offsetRef.current % col.cycleHeightPx)
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
    })
  }, [spec])

  // 挂载/几何变化时先摆到位
  useLayoutEffect(() => {
    applyOffsets()
  }, [applyOffsets])

  useEffect(() => {
    if (reducedMotion) return undefined
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!draggingRef.current && !hoveredRef.current) {
        offsetRef.current += DRIFT_SPEED_PX_PER_SEC * dt
      }
      applyOffsets()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [applyOffsets, reducedMotion])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button,a,input')) return
    draggingRef.current = true
    setDragging(true)
    lastYRef.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      offsetRef.current -= e.clientY - lastYRef.current
      lastYRef.current = e.clientY
      applyOffsets()
    },
    [applyOffsets]
  )

  const endDrag = useCallback(() => {
    draggingRef.current = false
    setDragging(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        perspective: '1200px',
        // 双重渐隐 mask：径向 + 纵向，墙的四边融进黑暗里
        maskImage:
          'radial-gradient(ellipse 78% 82% at 50% 46%, #000 40%, transparent 100%), linear-gradient(to top, #000 40%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 78% 82% at 50% 46%, #000 40%, transparent 100%), linear-gradient(to top, #000 40%, transparent 100%)',
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }}
    >
      <div
        data-testid="wall-drag-surface"
        className={`absolute inset-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(16deg)',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {spec.columns.map((col, c) => (
          <div
            key={c}
            ref={(el) => {
              columnRefs.current[c] = el
            }}
            data-testid="drift-column"
            className="absolute top-0 will-change-transform"
            style={{
              left: `calc(50% + ${col.xPx}px)`,
              width: spec.tileWidthPx,
              marginLeft: -spec.tileWidthPx / 2,
              transformStyle: 'preserve-3d',
            }}
          >
            {col.tiles.map((photoIdx, r) => (
              <div
                key={`${photoIdx}-${r}`}
                data-testid="drift-tile"
                className="drift-tile absolute"
                style={{
                  left: 0,
                  top: r * (spec.tileHeightPx + spec.gapPx),
                  width: spec.tileWidthPx,
                  height: spec.tileHeightPx,
                  transformStyle: 'preserve-3d',
                }}
                onPointerEnter={() => {
                  hoveredRef.current = true
                }}
                onPointerLeave={() => {
                  hoveredRef.current = false
                }}
              >
                <WallCard
                  photo={photos[photoIdx]}
                  index={r}
                  widthPx={spec.tileWidthPx}
                  transform="translate(-50%, -50%)"
                  focused={false}
                  anyFocused={false}
                  onHoverChange={() => {}}
                  onDelete={onDeletePhoto}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
