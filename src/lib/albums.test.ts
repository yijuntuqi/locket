import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAlbum,
  deleteAlbum,
  setAlbumLayout,
  validateAlbumName,
  ValidationError,
} from './albums'

const calls: string[] = []

const mockGetUser = vi.fn()
const mockInsert = vi.fn(() => {
  calls.push('insert')
  return { select: () => ({ single: async () => ({ data: { id: 'a1' }, error: null }) }) }
})
const mockSelectPhotos = vi.fn(() => ({
  eq: async () => {
    calls.push('select-photos')
    return { data: [{ storage_path: 'u1/a1/p1.webp' }], error: null }
  },
}))
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
        return { insert: mockInsert, delete: mockDeleteAlbum, update: mockUpdateAlbum }
      if (table === 'photos') return { select: mockSelectPhotos }
      throw new Error('unexpected table ' + table)
    },
    storage: { from: () => ({ remove: mockStorageRemove }) },
  },
}))

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
