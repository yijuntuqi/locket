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

    const panel = container.querySelector('[data-testid="edge-reveal-panel-top"]') as HTMLElement
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
    const { container } = renderReveal('bottom')
    const panel = container.querySelector('[data-testid="edge-reveal-panel-bottom"]') as HTMLElement
    expect(panel.className).toContain('translate-y-full')
  })

  it('触屏（hover:none）点击触发条切换显示', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: none'),
      addEventListener() {},
      removeEventListener() {},
    }))
    const { container, getByRole } = renderReveal('top')
    const panel = container.querySelector('[data-testid="edge-reveal-panel-top"]') as HTMLElement
    const strip = getByRole('button', { name: '显示控制栏' })

    fireEvent.click(strip)
    expect(panel.className).toContain('opacity-100')
    fireEvent.click(strip)
    expect(panel.className).toContain('opacity-0')
  })
})

describe('复审修复（触屏关闭/键盘/可见性）', () => {
  it('触屏模式打开后面板本身可点击关闭', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: none'),
      addEventListener() {},
      removeEventListener() {},
    }))
    const { container, getByRole } = renderReveal('top')
    const panel = container.querySelector('[data-testid="edge-reveal-panel-top"]') as HTMLElement
    const strip = getByRole('button', { name: '显示控制栏' })

    fireEvent.click(strip)
    expect(panel.className).toContain('opacity-100')
    fireEvent.click(panel)
    expect(panel.className).toContain('opacity-0')
  })

  it('键盘 Enter 在触发条上切换显示', () => {
    const { container, getByRole } = renderReveal('top')
    const panel = container.querySelector('[data-testid="edge-reveal-panel-top"]') as HTMLElement
    const strip = getByRole('button', { name: '显示控制栏' })
    expect(strip.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(strip, { key: 'Enter' })
    expect(panel.className).toContain('opacity-100')
    fireEvent.keyDown(strip, { key: 'Enter' })
    expect(panel.className).toContain('opacity-0')
  })

  it('隐藏面板 visibility:hidden，移出 tab 序列', () => {
    const { container, getByRole } = renderReveal('bottom')
    const panel = container.querySelector('[data-testid="edge-reveal-panel-bottom"]') as HTMLElement
    expect(panel.style.visibility).toBe('hidden')
    fireEvent.pointerEnter(getByRole('button', { name: '显示控制栏' }))
    expect(panel.style.visibility).toBe('visible')
  })
})
