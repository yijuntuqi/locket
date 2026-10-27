export interface SpiralPlacement {
  angleDeg: number
  z: number
}

const GOLDEN_ANGLE_DEG = 137.5

/** 螺旋隧道：照片沿黄金角螺旋纵深排开，拖拽旋转产生穿越感 */
export function computeSpiralPlacements(count: number): SpiralPlacement[] {
  if (count <= 0) return []
  const depthStep = Math.min(260, Math.max(90, Math.round(2600 / count)))
  const result: SpiralPlacement[] = []
  for (let i = 0; i < count; i++) {
    result.push({
      angleDeg: Math.round((GOLDEN_ANGLE_DEG * i) % 360),
      z: -i * depthStep,
    })
  }
  return result
}
