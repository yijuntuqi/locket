import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const updateCalls: { id: string; sort_order: number }[] = []
  let failId: string | null = null
  return {
    updateCalls,
    setFailId: (id: string | null) => {
      failId = id
    },
    supabase: {
      from: (table: string) => {
        if (table !== 'photos') throw new Error('unexpected table ' + table)
        return {
          update: (patch: { sort_order: number }) => ({
            eq: async (col: string, id: string) => {
              if (col !== 'id') throw new Error('unexpected col ' + col)
              updateCalls.push({ id, sort_order: patch.sort_order })
              if (failId === id) return { data: null, error: { message: 'update failed' } }
              return { data: {}, error: null }
            },
          }),
        }
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
    mocks.updateCalls.length = 0
    mocks.setFailId(null)
  })

  it('对每条调用 update 并传 sort_order，顺序与入参一致', async () => {
    await persistSortOrder([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ])
    expect(mocks.updateCalls).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ])
  })

  it('任何一条失败即 throw', async () => {
    mocks.setFailId('b')
    await expect(
      persistSortOrder([
        { id: 'a', sort_order: 0 },
        { id: 'b', sort_order: 1 },
      ])
    ).rejects.toThrow('update failed')
  })
})
