import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAlbum,
  deleteAlbum,
  listAlbumsWithSummaries,
  setAlbumLayout,
  validateAlbumName,
  ValidationError,
} from './albums'
import type { Album, Photo } from '@/lib/types'

const calls: string[] = []
let albumRows: Album[] = []
let photoRows: Photo[] = []

const mockGetUser = vi.fn()
const mockInsert = vi.fn(() => {
  calls.push('insert')
  return { select: () => ({ single: async () => ({ data: { id: 'a1' }, error: null }) }) }
})
const mockSelectAlbums = vi.fn(async () => {
  calls.push('select-albums')
  return { data: albumRows, error: null }
})
const mockCreateSignedUrls = vi.fn(async (paths: string[]) => ({
  data: paths.map((p) => ({ path: p, signedUrl: `https://signed/${p}` })),
  error: null,
}))
/** 覆盖 getAlbumSummary / deleteAlbum 的两种 photos 查询形态（每层可 await 也可续链） */
function buildPhotoStage(albumId: unknown, opts?: { count?: string; head?: boolean }) {
  const rows = () => photoRows.filter((p) => p.album_id === albumId)
  return {
    order: () => buildPhotoStage(albumId, opts),
    limit: async () => {
      calls.push('select-photos')
      return { data: rows(), error: null }
    },
    then: (onFulfilled: (v: unknown) => unknown) => {
      calls.push('select-photos')
      const value = opts?.count
        ? { count: rows().length, error: null }
        : { data: rows(), error: null }
      return Promise.resolve(value).then(onFulfilled)
    },
  }
}

const mockSelectPhotos = vi.fn(
  (_cols: unknown, opts?: { count?: string; head?: boolean }) => ({
    eq: (_col: unknown, albumId: unknown) => buildPhotoStage(albumId, opts),
  })
)
const mockStorageRemove = vi.fn(async (paths: string[]) => {
  calls.push('storage-remove:' + paths.join(','))
  return { data: [], error: null }
})
const mockUpdateAlbum = vi.fn((patch: unknown) => {
  calls.push('update-album:' + JSON.stringify(patch))
  return { eq: async () => ({ error: null }) }
})
const mockDeleteAlbum = vi.fn(() => ({
  eq: async () => {
    calls.push('delete-album')
    return { error: null }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: (table: string) => {
      if (table === 'albums')
        return {
          insert: mockInsert,
          delete: mockDeleteAlbum,
          update: mockUpdateAlbum,
          select: () => ({ order: mockSelectAlbums }),
        }
      if (table === 'photos') return { select: mockSelectPhotos }
      throw new Error('unexpected table ' + table)
    },
    storage: { from: () => ({ remove: mockStorageRemove, createSignedUrls: mockCreateSignedUrls }) },
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

describe('validateAlbumName', () => {
  it('trim 并返回合法名称', () => {
    expect(validateAlbumName('  旅行  ')).toBe('旅行')
  })
  it('空白名称抛 ValidationError', () => {
    expect(() => validateAlbumName('   ')).toThrow(ValidationError)
  })
  it('超过 50 字抛 ValidationError', () => {
    expect(() => validateAlbumName('长'.repeat(51))).toThrow(ValidationError)
  })
})

describe('createAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('先校验：非法名称不触碰 supabase', async () => {
    await expect(createAlbum('  ')).rejects.toThrow(ValidationError)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('合法名称以 trim 后文本和当前用户插入', async () => {
    const album = await createAlbum(' 日常 ')
    expect(mockInsert).toHaveBeenCalledWith({ name: '日常', owner_id: 'u1' })
    expect(album.id).toBe('a1')
  })
})

describe('deleteAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    photoRows = [photo('p1', 'u1/a1/p1.webp')]
  })

  it('先删 storage 对象，再删相册行', async () => {
    await deleteAlbum({
      id: 'a1',
      owner_id: 'u1',
      name: '日常',
      allow_collab_upload: false,
      wall_layout: 'cylinder',
      created_at: '',
    })
    expect(mockStorageRemove).toHaveBeenCalledWith(['u1/a1/p1.webp'])
    expect(calls.indexOf('storage-remove:u1/a1/p1.webp')).toBeLessThan(
      calls.indexOf('delete-album')
    )
  })
})

describe('setAlbumLayout', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('合法布局写入 wall_layout', async () => {
    await setAlbumLayout('a1', 'sphere')
    expect(calls).toContain('update-album:{"wall_layout":"sphere"}')
  })

  it('非法布局抛 ValidationError 且不写库', async () => {
    await expect(setAlbumLayout('a1', 'hack' as never)).rejects.toThrow(ValidationError)
    expect(calls.filter((c) => c.startsWith('update-album'))).toHaveLength(0)
  })
})

describe('listAlbumsWithSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    albumRows = [
      {
        id: 'a1',
        owner_id: 'u1',
        name: '旅行',
        allow_collab_upload: false,
        wall_layout: 'cylinder',
        created_at: '',
      },
      {
        id: 'a2',
        owner_id: 'u1',
        name: '日常',
        allow_collab_upload: false,
        wall_layout: 'cylinder',
        created_at: '',
      },
    ]
    photoRows = [photo('p1', 'u1/a1/1.webp'), photo('p2', 'u1/a1/2.webp')]
  })

  it('合并每个相册的封面与张数，空相册降级无封面', async () => {
    const result = await listAlbumsWithSummaries()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'a1',
      coverUrl: 'https://signed/u1/a1/1.webp',
      photoCount: 2,
    })
    expect(result[1]).toMatchObject({ id: 'a2', coverUrl: null, photoCount: 0 })
  })

  it('单个相册摘要失败不挡整个列表（降级无封面）', async () => {
    mockCreateSignedUrls.mockRejectedValueOnce(new Error('签名失败'))
    const result = await listAlbumsWithSummaries()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'a1', coverUrl: null, photoCount: 0 })
    expect(result[1]).toMatchObject({ id: 'a2', coverUrl: null, photoCount: 0 })
  })
})
