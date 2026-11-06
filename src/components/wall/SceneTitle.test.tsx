// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SceneTitle } from './SceneTitle'

afterEach(cleanup)

describe('SceneTitle 场景大标题', () => {
  it('渲染相册名（display 字体 + 渐变）与照片计数，不挡交互', () => {
    const { getByText, getByTestId } = render(
      <SceneTitle name="旅行日记" photoCount={42} />
    )
    const title = getByText('旅行日记')
    expect(title.className).toContain('font-display')
    expect(title.className).toContain('font-display-gradient')
    expect(getByText('42 张照片')).toBeTruthy()
    expect(getByTestId('scene-title').className).toContain('pointer-events-none')
  })

  it('底部渐隐 mask 让文字融入场景', () => {
    const { getByTestId } = render(<SceneTitle name="相册" photoCount={1} />)
    const el = getByTestId('scene-title') as HTMLElement
    expect(el.style.maskImage).toContain('linear-gradient')
  })
})
