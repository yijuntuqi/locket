// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(cleanup)

function makePhotos(n: number): FakePhoto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    src: 'data:image/svg+xml;utf8,<svg/>',
    caption: `照片 ${i}`,
  }))
}

describe('SphereWall', () => {
  it('渲染全部照片，容器带透视与 3D 拖拽面', async () => {
    const { SphereWall } = await import('./SphereWall')
    const { container } = render(
      <SphereWall photos={makePhotos(6)} autoRotateDegPerSec={0} />
    )
    const imgs = container.querySelectorAll('img:not([aria-hidden="true"])')
    expect(imgs.length).toBe(6)
    expect((container.firstElementChild as HTMLElement).style.perspective).toBe('1200px')
    expect(container.querySelector('[data-testid="wall-drag-surface"]')).toBeTruthy()
  })
})

describe('ScatterWall', () => {
  it('渲染全部照片，卡片带旋转与浮动动画', async () => {
    const { ScatterWall } = await import('./ScatterWall')
    const { container } = render(
      <ScatterWall photos={makePhotos(5)} autoRotateDegPerSec={0} />
    )
    const imgs = container.querySelectorAll('img:not([aria-hidden="true"])')
    expect(imgs.length).toBe(5)
    const card = imgs[0].closest('[data-testid="scatter-card"]') as HTMLElement
    expect(card.style.animation).toContain('float-drift')
  })
})

describe('SpiralWall', () => {
  it('渲染全部照片，容器带透视', async () => {
    const { SpiralWall } = await import('./SpiralWall')
    const { container } = render(
      <SpiralWall photos={makePhotos(7)} autoRotateDegPerSec={0} />
    )
    const imgs = container.querySelectorAll('img:not([aria-hidden="true"])')
    expect(imgs.length).toBe(7)
    expect((container.firstElementChild as HTMLElement).style.perspective).toBe('1100px')
  })
})

describe('WallScene 分发', () => {
  it('layout=scatter 渲染散落墙，未知值回退圆柱墙', async () => {
    const { WallScene } = await import('./WallScene')
    const { container, unmount } = render(
      <WallScene layout="scatter" photos={makePhotos(4)} autoRotateDegPerSec={0} />
    )
    expect(container.querySelectorAll('[data-testid="scatter-card"]').length).toBe(4)
    unmount()

    const { container: c2 } = render(
      <WallScene layout={'hack' as never} photos={makePhotos(3)} autoRotateDegPerSec={0} />
    )
    expect(c2.querySelector('[data-testid="wall-drag-surface"]')).toBeTruthy()
    expect(c2.querySelectorAll('[data-testid="scatter-card"]').length).toBe(0)
  })
})
