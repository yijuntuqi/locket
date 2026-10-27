// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AlbumsPage from './AlbumsPage'
import type { Album } from '@/lib/types'

const mocks = vi.hoisted(() => ({
  listAlbums: vi.fn(),
  createAlbum: vi.fn(),
  renameAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
}))

vi.mock('@/lib/albums', () => ({
  listAlbums: mocks.listAlbums,
  createAlbum: mocks.createAlbum,
  renameAlbum: mocks.renameAlbum,
  deleteAlbum: mocks.deleteAlbum,
  ValidationError: class ValidationError extends Error {},
}))

const sampleAlbums: Album[] = [
  {
    id: 'a1',
    owner_id: 'u1',
    name: '旅行',
    allow_collab_upload: false,
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: 'a2',
    owner_id: 'u1',
    name: '日常',
    allow_collab_upload: false,
    created_at: '2026-10-27T01:00:00Z',
  },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AlbumsPage />
    </MemoryRouter>
  )
}

describe('AlbumsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listAlbums.mockResolvedValue(sampleAlbums)
  })

  afterEach(cleanup)

  it('渲染相册列表', async () => {
    renderPage()
    expect(await screen.findByText('旅行')).toBeTruthy()
    expect(screen.getByText('日常')).toBeTruthy()
  })

  it('空相册显示空状态提示', async () => {
    mocks.listAlbums.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/还没有相册/)).toBeTruthy()
  })

  it('新建弹窗提交调用 createAlbum', async () => {
    mocks.createAlbum.mockResolvedValue({ ...sampleAlbums[0], name: '美食' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: '新建相册' }))
    fireEvent.change(screen.getByLabelText('相册名'), { target: { value: '美食' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(await vi.waitFor(() => {
      expect(mocks.createAlbum).toHaveBeenCalledWith('美食')
    })).toBeUndefined()
  })

  it('删除需二次确认：取消不删，确认才调用 deleteAlbum', async () => {
    mocks.deleteAlbum.mockResolvedValue(undefined)
    renderPage()
    const buttons = await screen.findAllByRole('button', { name: '删除' })
    fireEvent.click(buttons[0])

    // 确认框出现，带相册名
    expect(await screen.findByText(/确认删除相册「旅行」/)).toBeTruthy()

    // 取消：不调用
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(mocks.deleteAlbum).not.toHaveBeenCalled()

    // 再次删除并确认：调用且卡片移除
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[0])
    fireEvent.click(await screen.findByRole('button', { name: '确认删除' }))
    expect(await vi.waitFor(() => {
      expect(mocks.deleteAlbum).toHaveBeenCalledWith(sampleAlbums[0])
    })).toBeUndefined()
    expect(await vi.waitFor(() => {
      expect(screen.queryByText('旅行')).toBeNull()
    })).toBeUndefined()
  })
})
