// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

type CtxCall = { method: string; args: unknown[] }

function makeCtxStub() {
  const calls: CtxCall[] = []
  const gradient = {
    addColorStop: (...args: unknown[]) => calls.push({ method: 'addColorStop', args }),
  }
  const target: Record<string | symbol, unknown> = {}
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop]
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args })
        if (String(prop).startsWith('create')) return gradient
      }
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

let imageMode: 'load' | 'error' = 'load'

class ImageStub {
  crossOrigin: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    queueMicrotask(() => {
      if (imageMode === 'load') this.onload?.()
      else this.onerror?.()
    })
  }
}

vi.stubGlobal('Image', ImageStub)

beforeEach(() => {
  imageMode = 'load'
})

import {
  drawAuroraBackground,
  exportWallPng,
  layoutWallCards,
  mulberry32,
  renderWallToCanvas,
} from './exportWallCanvas'

describe('mulberry32', () => {
  it('确定性且值域在 [0,1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 50; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('layoutWallCards', () => {
  it('8 张照片在 0 度视角下只保留朝向观察者的卡片，按远→近排序', () => {
    const placements = layoutWallCards(8, 1200, 800, 0)
    // 45° 步进下，cos>0.05 的有 0°/45°/315° 三张
    expect(placements.length).toBe(3)
    // 远（45°/315°，depth 更负）先画，正前方（0°，depth≈0）最后画
    const last = placements[placements.length - 1]
    expect(last.depth).toBeGreaterThan(placements[0].depth)
  })

  it('任意角度所有落点都在画布范围内', () => {
    const placements = layoutWallCards(20, 1000, 700, 123)
    expect(placements.length).toBeGreaterThan(0)
    for (const p of placements) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(1000)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(700)
    }
  })

  it('count 为 0 时返回空数组', () => {
    expect(layoutWallCards(0, 800, 600, 0)).toEqual([])
  })
})

describe('drawAuroraBackground', () => {
  it('绘制底色渐变、辉光斑和星星', () => {
    const { ctx, calls } = makeCtxStub()
    drawAuroraBackground(ctx, 800, 600, mulberry32(1))

    expect(calls.filter((c) => c.method === 'createLinearGradient').length).toBe(1)
    expect(calls.filter((c) => c.method === 'createRadialGradient').length).toBeGreaterThanOrEqual(3)
    expect(calls.filter((c) => c.method === 'arc').length).toBeGreaterThanOrEqual(100)
  })
})

describe('renderWallToCanvas', () => {
  it('为每张朝前的照片调用 drawImage', async () => {
    const { ctx, calls } = makeCtxStub()
    const photos = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      url: `https://x/${i}.webp`,
    }))
    await renderWallToCanvas(ctx, 1200, 800, photos, 0)

    expect(calls.filter((c) => c.method === 'drawImage').length).toBe(3)
  })

  it('照片加载失败时抛错', async () => {
    imageMode = 'error'
    const { ctx } = makeCtxStub()
    await expect(
      renderWallToCanvas(ctx, 800, 600, [{ id: 'p1', url: 'https://x/1.webp' }], 0)
    ).rejects.toThrow('照片加载失败')
  })
})

describe('exportWallPng', () => {
  it('2 倍尺寸渲染、toBlob 后按 filename 下载', async () => {
    const { ctx } = makeCtxStub()
    const originalCreateElement = document.createElement.bind(document)
    const created: HTMLCanvasElement[] = []
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        const canvas = originalCreateElement('canvas')
        created.push(canvas)
        canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext
        canvas.toBlob = ((
          cb: (b: Blob | null) => void
        ) => cb(new Blob(['x']))) as typeof canvas.toBlob
        return canvas
      }
      return originalCreateElement(tag)
    }) as typeof document.createElement)

    const createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    await exportWallPng(
      [{ id: 'p1', url: 'https://x/1.webp' }],
      0,
      'locket-test.png',
      400,
      300
    )

    expect(created[0].width).toBe(800)
    expect(created[0].height).toBe(600)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.getAttribute('download')).toBe('locket-test.png')

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('Image', ImageStub)
  })
})
