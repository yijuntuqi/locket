export interface WallPlacement {
  angleDeg: number
  radiusPx: number
}

const MIN_RADIUS_PX = 320

export function computeRadius(count: number, cardWidthPx: number, gapPx: number): number {
  if (count <= 0) return MIN_RADIUS_PX
  return Math.max(MIN_RADIUS_PX, ((cardWidthPx + gapPx) * count) / (2 * Math.PI))
}

export function computePlacements(
  count: number,
  cardWidthPx: number,
  gapPx: number
): WallPlacement[] {
  if (count <= 0) return []
  const radiusPx = computeRadius(count, cardWidthPx, gapPx)
  return Array.from({ length: count }, (_, i) => ({
    angleDeg: (i * 360) / count,
    radiusPx,
  }))
}

const MIN_SCALE = 0.35

export function computeResponsiveScale(
  containerWidthPx: number,
  radiusPx: number,
  cardWidthPx: number
): number {
  const neededPx = 2 * radiusPx + cardWidthPx
  if (neededPx <= 0) return 1
  return Math.max(MIN_SCALE, Math.min(1, containerWidthPx / neededPx))
}
