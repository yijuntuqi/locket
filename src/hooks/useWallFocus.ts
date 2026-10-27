import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 各照片墙布局通用的 hover 聚焦逻辑：
 * 聚焦时暂停自转，DoF 变暗其余卡片；reduced-motion 下完全不触发。
 */
export function useWallFocus(setPaused: (paused: boolean) => void) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    setPaused(focusedId !== null)
    return () => setPaused(false)
  }, [focusedId, setPaused])

  const handleHoverChange = useCallback((id: string, active: boolean) => {
    if (reducedMotionRef.current) return
    setFocusedId((prev) => (active ? id : prev === id ? null : prev))
  }, [])

  return { focusedId, anyFocused: focusedId !== null, handleHoverChange }
}
