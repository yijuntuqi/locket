import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = []
  return {
    rpcCalls,
    supabase: {
      rpc: (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args })
        return Promise.resolve({ data: null, error: null })
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({ supabase: mocks.supabase }))

import { persistSortOrder, reorderPhotos } from './photos'

interface Item {
  id: string
  sort_order: number
}

function makeItems(): Item[] {
  return [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
    { id: 'd', sort_order: 3 },
  ]
}

describe('reorderPhotos', () => {
  it('把首元素移到第三位，其余保持相对顺序且 sort_order 连续', () => {
    const items = makeItems()
    const result = reorderPhotos(items, 0, 2)

    expect(result.map((p) => p.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(result.map((p) => p.sort_order)).toEqual([0, 1, 2, 3])
    // 原数组不被修改
    expect(items.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(items.map((p) => p.sort_order)).toEqual([0, 1, 2, 3])
  })

  it('把末元素移到首位', () => {
    const result = reorderPhotos(makeItems(), 3, 0)
    expect(result.map((p) => p.id)).toEqual(['d', 'a', 'b', 'c'])
    expect(result.map((p) => p.sort_order)).toEqual([0, 1, 2, 3])
  })

  it('索引相同或越界时原样返回', () => {
    const items = makeItems()
    expect(reorderPhotos(items, 1, 1)).toBe(items)
    expect(reorderPhotos(items, -1, 2)).toBe(items)
    expect(reorderPhotos(items, 0, 4)).toBe(items)
  })
})

describe('persistSortOrder', () => {
  beforeEach(() => {
    mocks.rpcCalls.length = 0
  })

  it('一次 RPC 调用 reorder_photos，按数组顺序传 ordered_ids', async () => {
    await persistSortOrder([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ])
    expect(mocks.rpcCalls).toEqual([
      { fn: 'reorder_photos', args: { ordered_ids: ['b', 'a'] } },
    ])
  })
})
