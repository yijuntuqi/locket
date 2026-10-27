// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  toPng: vi.fn(),
}))

vi.mock('html-to-image', () => ({
  toPng: mocks.toPng,
}))

import { exportNodeToPng } from './exportPng'

describe('exportNodeToPng', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.toPng.mockResolvedValue('data:image/png;base64,xxx')
  })

  it('以 pixelRatio 2 和深色背景调用 toPng，并以 filename 触发下载', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const node = document.createElement('div')

    await exportNodeToPng(node, 'locket-test.png')

    expect(mocks.toPng).toHaveBeenCalledWith(node, {
      pixelRatio: 2,
      backgroundColor: '#0b0b10',
      cacheBust: true,
    })
    const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.getAttribute('download')).toBe('locket-test.png')
    expect(anchor.href).toBe('data:image/png;base64,xxx')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('toPng 失败时抛错', async () => {
    mocks.toPng.mockRejectedValue(new Error('render failed'))
    await expect(
      exportNodeToPng(document.createElement('div'), 'x.png')
    ).rejects.toThrow('render failed')
  })
})
