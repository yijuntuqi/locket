import { describe, expect, it } from 'vitest'
import { computeSpherePlacements } from './sphereGeometry'

describe('computeSpherePlacements', () => {
  it('count 边界：0 返回空，1 返回正前方单点', () => {
    expect(computeSpherePlacements(0)).toEqual([])
    const one = computeSpherePlacements(1, 300)
    expect(one).toEqual([{ x: 0, y: 0, z: 300 }])
  })

  it('所有点都在球面上（|p| = radius）且确定性', () => {
    const a = computeSpherePlacements(30, 250)
    const b = computeSpherePlacements(30, 250)
    expect(a).toEqual(b)
    expect(a).toHaveLength(30)
    for (const p of a) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(250, 5)
    }
  })

  it('点在球面上均匀分布（无 NaN、坐标有正有负）', () => {
    const pts = computeSpherePlacements(40, 200)
    expect(pts.some((p) => p.x > 0)).toBe(true)
    expect(pts.some((p) => p.x < 0)).toBe(true)
    expect(pts.some((p) => p.y > 0)).toBe(true)
    expect(pts.some((p) => p.y < 0)).toBe(true)
    expect(pts.some((p) => p.z < 0)).toBe(true)
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
      expect(Number.isFinite(p.z)).toBe(true)
    }
  })
})
