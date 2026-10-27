import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePhoto, listPhotosWithUrls } from './photos'
import type { Photo } from '@/lib/types'

const calls: string[] = []
let photoRows: Photo[] = []
let signRows: { path: string; signedUrl: string }[] = []

const mockCreateSignedUrls = vi.fn(async (paths: string[]) => {
  calls.push('sign:' + paths.join('|'))
  return { data: signRows, error: null }
})
const mockRemove = vi.fn(async (paths: string[]) => {
  calls.push('remove:' + paths.join('|'))
  return { data: [], error: null }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'photos') throw new Error('unexpected table ' + table)
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async () => {
                calls.push('select')
                return { data: photoRows, error: null }
              },
            }),
          }),
        }),
        delete: () => ({
          eq: async () => {
            calls.push('delete-row')
            return { error: null }
          },
        }),
      }
    },
    storage: {
      from: () => ({ createSignedUrls: mockCreateSignedUrls, remove: mockRemove }),
    },
  },
}))

function photo(id: string, path: string): Photo {
  return {
    id,
    album_id: 'a1',
    uploader_id: 'u1',
    storage_path: path,
    sort_order: 0,
    created_at: '',
  }
}

describe('listPhotosWithUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    photoRows = []
    signRows = []
  })

  it('按 storage_path 把行映射为签名 URL', async () => {
    photoRows = [photo('p1', 'u1/a1/1.webp'), photo('p2', 'u1/a1/2.webp')]
    signRows = [
      { path: 'u1/a1/1.webp', signedUrl: 'https://signed/1' },
      { path: 'u1/a1/2.webp', signedUrl: 'https://signed/2' },
    ]
    const result = await listPhotosWithUrls('a1')
    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://signed/1')
    expect(result[1].url).toBe('https://signed/2')
  })

  it('空相册不调用 createSignedUrls', async () => {
    const result = await listPhotosWithUrls('a1')
    expect(result).toEqual([])
    expect(mockCreateSignedUrls).not.toHaveBeenCalled()
  })
})

describe('deletePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
  })

  it('先删 storage 对象，再删表行', async () => {
    await deletePhoto(photo('p1', 'u1/a1/1.webp'))
    expect(mockRemove).toHaveBeenCalledWith(['u1/a1/1.webp'])
    expect(calls.indexOf('remove:u1/a1/1.webp')).toBeLessThan(
      calls.indexOf('delete-row')
    )
  })
})
