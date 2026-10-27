export interface ScatterPlacement {
  x: number
  y: number
  rotateDeg: number
  scale: number
  driftDelayMs: number
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MIN_DISTANCE = 140
const PAD = 90

/** 散落拍立得：种子确定性散布 + 拒绝采样防密集堆叠（拍立得允许轻微叠放）+ 随机角度/缩放 */
export function computeScatterPlacements(
  count: number,
  width: number,
  height: number,
  seed = 23
): ScatterPlacement[] {
  if (count <= 0 || width <= 0 || height <= 0) return []
  const rand = mulberry32(seed)
  const result: ScatterPlacement[] = []
  for (let i = 0; i < count; i++) {
    let x = width / 2
    let y = height / 2
    let ok = false
    for (let attempt = 0; attempt < 80 && !ok; attempt++) {
      const nx = PAD + rand() * Math.max(1, width - PAD * 2)
      const ny = PAD + rand() * Math.max(1, height - PAD * 2)
      const clear = result.every(
        (p) => Math.hypot(p.x - nx, p.y - ny) >= MIN_DISTANCE
      )
      if (clear || attempt === 79) {
        x = nx
        y = ny
        ok = true
      }
    }
    result.push({
      x,
      y,
      rotateDeg: Math.round((rand() * 2 - 1) * 15),
      scale: Math.round((0.8 + rand() * 0.45) * 100) / 100,
      driftDelayMs: Math.round(rand() * 6000),
    })
  }
  return result
}
