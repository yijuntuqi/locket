// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import WallPage from './WallPage'
import { setAlbumLayout } from '@/lib/albums'
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
    auth: {
      // WallPage 启动即查当前用户（判 owner / 协作资格）；测试固定为相册 owner u1
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
    },
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
  }
})

vi.mock('@/lib/realtime', () => ({
  publishAlbumEvent: vi.fn(async () => {}),
}))

vi.mock('@/lib/albums', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/albums')>()
  return {
    ...actual,
    setAlbumLayout: vi.fn(async () => {}),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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
  // 相册名同时出现在顶栏 pill 与场景大标题（有照片时），断言至少一处渲染即可
  await screen.findAllByText(name)
}


/** 顶栏已改为常驻（P8），控制条本身常驻，无需再触边唤醒 */

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
    expect((await screen.findAllByText('相册B')).length).toBeGreaterThanOrEqual(1)
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
    expect(screen.getAllByText('相册B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByAltText(/照片 /)).toHaveLength(2)
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

})

describe('WallPage 空相册（P4 修复）', () => {
  it('空相册下控制条禁用', async () => {
    await renderAlbumPage('albumEmpty', '空相册', [])
    expect((screen.getByRole('button', { name: '布局：圆柱墙' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '自动旋转' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('WallPage 常驻顶栏（P8）', () => {
  const PHOTOS = [photo('p1', 0, 'albumReveal', '2025-10-01T08:00:00Z')]

  it('返回入口固定可见，不依赖触边唤醒', async () => {
    await renderAlbumPage('albumReveal', '相册Reveal', PHOTOS)
    expect(screen.getByRole('link', { name: '← 返回' })).toBeTruthy()
  })
})

describe('WallPage 场景氛围（P5）', () => {
  it('相册页渲染聚光遮罩与尘埃粒子', async () => {
    await renderAlbumPage('albumScene', '相册Scene', [photo('p1', 0, 'albumScene', '2025-10-01T08:00:00Z')])
    expect(document.body.querySelector('[data-testid="scene-light"]')).toBeTruthy()
    expect(document.body.querySelectorAll('[data-testid="dust-mote"]').length).toBe(24)
  })
})

describe('WallPage 布局持久化（P6）', () => {
  const PHOTOS = [photo('p1', 0, 'albumLayout', '2025-10-01T08:00:00Z')]

  it('点选布局调用 setAlbumLayout 并更新当前显示', async () => {
    await renderAlbumPage('albumLayout', '相册Layout', PHOTOS)
    fireEvent.click(screen.getByRole('button', { name: '布局：圆柱墙' }))
    fireEvent.click(screen.getByRole('button', { name: '布局：球形展厅' }))

    await vi.waitFor(() => {
      expect(setAlbumLayout).toHaveBeenCalledWith('albumLayout', 'sphere')
    })
    expect(screen.getByRole('button', { name: '布局：球形展厅' })).toBeTruthy()
  })

  it('相册自带 wall_layout 时控制条显示该布局', async () => {
    const router = createMemoryRouter(
      [{ path: '/album/:albumId', element: <WallPage /> }],
      { initialEntries: ['/album/albumLayout2'] }
    )
    render(<RouterProvider router={router} />)
    albumDef.albumLayout2.resolve({
      data: {
        id: 'albumLayout2',
        owner_id: 'u1',
        name: '相册Layout2',
        allow_collab_upload: false,
        wall_layout: 'spiral',
        created_at: '',
      },
      error: null,
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    photoDef.albumLayout2.resolve(PHOTOS.map((p) => ({ ...p, album_id: 'albumLayout2' })))
    await screen.findAllByText('相册Layout2')
    expect(screen.getByRole('button', { name: '布局：螺旋隧道' })).toBeTruthy()
  })

  it('切到漂移墙后自动旋转开关置灰（恒漂移）', async () => {
    await renderAlbumPage('albumDrift', '相册Drift', [
      photo('p1', 0, 'albumDrift', '2025-10-01T08:00:00Z'),
    ])
    fireEvent.click(screen.getByRole('button', { name: '布局：圆柱墙' }))
    fireEvent.click(screen.getByRole('button', { name: '布局：漂移墙' }))

    await vi.waitFor(() => {
      expect(setAlbumLayout).toHaveBeenCalledWith('albumDrift', 'drift')
    })
    expect((screen.getByRole('button', { name: '自动旋转' }) as HTMLButtonElement).disabled).toBe(
      true
    )
  })
})

describe('WallPage 场景大标题（P7）', () => {
  it('有照片时渲染相册名大标题与张数', async () => {
    await renderAlbumPage('albumTitle', '旅行日记', [
      photo('p1', 0, 'albumTitle'),
      photo('p2', 1, 'albumTitle'),
    ])
    const title = screen.getByTestId('scene-title')
    expect(title.textContent).toContain('旅行日记')
    expect(title.textContent).toContain('2 张照片')
  })

  it('空相册显示引导空状态与上传入口', async () => {
    await renderAlbumPage('albumEmpty2', '空相册2', [])
    expect(screen.getByText('这个相册还没有照片')).toBeTruthy()
    // 顶栏常驻后两个上传按钮都在可访问性树内（顶栏 + 空状态）
    expect(screen.getAllByRole('button', { name: '上传照片' }).length).toBe(2)
  })
})

describe('WallPage 布局保存失败回滚（P6 修复）', () => {
  it('写库失败时布局显示回滚并提示', async () => {
    vi.mocked(setAlbumLayout).mockRejectedValueOnce(new Error('网络错误'))
    await renderAlbumPage('albumLayout', '相册Layout', [
      photo('p1', 0, 'albumLayout', '2025-10-01T08:00:00Z'),
    ])
    fireEvent.click(screen.getByRole('button', { name: '布局：圆柱墙' }))
    fireEvent.click(screen.getByRole('button', { name: '布局：球形展厅' }))

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: '布局：圆柱墙' })).toBeTruthy()
    })
  })
})
