// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { PhotoWithUrl } from '@/lib/types'
import { TimelineView } from './TimelineView'

function makePhoto(id: string, createdAt: string): PhotoWithUrl {
  return {
    id,
    album_id: 'a1',
    uploader_id: 'u1',
    storage_path: 'p/' + id,
    sort_order: 0,
    created_at: createdAt,
    url: 'https://example.com/' + id + '.webp',
  }
}

// 2025-10 两张（B 更新）、2024-03 一张
const A = makePhoto('a', '2025-10-01T08:00:00Z')
const B = makePhoto('b', '2025-10-15T08:00:00Z')
const C = makePhoto('c', '2024-03-05T08:00:00Z')

describe('TimelineView', () => {
  it('按 YYYY-MM 分组，新→旧排序', () => {
    const { container, getByText } = render(
      <TimelineView photos={[A, B, C]} onOpen={() => undefined} />
    )
    expect(getByText('2025 年 10 月')).toBeTruthy()
    expect(getByText('2024 年 3 月')).toBeTruthy()

    const headers = [...container.querySelectorAll('h3')].map((h) => h.textContent)
    expect(headers).toEqual(['2025 年 10 月', '2024 年 3 月'])
  })

  it('onOpen 下标按分组展开后的扁平顺序计算', () => {
    const onOpen = vi.fn()
    const { container } = render(<TimelineView photos={[A, B, C]} onOpen={onOpen} />)
    const imgs = container.querySelectorAll('img')
    // DOM 顺序：B(2025-10-15) → A(2025-10-01) → C(2024-03-05)
    expect(imgs[0].getAttribute('src')).toBe(B.url)
    fireEvent.click(imgs[1])
    expect(onOpen).toHaveBeenCalledWith(1)
  })

  it('空数组渲染占位文案', () => {
    const { getByText } = render(<TimelineView photos={[]} onOpen={() => undefined} />)
    expect(getByText('暂无照片')).toBeTruthy()
  })
})
