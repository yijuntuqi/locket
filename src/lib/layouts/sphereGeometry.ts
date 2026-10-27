export interface SpherePoint {
  x: number
  y: number
  z: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** 斐波那契球面分布：照片均匀贴满球面，整球可拖拽旋转 */
export function computeSpherePlacements(count: number, radius = 1): SpherePoint[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0, z: radius }]
  const points: SpherePoint[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const y = 1 - 2 * t
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * i
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    })
  }
  return points
}
