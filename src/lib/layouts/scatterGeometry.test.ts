import { describe, expect, it } from 'vitest'
import { computeScatterPlacements } from './scatterGeometry'

describe('computeScatterPlacements', () => {
  it('数量与确定性', () => {
    const a = computeScatterPlacements(12, 1200, 800)
    const b = computeScatterPlacements(12, 1200, 800)
    expect(a).toEqual(b)
    expect(a).toHaveLength(12)
    expect(computeScatterPlacements(0, 1200, 800)).toEqual([])
  })

  it('所有落点在画布内', () => {
    const pts = computeScatterPlacements(20, 1000, 700)
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1000)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(700)
    }
  })

  it('点间保持最小间距（拒绝采样防重叠）', () => {
    const pts = computeScatterPlacements(10, 1400, 900)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        expect(d).toBeGreaterThan(90)
      }
    }
  })

  it('旋转角与缩放有限且带漂移延迟', () => {
    const pts = computeScatterPlacements(8, 1200, 800)
    for (const p of pts) {
      expect(Math.abs(p.rotateDeg)).toBeLessThanOrEqual(15)
      expect(p.scale).toBeGreaterThanOrEqual(0.8)
      expect(p.scale).toBeLessThanOrEqual(1.25)
      expect(p.driftDelayMs).toBeGreaterThanOrEqual(0)
    }
  })
})
