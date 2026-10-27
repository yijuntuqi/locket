// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ControlsBar } from './ControlsBar'
import { WALL_LAYOUTS } from '@/lib/layouts'

afterEach(cleanup)

describe('ControlsBar', () => {
  it('显示当前布局名与自动旋转开关', () => {
    const { getByRole } = render(
      <ControlsBar
        currentLayout="cylinder"
        onLayoutChange={() => undefined}
        autoRotate
        onToggleAutoRotate={() => undefined}
        disabled={false}
      />
    )
    expect(getByRole('button', { name: '布局：圆柱墙' })).toBeTruthy()
    expect(getByRole('button', { name: '自动旋转' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('点击布局按钮展开全部选项，点选回调', () => {
    const onLayoutChange = vi.fn()
    const { getByRole } = render(
      <ControlsBar
        currentLayout="cylinder"
        onLayoutChange={onLayoutChange}
        autoRotate
        onToggleAutoRotate={() => undefined}
        disabled={false}
      />
    )
    fireEvent.click(getByRole('button', { name: '布局：圆柱墙' }))
    // 当前项同时以触发按钮和选项存在，用 getAllByRole
    expect(screen.getAllByRole('button', { name: '布局：圆柱墙' }).length).toBe(2)
    for (const l of WALL_LAYOUTS) {
      expect(screen.getAllByRole('button', { name: `布局：${l.label}` }).length).toBeGreaterThan(0)
    }
    fireEvent.click(getByRole('button', { name: '布局：球形展厅' }))
    expect(onLayoutChange).toHaveBeenCalledWith('sphere')
  })

  it('disabled 时全部禁用', () => {
    const { getByRole } = render(
      <ControlsBar
        currentLayout="cylinder"
        onLayoutChange={() => undefined}
        autoRotate={false}
        onToggleAutoRotate={() => undefined}
        disabled
      />
    )
    expect((getByRole('button', { name: '布局：圆柱墙' }) as HTMLButtonElement).disabled).toBe(true)
    expect((getByRole('button', { name: '自动旋转' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
