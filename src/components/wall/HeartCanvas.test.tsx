// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { HeartCanvas } from './HeartCanvas'

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(cleanup)

function makePhoto(i: number): FakePhoto {
  return { id: `p${i}`, src: 'data:image/svg+xml;utf8,<svg/>', caption: `照片 ${i}` }
}

describe('HeartCanvas', () => {
  it('渲染心形容器与全部照片，卡片带 3D 变换', () => {
    const { container } = render(<HeartCanvas photos={[makePhoto(0), makePhoto(1), makePhoto(2)]} scalePx={10} />)

    const heart = container.querySelector('[data-testid="heart-canvas"]')!
    expect(heart).toBeTruthy()

    const imgs = container.querySelectorAll('img:not([aria-hidden="true"])')
    expect(imgs.length).toBe(3)

    const card = imgs[0].parentElement as HTMLElement
    expect(card.style.transform).toMatch(/translate3d\([^)]*px, [^)]*px, [^)]*px\)/)
    expect(card.style.transform).toContain('rotateY')
  })

  it('容器带透视与自转拖拽面', () => {
    const { container } = render(<HeartCanvas photos={[makePhoto(0)]} scalePx={10} />)
    const perspectiveEl = container.firstElementChild as HTMLElement
    expect(perspectiveEl.style.perspective).toBe('1200px')
    expect(container.querySelector('[data-testid="wall-drag-surface"]')).toBeTruthy()
  })
})

describe('复审修复（hover 响应）', () => {
  it('hover 浮出的 transition 不带入场 stagger 延迟', () => {
    const { container } = render(
      <HeartCanvas photos={[makePhoto(0), makePhoto(1), makePhoto(2)]} scalePx={10} />
    )
    const card2 = container
      .querySelectorAll('img:not([aria-hidden="true"])')[1]
      .parentElement as HTMLElement
    fireEvent.pointerEnter(card2, { buttons: 0 })
    expect(card2.style.transition).toBe('transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)')
  })
})
