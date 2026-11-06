// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { CardFaces } from './CardFaces'

const PHOTO: FakePhoto = { id: 'p1', src: 'https://x/1.webp', caption: '照片 1' }

function renderCard(overrides: Partial<Parameters<typeof CardFaces>[0]> = {}) {
  return render(<CardFaces photo={PHOTO} dimmed={false} framePadPx={6} sheenDelayMs={0} {...overrides} />)
}

describe('CardFaces 画廊细框', () => {
  it('渲染正/背相框、照片与眩光层', () => {
    const { container, getByRole } = renderCard()
    expect(getByRole('img', { name: '照片 1' })).toBeTruthy()
    expect(container.querySelector('[data-testid="card-frame-front"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="card-frame-back"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="card-glare"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="card-sheen"]')).toBeTruthy()
  })

  it('相框带白边 padding 与多层投影，照片圆角小于相框', () => {
    const { container } = renderCard({ framePadPx: 5 })
    const front = container.querySelector('[data-testid="card-frame-front"]') as HTMLElement
    expect(front.style.padding).toBe('5px')
    expect(front.style.boxShadow).toContain('0 18px 44px')
    expect(front.style.boxShadow).toContain('inset 0 1px 0')
    const img = front.querySelector('img') as HTMLElement
    expect(img.className).toContain('rounded-lg')
  })

  it('dimmed 时模糊变暗加在相框容器上，眩光隐藏', () => {
    const { container } = renderCard({ dimmed: true })
    for (const testid of ['card-frame-front', 'card-frame-back']) {
      const frame = container.querySelector(`[data-testid="${testid}"]`) as HTMLElement
      expect(frame.style.filter).toContain('blur(3px)')
    }
    for (const img of container.querySelectorAll('img')) {
      expect((img as HTMLElement).style.filter).toBe('')
    }
    const glare = container.querySelector('[data-testid="card-glare"]') as HTMLElement
    expect(glare.className).toContain('opacity-0')
  })

  it('非 dimmed 时相框无 filter', () => {
    const { container } = renderCard()
    for (const testid of ['card-frame-front', 'card-frame-back']) {
      const frame = container.querySelector(`[data-testid="${testid}"]`) as HTMLElement
      expect(frame.style.filter).toBe('')
    }
  })

  it('右键相框触发 onFrontContextMenu', () => {
    const onFrontContextMenu = vi.fn()
    const { container } = renderCard({ onFrontContextMenu })
    const front = container.querySelector('[data-testid="card-frame-front"]') as HTMLElement
    fireEvent.contextMenu(front)
    expect(onFrontContextMenu).toHaveBeenCalledOnce()
  })

  it('指针移动写入眩光位置并显示，离开隐藏', () => {
    const { container } = renderCard()
    const front = container.querySelector('[data-testid="card-frame-front"]') as HTMLElement
    const glare = container.querySelector('[data-testid="card-glare"]') as HTMLElement
    // jsdom 里 getBoundingClientRect 全 0，应直接跳过不写 NaN
    fireEvent.pointerMove(front, { clientX: 10, clientY: 10 })
    expect(glare.style.getPropertyValue('--gx')).toBe('')
    // 模拟有尺寸的卡片
    vi.spyOn(front, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 200,
      left: 0,
      top: 0,
      right: 100,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent.pointerMove(front, { clientX: 50, clientY: 100 })
    expect(glare.style.getPropertyValue('--gx')).toBe('50%')
    expect(glare.style.getPropertyValue('--gy')).toBe('50%')
    expect(glare.style.opacity).toBe('1')
    fireEvent.pointerLeave(front)
    expect(glare.style.opacity).toBe('0')
  })
})
