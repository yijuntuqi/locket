// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { computeDriftLayout } from '@/lib/layouts/driftGeometry'

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('matchMedia', () => ({
    matches: true, // 测试按 reduced-motion 渲染：无 rAF 循环，纯静态断言
    addEventListener() {},
    removeEventListener() {},
  }))
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(cleanup)

function makePhotos(n: number): FakePhoto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    src: 'data:image/svg+xml;utf8,<svg/>',
    caption: `照片 ${i}`,
  }))
}

describe('DriftWall 漂移墙', () => {
  it('按几何规格渲染列与瓦片，外壳带透视与渐隐 mask', async () => {
    const { DriftWall } = await import('./DriftWall')
    const { container } = render(<DriftWall photos={makePhotos(8)} />)
    const spec = computeDriftLayout(8, 1200, 800)
    expect(container.querySelectorAll('[data-testid="drift-column"]').length).toBe(spec.cols)
    expect(container.querySelectorAll('[data-testid="drift-tile"]').length).toBe(
      spec.columns.reduce((sum, c) => sum + c.tiles.length, 0)
    )
    const shell = container.firstElementChild as HTMLElement
    expect(shell.style.perspective).toBe('1200px')
    expect(shell.style.maskImage).toContain('radial-gradient')
    expect(container.querySelector('[data-testid="wall-drag-surface"]')).toBeTruthy()
  })

  it('空相册渲染零列不炸', async () => {
    const { DriftWall } = await import('./DriftWall')
    const { container } = render(<DriftWall photos={[]} />)
    expect(container.querySelectorAll('[data-testid="drift-column"]').length).toBe(0)
  })

  it('照片卡片复用画廊细框（wall-card），瓦片挂 drift-tile hover 类', async () => {
    const { DriftWall } = await import('./DriftWall')
    const { container } = render(<DriftWall photos={makePhotos(3)} />)
    expect(container.querySelector('[data-testid="wall-card"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="drift-tile"]')?.className).toContain('drift-tile')
  })
})
