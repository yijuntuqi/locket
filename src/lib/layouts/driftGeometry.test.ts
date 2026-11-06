// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { computeDriftLayout, DRIFT_TILE_HEIGHT, DRIFT_TILE_WIDTH, DRIFT_GAP } from './driftGeometry'

describe('computeDriftLayout 漂移墙几何', () => {
  it('空相册返回空列，不产生 NaN', () => {
    const spec = computeDriftLayout(0, 1280, 800)
    expect(spec.cols).toBe(0)
    expect(spec.columns).toEqual([])
    expect(JSON.stringify(spec)).not.toContain('NaN')
  })

  it('视口为 0 时返回空列', () => {
    expect(computeDriftLayout(5, 0, 800).columns).toEqual([])
    expect(computeDriftLayout(5, 1280, 0).columns).toEqual([])
  })

  it('列数按视口宽自适应：3–6 列封顶，且不超过照片数', () => {
    // 宽视口 + 少照片：列数受照片数约束
    expect(computeDriftLayout(2, 1920, 800).cols).toBe(2)
    expect(computeDriftLayout(1, 1920, 800).cols).toBe(1)
    // 足够照片 + 足够宽：6 列封顶
    expect(computeDriftLayout(30, 1920, 800).cols).toBe(6)
    // 窄视口：至少 3 列
    expect(computeDriftLayout(10, 400, 800).cols).toBe(3)
  })

  it('每列瓦片数是列照片数的整数倍且足以覆盖视口（无缝回绕）', () => {
    const vh = 800
    const minRows = Math.ceil((vh + DRIFT_TILE_HEIGHT * 2) / (DRIFT_TILE_HEIGHT + DRIFT_GAP))
    for (const count of [1, 2, 3, 5, 8, 13, 40]) {
      const spec = computeDriftLayout(count, 1280, vh)
      for (const col of spec.columns) {
        expect(col.tiles.length).toBeGreaterThanOrEqual(minRows)
        expect(col.tiles.length % col.photos.length).toBe(0)
        // 回绕周期覆盖视口：cycle - 一张高 ≥ 视口高
        expect(col.cycleHeightPx - DRIFT_TILE_HEIGHT).toBeGreaterThanOrEqual(vh)
      }
    }
  })

  it('照片下标全部合法且每张照片至少出现一次（每列周期内）', () => {
    const spec = computeDriftLayout(7, 1280, 800)
    const seen = new Set<number>()
    for (const col of spec.columns) {
      for (const idx of col.tiles) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(7)
        seen.add(idx)
      }
    }
    expect(seen.size).toBe(7)
  })

  it('列 x 坐标以场景中心对称分布且确定性可复现', () => {
    const a = computeDriftLayout(9, 1280, 800)
    const b = computeDriftLayout(9, 1280, 800)
    expect(a).toEqual(b)
    const xs = a.columns.map((c) => c.xPx)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeCloseTo(DRIFT_TILE_WIDTH + DRIFT_GAP)
    }
    // 偶数列时关于 0 对称
    const even = computeDriftLayout(6, 1280, 800)
    const n = even.columns.length
    for (let i = 0; i < n / 2; i++) {
      expect(even.columns[i].xPx).toBeCloseTo(-even.columns[n - 1 - i].xPx)
    }
  })
})
