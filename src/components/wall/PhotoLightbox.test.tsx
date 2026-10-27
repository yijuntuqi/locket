// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { PhotoLightbox } from './PhotoLightbox'

afterEach(cleanup)

const PHOTOS = [
  { id: 'a', url: 'https://example.com/a.webp' },
  { id: 'b', url: 'https://example.com/b.webp' },
  { id: 'c', url: 'https://example.com/c.webp' },
]

describe('PhotoLightbox', () => {
  it('渲染当前照片与计数', () => {
    const { container, getByText } = render(
      <PhotoLightbox photos={PHOTOS} index={1} onIndexChange={() => undefined} onClose={() => undefined} />
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe(PHOTOS[1].url)
    expect(getByText('2 / 3')).toBeTruthy()
  })

  it('下一张在末张时环回到第一张，上一张在首张时环回到末张', () => {
    const onIndexChange = vi.fn()
    const first = render(
      <PhotoLightbox photos={PHOTOS} index={2} onIndexChange={onIndexChange} onClose={() => undefined} />
    )
    fireEvent.click(first.getByRole('button', { name: '下一张' }))
    expect(onIndexChange).toHaveBeenCalledWith(0)
    first.unmount()

    const second = render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndexChange={onIndexChange} onClose={() => undefined} />
    )
    fireEvent.click(second.getByRole('button', { name: '上一张' }))
    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('Escape 关闭，ArrowRight 切下一张', () => {
    const onClose = vi.fn()
    const onIndexChange = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndexChange={onIndexChange} onClose={onClose} />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  it('点击遮罩空白处关闭，点击照片本身不关闭', () => {
    const onClose = vi.fn()
    const { container } = render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndexChange={() => undefined} onClose={onClose} />
    )
    fireEvent.click(container.querySelector('img')!)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(container.firstElementChild!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('index 越界时渲染 null 不崩溃', () => {
    const { container } = render(
      <PhotoLightbox photos={PHOTOS} index={5} onIndexChange={() => undefined} onClose={() => undefined} />
    )
    expect(container.firstElementChild).toBeNull()
  })
})
