// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Dock } from './Dock'

describe('Dock', () => {
  it('渲染 children，容器为底部居中浮动栏', () => {
    const { container, getByRole } = render(
      <Dock>
        <button type="button">导出 PNG</button>
      </Dock>
    )
    expect(getByRole('button', { name: '导出 PNG' })).toBeTruthy()
    const dock = container.firstElementChild as HTMLElement
    expect(dock.className).toContain('fixed')
    expect(dock.className).toContain('bottom-5')
  })
})
