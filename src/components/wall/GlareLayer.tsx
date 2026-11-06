import type { RefObject } from 'react'

interface GlareLayerProps {
  /** 光斑位置由 CSS 变量 --gx/--gy 驱动，父级通过此 ref 直更（不走 React state） */
  glareRef: RefObject<HTMLDivElement | null>
  /** 与相框白边同宽的内缩，眩光只落在相纸上不落在卡纸上 */
  insetPx: number
  /** 触屏设备周期扫光的错峰延迟 */
  sheenDelayMs: number
}

/**
 * 卡片眩光层（vendor react-bits GlareHover 核心，按项目 3D 约束改造）：
 * - 桌面（pointer:fine）：跟随光标的光斑，位置由 --gx/--gy 驱动，父级直更零重渲
 * - 触屏（无 hover）：退化为固定方向的周期扫光（沿用 sheen keyframes）
 * 自身是叶子 overlay，不参与 preserve-3d 子树。
 */
export function GlareLayer({ glareRef, insetPx, sheenDelayMs }: GlareLayerProps) {
  const insetStyle = { inset: insetPx, borderRadius: Math.max(8, insetPx * 1.6) }
  return (
    <>
      {/* 桌面：光标跟随光斑 */}
      <div
        ref={glareRef}
        data-testid="card-glare"
        aria-hidden
        className="pointer-events-none absolute hidden opacity-0 mix-blend-screen transition-opacity duration-300 pointer-fine:block"
        style={{
          ...insetStyle,
          background:
            'radial-gradient(140px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.22), transparent 70%)',
        }}
      />
      {/* 触屏：周期扫光 */}
      <div
        data-testid="card-sheen"
        aria-hidden
        className="pointer-events-none absolute mix-blend-screen pointer-fine:hidden"
        style={{
          ...insetStyle,
          backgroundImage:
            'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%)',
          backgroundSize: '250% 100%',
          animation: `sheen 7s ease-in-out ${sheenDelayMs}ms infinite`,
        }}
      />
    </>
  )
}
