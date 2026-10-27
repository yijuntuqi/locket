// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Dock } from './Dock'

describe('Dock', () => {
  it('渲染 children，容器为毛玻璃胶囊', () => {
    const { container, getByRole } = render(
      <Dock>
        <button type="button">心形</button>
      </Dock>
    )
    expect(getByRole('button', { name: '心形' })).toBeTruthy()
    const dock = container.firstElementChild as HTMLElement
    expect(dock.className).toContain('rounded-full')
    expect(dock.className).toContain('backdrop-blur')
  })
})
