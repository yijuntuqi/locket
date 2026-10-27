// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { FakePhoto } from '@/lib/fakePhotos'
import { CardFaces } from './CardFaces'

const PHOTO: FakePhoto = { id: 'p1', src: 'https://x/1.webp', caption: '照片 1' }

describe('CardFaces', () => {
  it('渲染正/背照片与动态反光层', () => {
    const { container, getByRole } = render(
      <CardFaces photo={PHOTO} dimmed={false} sheenDelayMs={0} />
    )
    expect(getByRole('img', { name: '照片 1' })).toBeTruthy()
    expect(container.querySelector('img[aria-hidden="true"]')).toBeTruthy()

    const sheen = container.querySelector('[data-testid="card-sheen"]') as HTMLElement
    expect(sheen).toBeTruthy()
    expect(sheen.style.animation).toContain('sheen')
  })

  it('dimmed 时模糊变暗只加在叶子 img 上，反光层不动', () => {
    const { container } = render(<CardFaces photo={PHOTO} dimmed sheenDelayMs={0} />)
    const imgs = container.querySelectorAll('img')
    for (const img of imgs) {
      expect((img as HTMLElement).style.filter).toContain('blur(3px)')
    }
    const sheen = container.querySelector('[data-testid="card-sheen"]') as HTMLElement
    expect(sheen.style.filter).toBe('')
  })

  it('非 dimmed 时 img 无 filter', () => {
    const { container } = render(<CardFaces photo={PHOTO} dimmed={false} sheenDelayMs={0} />)
    for (const img of container.querySelectorAll('img')) {
      expect((img as HTMLElement).style.filter).toBe('')
    }
  })
})
