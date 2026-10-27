// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
    },
  },
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

async function fillAndSubmit(modeButton: string, submitButton: string) {
  fireEvent.click(screen.getByRole('button', { name: modeButton }))
  fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'pw123456' } })
  fireEvent.click(screen.getByRole('button', { name: submitButton }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('登录成功调用一次 signInWithPassword 并进入首页', async () => {
    mocks.signIn.mockResolvedValue({ data: {}, error: null })
    renderLogin()
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'pw123456' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('home-page')).toBeTruthy()
    expect(mocks.signIn).toHaveBeenCalledTimes(1)
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw123456' })
  })

  it('注册且后台开启邮件确认时显示确认邮件提示，不跳转', async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1' } },
      error: null,
    })
    renderLogin()
    await fillAndSubmit('去注册', '注册')

    expect(await screen.findByText(/请查收确认邮件/)).toBeTruthy()
    expect(screen.queryByText('home-page')).toBeNull()
  })

  it('注册直接返回会话时进入首页', async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    })
    renderLogin()
    await fillAndSubmit('去注册', '注册')

    expect(await screen.findByText('home-page')).toBeTruthy()
  })
})
