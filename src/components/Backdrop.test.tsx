// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Backdrop } from './Backdrop'

beforeAll(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(cleanup)

describe('Backdrop 分层极光', () => {
  it('默认渲染星星层与暗角层', () => {
    const { container } = render(<Backdrop />)
    expect(container.querySelector('[data-testid="starfield"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vignette"]')).toBeTruthy()
  })

  it('reduced-motion 退化为静态渐变', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }))
    const { container } = render(<Backdrop />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.background).toContain('radial-gradient')
  })
})
