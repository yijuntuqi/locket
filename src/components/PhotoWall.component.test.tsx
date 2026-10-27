// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { PhotoWall } from './PhotoWall'

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

function makePhoto(i: number): FakePhoto {
  return { id: `p${i}`, src: 'data:image/svg+xml;utf8,<svg/>', caption: `照片 ${i}` }
}

describe('PhotoWall 组件', () => {
  it('拖拽面带 touch-action:none，触屏手势不被浏览器劫持', () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0)]} />)
    const surface = container.querySelector('[data-testid="wall-drag-surface"]')
    expect(surface).not.toBeNull()
    expect((surface as HTMLElement).style.touchAction).toBe('none')
  })

  it('父组件重渲染（角度更新）时，照片卡片不重渲染', () => {
    let captionReads = 0
    const photo: FakePhoto = {
      id: 'p0',
      src: 'data:image/svg+xml;utf8,<svg/>',
      get caption() {
        captionReads += 1
        return '照片 0'
      },
    }
    const { rerender } = render(<PhotoWall photos={[photo]} />)
    const readsAfterMount = captionReads

    for (let i = 0; i < 5; i++) {
      rerender(<PhotoWall photos={[photo]} />)
    }

    expect(captionReads).toBe(readsAfterMount)
  })
})
