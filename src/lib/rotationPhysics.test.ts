import { describe, it, expect } from 'vitest'
import { stepRotation } from './rotationPhysics'

describe('stepRotation', () => {
  it('有惯性速度时角度积分、速度指数衰减', () => {
    const s = stepRotation({ angleDeg: 0, velocityDegPerSec: 100 }, 0.1, 6, 0.8)
    expect(s.angleDeg).toBeCloseTo(10, 5)
    expect(s.velocityDegPerSec).toBeLessThan(100)
    expect(s.velocityDegPerSec).toBeGreaterThan(50)
  })
  it('速度衰减到阈值以下归零并切换为自动旋转', () => {
    let s = { angleDeg: 0, velocityDegPerSec: 0.4 }
    s = stepRotation(s, 0.1, 6, 0.8)
    expect(s.velocityDegPerSec).toBe(0)
    expect(s.angleDeg).toBeCloseTo(0.6, 5) // 0.1s × 6°/s
  })
  it('速度为零时按自动旋转匀速走', () => {
    const s = stepRotation({ angleDeg: 10, velocityDegPerSec: 0 }, 1, 6, 0.8)
    expect(s.angleDeg).toBeCloseTo(16, 5)
  })
})
