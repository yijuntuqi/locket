import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  albumEventToastText,
  publishAlbumEvent,
  subscribeAlbumEvents,
  type AlbumEvent,
} from './realtime'

interface ChannelStub {
  name: string
  opts: unknown
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  state: {
    handler: null as null | ((msg: { payload: unknown }) => void),
    sent: null as unknown,
    sendError: null as unknown,
  },
  channelSpy: vi.fn(),
  removeChannelSpy: vi.fn(async () => {}),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channelSpy,
    removeChannel: mocks.removeChannelSpy,
  },
}))

function stubChannel(name: string, opts: unknown): ChannelStub {
  const ch: ChannelStub = {
    name,
    opts,
    on: vi.fn((_type: string, _filter: unknown, handler: (msg: never) => void) => {
      mocks.state.handler = handler as (msg: { payload: unknown }) => void
      return ch
    }),
    subscribe: vi.fn(() => ch),
    send: vi.fn(async (msg: unknown) => {
      mocks.state.sent = msg
      return mocks.state.sendError ? 'error' : 'ok'
    }),
  }
  return ch
}

const event: AlbumEvent = { type: 'album-updated', albumId: 'a1', albumName: '旅行' }

describe('albumEventToastText', () => {
  it('相册新建文案带相册名', () => {
    expect(
      albumEventToastText({ type: 'album-created', albumId: 'a1', albumName: '旅行' })
    ).toBe('相册「旅行」建好啦')
  })
  it('相册更新用统一文案', () => {
    expect(albumEventToastText(event)).toBe('有新的回忆更新啦')
  })
})

describe('subscribeAlbumEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.handler = null
    mocks.channelSpy.mockImplementation((name: string, opts: unknown) =>
      stubChannel(name, opts)
    )
  })

  it('在 user:{uid} 私有频道订阅 broadcast 并转发 payload', () => {
    const onEvent = vi.fn()
    subscribeAlbumEvents('u1', onEvent)

    expect(mocks.channelSpy).toHaveBeenCalledWith('user:u1', {
      config: { private: true },
    })
    mocks.state.handler?.({ payload: event })
    expect(onEvent).toHaveBeenCalledWith(event)
  })

  it('返回的清理函数移除频道', () => {
    const cleanup = subscribeAlbumEvents('u1', vi.fn())
    cleanup()
    expect(mocks.removeChannelSpy).toHaveBeenCalled()
  })
})

describe('publishAlbumEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.sent = null
    mocks.state.sendError = null
    mocks.channelSpy.mockImplementation((name: string, opts: unknown) =>
      stubChannel(name, opts)
    )
  })

  it('以 album-event 事件名广播并释放频道', async () => {
    await publishAlbumEvent('u1', event)
    expect(mocks.state.sent).toEqual({
      type: 'broadcast',
      event: 'album-event',
      payload: event,
    })
    expect(mocks.removeChannelSpy).toHaveBeenCalled()
  })

  it('发送失败时抛出错误', async () => {
    mocks.state.sendError = { message: 'denied' }
    await expect(publishAlbumEvent('u1', event)).rejects.toThrow(/发送失败/)
  })
})
