import { describe, it, expect } from 'vitest'
import { computeRadius, computePlacements } from './wallGeometry'

describe('computeRadius', () => {
  it('张数多时按周长公式计算', () => {
    // 卡宽 240 + 间隙 24 = 264px；20 张 → 264*20/(2π) ≈ 840
    expect(computeRadius(20, 240, 24)).toBeCloseTo(840, 0)
  })
  it('张数少时不小于下限 320', () => {
    expect(computeRadius(2, 240, 24)).toBe(320)
  })
})

describe('computePlacements', () => {
  it('均匀分布整圆', () => {
    const p = computePlacements(4, 240, 24)
    expect(p.map((x) => x.angleDeg)).toEqual([0, 90, 180, 270])
    expect(p.every((x) => x.radiusPx === p[0].radiusPx)).toBe(true)
  })
  it('0 张返回空数组', () => {
    expect(computePlacements(0, 240, 24)).toEqual([])
  })
})
