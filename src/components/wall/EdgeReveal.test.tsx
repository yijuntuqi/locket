// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { EdgeReveal } from './EdgeReveal'

const defaultMatchMedia = (query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  addEventListener() {},
  removeEventListener() {},
})

beforeEach(() => {
  vi.stubGlobal('matchMedia', defaultMatchMedia)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderReveal(edge: 'top' | 'bottom') {
  return render(
    <EdgeReveal edge={edge}>
      <button type="button">控制按钮</button>
    </EdgeReveal>
  )
}

describe('EdgeReveal', () => {
  it('初始隐藏，指针进入触发条浮现，离开面板后延时隐藏', async () => {
    const { container, getByRole } = renderReveal('top')
    expect(container.querySelector('[data-testid="edge-reveal-top"]')).toBeTruthy()

    const panel = getByRole('button', { name: '控制按钮' }).parentElement as HTMLElement
    expect(panel.className).toContain('opacity-0')
    expect(panel.className).toContain('-translate-y-full')

    const strip = getByRole('button', { name: '显示控制栏' })
    fireEvent.pointerEnter(strip)
    expect(panel.className).toContain('opacity-100')
    expect(panel.className).toContain('translate-y-0')

    fireEvent.pointerLeave(panel)
    await vi.waitFor(
      () => {
        expect(panel.className).toContain('opacity-0')
      },
      { timeout: 1500 }
    )
  })

  it('edge=bottom 隐藏时向下位移', () => {
    const { getByRole } = renderReveal('bottom')
    const panel = getByRole('button', { name: '控制按钮' }).parentElement as HTMLElement
    expect(panel.className).toContain('translate-y-full')
  })

  it('触屏（hover:none）点击触发条切换显示', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: none'),
      addEventListener() {},
      removeEventListener() {},
    }))
    const { getByRole } = renderReveal('top')
    const panel = getByRole('button', { name: '控制按钮' }).parentElement as HTMLElement
    const strip = getByRole('button', { name: '显示控制栏' })

    fireEvent.click(strip)
    expect(panel.className).toContain('opacity-100')
    fireEvent.click(strip)
    expect(panel.className).toContain('opacity-0')
  })
})
