// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import WallPage from './WallPage'
import { persistSortOrder } from '@/lib/photos'
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

vi.mock('@/lib/photos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/photos')>()
  return {
    ...actual,
    listPhotosWithUrls: (albumId: string) => {
      photoDef[albumId] ??= deferred()
      return photoDef[albumId].promise
    },
    deletePhoto: vi.fn(),
    persistSortOrder: vi.fn(async () => {}),
  }
})

vi.mock('@/lib/realtime', () => ({
  publishAlbumEvent: vi.fn(async () => {}),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

function photo(id: string, sortOrder: number, albumId: string, createdAt = ''): PhotoWithUrl {
  return {
    id,
    album_id: albumId,
    uploader_id: 'u1',
    storage_path: `u1/${albumId}/${id}.webp`,
    sort_order: sortOrder,
    created_at: createdAt,
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

beforeEach(() => {
  vi.clearAllMocks()
})

async function renderAlbumPage(albumId: string, name: string, photos: PhotoWithUrl[]) {
  const router = createMemoryRouter(
    [{ path: '/album/:albumId', element: <WallPage /> }],
    { initialEntries: [`/album/${albumId}`] }
  )
  render(<RouterProvider router={router} />)
  albumDef[albumId].resolve({
    data: { id: albumId, owner_id: 'u1', name, allow_collab_upload: false, created_at: '' },
    error: null,
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  photoDef[albumId].resolve(photos)
  await screen.findByText(name)
}

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

describe('WallPage 三视图与排序', () => {
  const PHOTOS = [
    photo('p1', 0, 'albumP3', '2025-10-01T08:00:00Z'),
    photo('p2', 1, 'albumP3', '2025-10-15T08:00:00Z'),
  ]

  it('头部提供 3D 墙/时间轴/瀑布流 三个切换按钮，3D 墙下无排序按钮', async () => {
    await renderAlbumPage('albumP3', '相册P3', PHOTOS)
    expect(screen.getByRole('button', { name: '3D 墙' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '时间轴' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '瀑布流' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '排序' })).toBeNull()
  })

  it('切到时间轴渲染月分组，点图打开灯箱，Escape 关闭', async () => {
    await renderAlbumPage('albumP3', '相册P3', PHOTOS)
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))

    expect(screen.getByText('2025 年 10 月')).toBeTruthy()
    // DOM 顺序按时间新→旧：p2 在前
    const imgs = document.body.querySelectorAll('img')
    expect(imgs[0].getAttribute('src')).toBe('https://signed/p2')

    fireEvent.click(imgs[0])
    expect(screen.getByText('1 / 2')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('1 / 2')).toBeNull()
  })

  it('瀑布流下开启排序模式显示可拖拽网格，drop 触发 persistSortOrder', async () => {
    await renderAlbumPage('albumP3', '相册P3', PHOTOS)
    fireEvent.click(screen.getByRole('button', { name: '瀑布流' }))
    fireEvent.click(screen.getByRole('button', { name: '排序' }))

    const items = document.body.querySelectorAll('[data-testid="sortable-item"]')
    expect(items.length).toBe(2)

    const dt = {
      setData: vi.fn(),
      getData: vi.fn((t: string) => (t === 'text/plain' ? '0' : '')),
      effectAllowed: '',
      dropEffect: '',
    }
    fireEvent.dragStart(items[0], { dataTransfer: dt })
    fireEvent.drop(items[1], { dataTransfer: dt })

    await vi.waitFor(() => {
      expect(persistSortOrder).toHaveBeenCalledWith([
        { id: 'p2', sort_order: 0 },
        { id: 'p1', sort_order: 1 },
      ])
    })
  })
})

describe('WallPage 心形模式（P4）', () => {
  const PHOTOS = [photo('p1', 0, 'albumHeart', '2025-10-01T08:00:00Z')]

  it('点心形切换 3D 爱心，再点回到圆柱墙', async () => {
    await renderAlbumPage('albumHeart', '相册Heart', PHOTOS)
    expect(document.body.querySelector('[data-testid="heart-canvas"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '心形' }))
    expect(document.body.querySelector('[data-testid="heart-canvas"]')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '心形' }))
    expect(document.body.querySelector('[data-testid="heart-canvas"]')).toBeNull()
  })

  it('非 3D 墙视图下心形按钮禁用', async () => {
    await renderAlbumPage('albumHeart', '相册Heart', PHOTOS)
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    expect((screen.getByRole('button', { name: '心形' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('WallPage 自动旋转开关（P4）', () => {
  const PHOTOS = [photo('p1', 0, 'albumRotate', '2025-10-01T08:00:00Z')]

  it('Dock 自动旋转默认开启，点击关闭再开启', async () => {
    await renderAlbumPage('albumRotate', '相册Rotate', PHOTOS)
    const btn = screen.getByRole('button', { name: '自动旋转' })
    expect(btn.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('非 3D 墙视图下自动旋转按钮禁用', async () => {
    await renderAlbumPage('albumRotate', '相册Rotate', PHOTOS)
    fireEvent.click(screen.getByRole('button', { name: '瀑布流' }))
    expect(
      (screen.getByRole('button', { name: '自动旋转' }) as HTMLButtonElement).disabled
    ).toBe(true)
  })
})

describe('WallPage 空相册（P4 修复）', () => {
  it('空相册下心形与自动旋转按钮禁用', async () => {
    await renderAlbumPage('albumEmpty', '空相册', [])
    expect((screen.getByRole('button', { name: '心形' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '自动旋转' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
