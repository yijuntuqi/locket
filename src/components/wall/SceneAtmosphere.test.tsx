// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DustMotes, SceneLight } from './SceneAtmosphere'

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

describe('SceneLight', () => {
  it('渲染跟随指针的聚光遮罩', () => {
    const { container } = render(<SceneLight />)
    const el = container.querySelector('[data-testid="scene-light"]') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.style.background).toContain('--spot-x')
    expect(el.className).toContain('pointer-events-none')
  })
})

describe('DustMotes', () => {
  it('渲染 24 颗确定性散布的尘埃，带漂移动画', () => {
    const { container } = render(<DustMotes />)
    const motes = container.querySelectorAll('[data-testid="dust-mote"]')
    expect(motes.length).toBe(24)
    for (const m of motes) {
      expect((m as HTMLElement).style.animation).toContain('dust-drift')
    }
    // 确定性：两次渲染位置一致
    const first = [...motes].map((m) => (m as HTMLElement).style.left)
    cleanup()
    const { container: c2 } = render(<DustMotes />)
    const second = [...c2.querySelectorAll('[data-testid="dust-mote"]')].map(
      (m) => (m as HTMLElement).style.left
    )
    expect(first).toEqual(second)
  })
})
