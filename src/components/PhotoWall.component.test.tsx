// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
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

describe('删除交互守卫', () => {
  function stubPointerCapture(surface: Element) {
    ;(surface as HTMLElement).setPointerCapture = vi.fn()
    ;(surface as HTMLElement).releasePointerCapture = vi.fn()
    ;(surface as HTMLElement).hasPointerCapture = vi.fn(() => true)
    return surface as HTMLElement
  }

  it('在删除按钮上按下左键不会启动拖拽（不吞掉后续 click）', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <PhotoWall photos={[makePhoto(0)]} onDeletePhoto={onDelete} />
    )
    const surface = stubPointerCapture(
      container.querySelector('[data-testid="wall-drag-surface"]')!
    )
    const button = container.querySelector('button[aria-label^="删除"]')!

    fireEvent.pointerDown(button, { button: 0 })

    expect(surface.className).toContain('cursor-grab')
    expect(surface.setPointerCapture).not.toHaveBeenCalled()
  })

  it('左键点击删除按钮仍会触发 onDelete', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <PhotoWall photos={[makePhoto(0)]} onDeletePhoto={onDelete} />
    )
    stubPointerCapture(container.querySelector('[data-testid="wall-drag-surface"]')!)
    const button = container.querySelector('button[aria-label^="删除"]')!

    fireEvent.click(button)

    expect(onDelete).toHaveBeenCalledWith('p0')
  })

  it('右键（辅助键）在照片上不会启动拖拽', () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0)]} />)
    const surface = stubPointerCapture(
      container.querySelector('[data-testid="wall-drag-surface"]')!
    )
    const img = container.querySelector('img')!

    fireEvent.pointerDown(img, { button: 2 })

    expect(surface.className).toContain('cursor-grab')
    expect(surface.setPointerCapture).not.toHaveBeenCalled()
  })

  it('左键点在照片上仍会正常启动拖拽', () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0)]} />)
    const surface = stubPointerCapture(
      container.querySelector('[data-testid="wall-drag-surface"]')!
    )
    const img = container.querySelector('img')!

    fireEvent.pointerDown(img, { button: 0 })

    expect(surface.className).toContain('cursor-grabbing')
    expect(surface.setPointerCapture).toHaveBeenCalled()
  })
})

describe('俯视倾斜与背板', () => {
  it('场景容器带固定 X 轴俯视倾斜（负角度 = 从斜上方往下看）', () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0)]} />)
    const surface = container.querySelector('[data-testid="wall-drag-surface"]')!
    expect((surface as HTMLElement).style.transform).toMatch(/rotateX\(-18deg\)/)
  })

  it('每张卡片的背面是半透明镜像照片层（透出后面的照片）', () => {
    const { container } = render(
      <PhotoWall photos={[makePhoto(0), makePhoto(1), makePhoto(2)]} />
    )
    const backs = container.querySelectorAll('img[aria-hidden="true"]')
    expect(backs.length).toBe(3)
    for (const back of backs) {
      const el = back as HTMLElement
      expect(el.style.opacity).not.toBe('')
      expect(Number(el.style.opacity)).toBeLessThan(1)
    }
  })
})

describe('自动旋转开关', () => {
  it('autoRotateDegPerSec 传 0 时角度不随时间变化', async () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0)]} autoRotateDegPerSec={0} />)
    await new Promise((r) => setTimeout(r, 120))
    const surface = container.querySelector('[data-testid="wall-drag-surface"]') as HTMLElement
    expect(surface.style.transform).toContain('rotateY(0deg)')
  })
})

describe('hover 景深（DoF）', () => {
  it('hover 某卡片：其浮出 translateZ，其余卡片叶子 img 模糊，容器 preserve-3d 不破', () => {
    const { container } = render(
      <PhotoWall photos={[makePhoto(0), makePhoto(1), makePhoto(2)]} />
    )
    const cards = container.querySelectorAll('.group')
    expect(cards.length).toBe(3)

    fireEvent.pointerEnter(cards[1], { buttons: 0 })
    expect((cards[1] as HTMLElement).style.transform).toContain('translateZ(48px)')

    const frontImg0 = cards[0].querySelector('img:not([aria-hidden="true"])') as HTMLElement
    expect(frontImg0.style.filter).toContain('blur(3px)')
    const frontImg1 = cards[1].querySelector('img:not([aria-hidden="true"])') as HTMLElement
    expect(frontImg1.style.filter).toBe('')

    // 卡片容器 transformStyle 仍 preserve-3d（blur 只加叶子上）
    expect((cards[0] as HTMLElement).style.transformStyle).toBe('preserve-3d')

    fireEvent.pointerLeave(cards[1])
    expect((cards[1] as HTMLElement).style.transform).not.toContain('translateZ(48px)')
    expect((cards[0].querySelector('img:not([aria-hidden="true"])') as HTMLElement).style.filter).toBe('')
  })

  it('按住按键（拖拽中）时 hover 不触发景深', () => {
    const { container } = render(<PhotoWall photos={[makePhoto(0), makePhoto(1)]} />)
    const cards = container.querySelectorAll('.group')
    fireEvent.pointerEnter(cards[1], { buttons: 1 })
    expect((cards[1] as HTMLElement).style.transform).not.toContain('translateZ(48px)')
    expect((cards[0].querySelector('img:not([aria-hidden="true"])') as HTMLElement).style.filter).toBe('')
  })
})
