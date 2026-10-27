import { describe, expect, it } from 'vitest'
import { computeHeartPositions3D, heartCenterline } from './heartGeometry3d'

describe('heartCenterline', () => {
  it('t=0 是爱心顶部的凹陷处，t=π 是底部尖端', () => {
    const top = heartCenterline(0)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(5)

    const bottom = heartCenterline(Math.PI)
    expect(bottom.x).toBeCloseTo(0)
    expect(bottom.y).toBeCloseTo(-17)
  })

  it('左右对称：f(t) 与 f(-t) 的 x 互为相反数、y 相等', () => {
    for (const t of [0.3, 1.1, 2.2]) {
      const a = heartCenterline(t)
      const b = heartCenterline(-t)
      expect(a.x).toBeCloseTo(-b.x)
      expect(a.y).toBeCloseTo(b.y)
    }
  })
})

describe('computeHeartPositions3D', () => {
  it('count 为 0 返回空数组，否则数量一致且确定性', () => {
    expect(computeHeartPositions3D(0)).toEqual([])
    const a = computeHeartPositions3D(12, 3)
    const b = computeHeartPositions3D(12, 3)
    expect(a).toHaveLength(12)
    expect(a).toEqual(b)
  })

  it('所有点都在管表面上：到中心线的距离 ≈ tubeRadius', () => {
    const tubeRadius = 3
    const positions = computeHeartPositions3D(24, tubeRadius)
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      // z 分量 |sinβ|·r ≤ r
      expect(Math.abs(p.z)).toBeLessThanOrEqual(tubeRadius + 1e-9)
      // 与中心线的平面距离 = r·|cosβ|
      const t = (i / positions.length) * Math.PI * 2
      const c = heartCenterline(t)
      const planarDist = Math.hypot(p.x - c.x, p.y - c.y)
      const total = Math.hypot(p.x - c.x, p.y - c.y, p.z)
      expect(total).toBeCloseTo(tubeRadius, 5)
      expect(planarDist).toBeLessThanOrEqual(tubeRadius + 1e-9)
    }
  })

  it('z 坐标有正有负（ tube 两侧都有照片，呈 3D 分布）', () => {
    const positions = computeHeartPositions3D(16, 3)
    expect(positions.some((p) => p.z > 0.5)).toBe(true)
    expect(positions.some((p) => p.z < -0.5)).toBe(true)
  })
})

describe('computeHeartCardTransforms', () => {
  it('rotateYDeg 以 tube 中心线为基准（卡片垂直 tube 表面）', async () => {
    const { computeHeartCardTransforms } = await import('./heartGeometry3d')
    const transforms = computeHeartCardTransforms(16, 3)
    expect(transforms).toHaveLength(16)
    const positions = computeHeartPositions3D(16, 3)
    for (let i = 0; i < transforms.length; i++) {
      const t = (i / transforms.length) * Math.PI * 2
      const c = heartCenterline(t)
      const expected = (Math.atan2(positions[i].x - c.x, positions[i].z) * 180) / Math.PI
      expect(transforms[i].rotateYDeg).toBeCloseTo(expected, 5)
    }
  })
})
