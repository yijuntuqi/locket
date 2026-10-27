// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { PhotoWithUrl } from '@/lib/types'
import { SortableGridView } from './SortableGridView'

afterEach(cleanup)

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

function makeDataTransfer(text: string) {
  return {
    setData: vi.fn(),
    getData: vi.fn((t: string) => (t === 'text/plain' ? text : '')),
    effectAllowed: '',
    dropEffect: '',
  }
}

describe('SortableGridView', () => {
  it('dragStart 记录起点下标，drop 时回调 onReorder(from, to)', () => {
    const onReorder = vi.fn()
    const photos = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)]
    const { container } = render(<SortableGridView photos={photos} onReorder={onReorder} />)

    const items = container.querySelectorAll('[data-testid="sortable-item"]')
    expect(items.length).toBe(3)
    expect(items[0].getAttribute('data-index')).toBe('0')

    const dt = makeDataTransfer('0')
    fireEvent.dragStart(items[0], { dataTransfer: dt })
    expect(dt.setData).toHaveBeenCalledWith('text/plain', '0')

    fireEvent.drop(items[2], { dataTransfer: dt })
    expect(onReorder).toHaveBeenCalledWith(0, 2)
  })
})
