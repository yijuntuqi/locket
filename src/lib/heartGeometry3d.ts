export interface HeartPoint3D {
  x: number
  y: number
  z: number
}

/** 黄金角（弧度）： tube 截面上的均匀散开步进 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * 经典心形参数曲线（y 轴向上）：
 * x = 16·sin³t，y = 13cos t − 5cos2t − 2cos3t − cos4t
 */
export function heartCenterline(t: number): { x: number; y: number } {
  return {
    x: 16 * Math.pow(Math.sin(t), 3),
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  }
}

/**
 * 把平面爱心拓展为 3D 管状爱心：照片沿心形中心线分布，
 * 在 tube 截面上按黄金角散开（x/y 沿平面法向、z 为深度）。
 */
export function computeHeartPositions3D(
  count: number,
  tubeRadius = 3
): HeartPoint3D[] {
  const result: HeartPoint3D[] = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2
    const c = heartCenterline(t)
    const dt = 1e-4
    const c2 = heartCenterline(t + dt)
    const tx = c2.x - c.x
    const ty = c2.y - c.y
    const len = Math.hypot(tx, ty) || 1
    const nx = -ty / len
    const ny = tx / len
    const beta = i * GOLDEN_ANGLE
    result.push({
      x: c.x + nx * tubeRadius * Math.cos(beta),
      y: c.y + ny * tubeRadius * Math.cos(beta),
      z: tubeRadius * Math.sin(beta),
    })
  }
  return result
}

export interface HeartCardTransform extends HeartPoint3D {
  /** 卡片绕 Y 轴朝向角，基准为该点 tube 中心线（保证卡片垂直 tube 表面） */
  rotateYDeg: number
}

export function computeHeartCardTransforms(
  count: number,
  tubeRadius = 3
): HeartCardTransform[] {
  const positions = computeHeartPositions3D(count, tubeRadius)
  return positions.map((p, i) => {
    const t = (i / count) * Math.PI * 2
    const c = heartCenterline(t)
    return {
      ...p,
      rotateYDeg: (Math.atan2(p.x - c.x, p.z) * 180) / Math.PI,
    }
  })
}
