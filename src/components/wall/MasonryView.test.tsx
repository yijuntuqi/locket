// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { PhotoWithUrl } from '@/lib/types'
import { MasonryView } from './MasonryView'

function makePhoto(id: string, sortOrder: number): PhotoWithUrl {
  return {
    id,
    album_id: 'a1',
    uploader_id: 'u1',
    storage_path: 'p/' + id,
    sort_order: sortOrder,
    created_at: '2025-10-01T08:00:00Z',
    url: 'https://example.com/' + id + '.webp',
  }
}

const PHOTOS = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)]

describe('MasonryView', () => {
  it('按传入顺序渲染全部照片', () => {
    const { container } = render(<MasonryView photos={PHOTOS} onOpen={() => undefined} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(3)
    expect(imgs[2].getAttribute('src')).toBe(PHOTOS[2].url)
  })

  it('点击第 3 张以 onOpen(2) 打开', () => {
    const onOpen = vi.fn()
    const { container } = render(<MasonryView photos={PHOTOS} onOpen={onOpen} />)
    fireEvent.click(container.querySelectorAll('img')[2])
    expect(onOpen).toHaveBeenCalledWith(2)
  })

  it('空数组渲染占位文案', () => {
    const { getByText } = render(<MasonryView photos={[]} onOpen={() => undefined} />)
    expect(getByText('暂无照片')).toBeTruthy()
  })
})
