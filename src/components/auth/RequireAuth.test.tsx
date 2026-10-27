// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'

const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>protected-content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('有会话时渲染受保护内容', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    })
    renderAt('/')
    expect(await screen.findByText('protected-content')).toBeTruthy()
  })

  it('无会话时重定向到 /login', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    renderAt('/')
    expect(await screen.findByText('login-page')).toBeTruthy()
    expect(screen.queryByText('protected-content')).toBeNull()
  })
})
