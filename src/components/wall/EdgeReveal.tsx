import { useEffect, useRef, useState, type ReactNode } from 'react'

interface EdgeRevealProps {
  edge: 'top' | 'bottom'
  children: ReactNode
}

const HIDE_DELAY_MS = 600

/**
 * 触边浮现控制层：默认隐藏，指针进入屏幕顶/底触发条时毛玻璃面板滑入，
 * 离开面板 600ms 后滑出。触屏设备（hover:none）改为常驻半透明手柄 + 点按切换。
 */
export function EdgeReveal({ edge, children }: EdgeRevealProps) {
  const [touchMode, setTouchMode] = useState(false)
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTouchMode(window.matchMedia('(hover: none)').matches)
  }, [])

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    []
  )

  const show = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
    setVisible(true)
  }

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS)
  }

  const hiddenTransform = edge === 'top' ? '-translate-y-full' : 'translate-y-full'

  return (
    <div
      data-testid={`edge-reveal-${edge}`}
      className={`pointer-events-none fixed inset-x-0 z-30 ${edge === 'top' ? 'top-0' : 'bottom-0'}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="显示控制栏"
        className={`pointer-events-auto absolute inset-x-0 z-10 ${edge === 'top' ? 'top-0' : 'bottom-0'} h-3 ${
          touchMode
            ? 'cursor-pointer bg-gradient-to-r from-transparent via-white/15 to-transparent'
            : ''
        }`}
        onPointerEnter={touchMode ? undefined : show}
        onClick={touchMode ? () => setVisible((v) => !v) : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setVisible((v) => !v)
          }
        }}
      />
      <div
        data-testid={`edge-reveal-panel-${edge}`}
        className={`pointer-events-auto transition-all duration-500 ease-out ${
          visible ? 'translate-y-0 opacity-100' : `${hiddenTransform} opacity-0`
        }`}
        style={{
          visibility: visible ? 'visible' : 'hidden',
          transition:
            'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease, visibility 0s linear ' +
            (visible ? '0s' : '0.45s'),
        }}
        onPointerEnter={touchMode ? undefined : show}
        onPointerLeave={touchMode ? undefined : scheduleHide}
        onClick={touchMode ? () => setVisible(false) : undefined}
      >
        {children}
      </div>
    </div>
  )
}
