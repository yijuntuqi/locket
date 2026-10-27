import { beforeEach, describe, expect, it, vi } from 'vitest'
import imageCompression from 'browser-image-compression'
import { nextSortOrder, uploadPhotos } from './upload'

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
}))

const calls: string[] = []
const uploadedPaths: string[] = []
let insertedSortOrders: number[] = []
let failInsertForFirst = false

const mockStorageUpload = vi.fn(async (path: string) => {
  calls.push('upload:' + path)
  uploadedPaths.push(path)
  return { data: { path }, error: null }
})
const mockStorageRemove = vi.fn(async (paths: string[]) => {
  calls.push('remove:' + paths.join(','))
  return { data: [], error: null }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'photos') throw new Error('unexpected table ' + table)
      return {
        select: () => ({
          eq: async () => {
            calls.push('select-sort')
            return { data: [], error: null }
          },
        }),
        insert: (row: { sort_order: number }) => {
          calls.push('insert:' + row.sort_order)
          insertedSortOrders.push(row.sort_order)
          const shouldFail = failInsertForFirst && insertedSortOrders.length === 1
          return {
            select: () => ({
              single: async () => {
                if (shouldFail) return { data: null, error: { message: 'insert failed' } }
                return { data: { ...row, id: 'p' + row.sort_order }, error: null }
              },
            }),
          }
        },
      }
    },
    storage: {
      from: () => ({ upload: mockStorageUpload, remove: mockStorageRemove }),
    },
  },
}))

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('nextSortOrder', () => {
  it('空相册从 0 开始', () => {
    expect(nextSortOrder([])).toBe(0)
  })
  it('取现有最大 sort_order + 1', () => {
    expect(nextSortOrder([{ sort_order: 2 }, { sort_order: 5 }])).toBe(6)
  })
})

describe('uploadPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    uploadedPaths.length = 0
    insertedSortOrders = []
    failInsertForFirst = false
  })

  it('按压缩→上传→写行的顺序处理，路径为 owner/album/uuid.webp', async () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg')]
    const summary = await uploadPhotos('album1', 'user1', files)

    expect(imageCompression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        maxSizeMB: 0.3,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: 'image/webp',
      })
    )
    expect(uploadedPaths).toHaveLength(2)
    expect(uploadedPaths[0]).toMatch(/^user1\/album1\/[0-9a-f-]{36}\.webp$/)
    expect(insertedSortOrders).toEqual([0, 1])
    expect(summary.results).toHaveLength(2)
    expect(summary.failures).toEqual([])
    expect(calls.indexOf('upload:' + uploadedPaths[0])).toBeLessThan(
      calls.indexOf('insert:0')
    )
  })

  it('单张写行失败：该张进 failures 并清理已传文件，其余继续', async () => {
    failInsertForFirst = true
    const files = [makeFile('bad.jpg'), makeFile('good.jpg')]
    const summary = await uploadPhotos('album1', 'user1', files)

    expect(summary.results).toHaveLength(1)
    expect(summary.results[0].fileName).toBe('good.jpg')
    expect(summary.failures).toHaveLength(1)
    expect(summary.failures[0].fileName).toBe('bad.jpg')
    expect(mockStorageRemove).toHaveBeenCalledWith([uploadedPaths[0]])
  })
})
