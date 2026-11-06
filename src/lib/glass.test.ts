import { describe, expect, it } from 'vitest'
import { glassPanel, glassPanelHover, glassPill } from './glass'

describe('毛玻璃共享类', () => {
  it('面板与胶囊都含 backdrop-blur 与半透明底', () => {
    for (const cls of [glassPanel, glassPill]) {
      expect(cls).toContain('backdrop-blur')
      expect(cls).toContain('bg-white/5')
      expect(cls).toContain('border-white/10')
    }
  })

  it('面板是圆角矩形带投影，胶囊是圆角全弧', () => {
    expect(glassPanel).toContain('rounded-2xl')
    expect(glassPill).toContain('rounded-full')
  })

  it('面板与胶囊都带内描边高光（上缘细反光）', () => {
    for (const cls of [glassPanel, glassPill]) {
      expect(cls).toContain('inset_0_1px_0_rgba(255,255,255,0.08)')
    }
  })

  it('hover 态提亮背景与边框', () => {
    expect(glassPanelHover).toContain('hover:bg-white/10')
    expect(glassPanelHover).toContain('hover:border-white/20')
  })
})
