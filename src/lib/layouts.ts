/** 照片墙布局市场：新增布局在此注册（id 与 DB wall_layout 白名单一致） */
export type WallLayout = 'cylinder' | 'sphere' | 'scatter' | 'spiral'

export const WALL_LAYOUTS: { id: WallLayout; label: string }[] = [
  { id: 'cylinder', label: '圆柱墙' },
  { id: 'sphere', label: '球形展厅' },
  { id: 'scatter', label: '散落拍立得' },
  { id: 'spiral', label: '螺旋隧道' },
]

export const DEFAULT_LAYOUT: WallLayout = 'cylinder'

export function isWallLayout(value: unknown): value is WallLayout {
  return typeof value === 'string' && WALL_LAYOUTS.some((l) => l.id === value)
}

export function layoutLabel(layout: WallLayout): string {
  return WALL_LAYOUTS.find((l) => l.id === layout)?.label ?? DEFAULT_LAYOUT
}
