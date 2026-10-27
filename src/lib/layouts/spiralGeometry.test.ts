import { describe, expect, it } from 'vitest'
import { computeSpiralPlacements } from './spiralGeometry'

describe('computeSpiralPlacements', () => {
  it('数量、确定性与纵深单调', () => {
    const a = computeSpiralPlacements(20)
    const b = computeSpiralPlacements(20)
    expect(a).toEqual(b)
    expect(a).toHaveLength(20)
    for (let i = 1; i < a.length; i++) {
      expect(a[i].z).toBeLessThan(a[i - 1].z)
    }
  })

  it('角度沿螺旋推进且各自不同', () => {
    const pts = computeSpiralPlacements(16)
    const angles = new Set(pts.map((p) => p.angleDeg))
    expect(angles.size).toBe(pts.length)
  })

  it('count 为 0/1 边界', () => {
    expect(computeSpiralPlacements(0)).toEqual([])
    expect(computeSpiralPlacements(1)).toHaveLength(1)
  })

  it('坐标都是有限数', () => {
    for (const p of computeSpiralPlacements(33)) {
      expect(Number.isFinite(p.angleDeg)).toBe(true)
      expect(Number.isFinite(p.z)).toBe(true)
    }
  })
})
