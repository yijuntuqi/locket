import { useEffect, useRef, useState } from 'react'
import { stepRotation, type RotationState } from '@/lib/rotationPhysics'

interface UsePhotoWallRotationOptions {
  autoRotateDegPerSec?: number
  inertiaHalfLifeSec?: number
  /** 外部引用：每帧写入当前角度（导出 Canvas 重绘用） */
  externalAngleRef?: { current: number }
}

export function usePhotoWallRotation(opts: UsePhotoWallRotationOptions = {}) {
  const autoRotateDegPerSec = opts.autoRotateDegPerSec ?? 6
  const inertiaHalfLifeSec = opts.inertiaHalfLifeSec ?? 0.8
  const externalAngleRef = opts.externalAngleRef

  const [angleDeg, setAngleDeg] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const stateRef = useRef<RotationState>({ angleDeg: 0, velocityDegPerSec: 0 })
  const dragRef = useRef<{
    pointerId: number
    lastX: number
    lastT: number
  } | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mql.matches
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!dragRef.current) {
        const auto = reducedMotionRef.current ? 0 : autoRotateDegPerSec
        stateRef.current = stepRotation(stateRef.current, dt, auto, inertiaHalfLifeSec)
        setAngleDeg(stateRef.current.angleDeg)
        if (externalAngleRef) externalAngleRef.current = stateRef.current.angleDeg
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoRotateDegPerSec, inertiaHalfLifeSec, externalAngleRef])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 只响应主键（左键/单指），右键等辅助键交给组件自身菜单逻辑
    if (e.button !== 0) return
    // 交互控件（删除按钮等）上的按下不启动拖拽，否则会因指针捕获吞掉 click/contextmenu
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select, [data-no-drag]')) return
    if (dragRef.current) return
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastT: performance.now(),
    }
    stateRef.current = { ...stateRef.current, velocityDegPerSec: 0 }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    const now = performance.now()
    const dx = e.clientX - drag.lastX
    const dt = Math.max((now - drag.lastT) / 1000, 1e-3)
    // 向左拖（dx<0）→ 墙正转
    const deltaDeg = -dx
    stateRef.current = {
      angleDeg: stateRef.current.angleDeg + deltaDeg,
      velocityDegPerSec: deltaDeg / dt,
    }
    setAngleDeg(stateRef.current.angleDeg)
    drag.lastX = e.clientX
    drag.lastT = now
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (reducedMotionRef.current) {
      stateRef.current = { ...stateRef.current, velocityDegPerSec: 0 }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return {
    angleDeg,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  }
}
