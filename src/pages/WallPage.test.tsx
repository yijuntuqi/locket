// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import WallPage from './WallPage'
import type { PhotoWithUrl } from '@/lib/types'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (v: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const albumDef: Record<string, Deferred<{ data: unknown; error: null }>> = {}
const photoDef: Record<string, Deferred<PhotoWithUrl[]>> = {}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'albums') throw new Error('unexpected table ' + table)
      return {
        select: () => ({
          eq: (_col: string, id: string) => ({
            single: () => {
              albumDef[id] ??= deferred()
              return albumDef[id].promise
            },
          }),
        }),
      }
    },
  },
}))

vi.mock('@/lib/photos', () => ({
  listPhotosWithUrls: (albumId: string) => {
    photoDef[albumId] ??= deferred()
    return photoDef[albumId].promise
  },
  deletePhoto: vi.fn(),
}))

vi.mock('@/lib/realtime', () => ({
  publishAlbumEvent: vi.fn(async () => {}),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

function photo(id: string, sortOrder: number, albumId: string): PhotoWithUrl {
  return {
    id,
    album_id: albumId,
    uploader_id: 'u1',
    storage_path: `u1/${albumId}/${id}.webp`,
    sort_order: sortOrder,
    created_at: '',
    url: `https://signed/${id}`,
  }
}

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(cleanup)

describe('WallPage 路由参数切换竞态', () => {
  it('切到相册 B 后，迟到的相册 A 响应不得覆盖 B 的内容', async () => {
    const router = createMemoryRouter(
      [{ path: '/album/:albumId', element: <WallPage /> }],
      { initialEntries: ['/album/albumA'] }
    )
    render(<RouterProvider router={router} />)

    // 切到 B：触发第二次 load（albumB 的 deferred 建立）
    await act(async () => {
      await router.navigate('/album/albumB')
    })

    // B 正常返回（先相册，等 load 继续走到取照片那一步）
    albumDef.albumB.resolve({
      data: { id: 'albumB', owner_id: 'u1', name: '相册B', allow_collab_upload: false, created_at: '' },
      error: null,
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    photoDef.albumB.resolve([photo('pb1', 0, 'albumB'), photo('pb2', 1, 'albumB')])
    expect(await screen.findByText('相册B')).toBeTruthy()
    expect(screen.getAllByAltText(/照片 /)).toHaveLength(2)

    // A 的慢响应现在才到：不得覆盖 B
    albumDef.albumA.resolve({
      data: { id: 'albumA', owner_id: 'u1', name: '相册A', allow_collab_upload: false, created_at: '' },
      error: null,
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    // 守卫可能在取照片前就丢弃旧请求，此时 photoDef.albumA 根本不会被创建
    photoDef.albumA?.resolve([photo('pa1', 0, 'albumA')])

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.getByText('相册B')).toBeTruthy()
    expect(screen.getAllByAltText(/照片 /)).toHaveLength(2)
  })
})
