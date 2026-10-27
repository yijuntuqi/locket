import { computePlacements, computeRadius, computeResponsiveScale } from './wallGeometry'

export interface WallExportPhoto {
  id: string
  url: string
}

export interface WallCardPlacement {
  /** photos 数组中的下标 */
  index: number
  x: number
  y: number
  width: number
  opacity: number
  depth: number
}

/** 确定性伪随机数（极光星星布局，保证每次导出一致） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 与 CSS 3D 墙同一套参数（wallGeometry）+ 透视投影，按当前旋转角计算导出落点。
 * 只保留朝向观察者的卡片（cos φ > 0.05），按远→近排序供绘制。
 */
export function layoutWallCards(
  count: number,
  width: number,
  height: number,
  angleDeg: number,
  cardWidthPx = 240,
  gapPx = 24,
  perspective = 1200,
  tiltDeg = -18
): WallCardPlacement[] {
  if (count === 0) return []
  const baseRadius = computeRadius(count, cardWidthPx, gapPx)
  const layoutScale = computeResponsiveScale(width, baseRadius, cardWidthPx)
  const scaledWidth = Math.round(cardWidthPx * layoutScale)
  const scaledGap = Math.round(gapPx * layoutScale)
  const placements = computePlacements(count, scaledWidth, scaledGap)
  const radius = placements[0].radiusPx
  const tiltRad = (tiltDeg * Math.PI) / 180

  const result: WallCardPlacement[] = []
  placements.forEach((p, index) => {
    const phi = ((p.angleDeg + angleDeg) * Math.PI) / 180
    const cos = Math.cos(phi)
    // 可见弧放宽到 cos > -0.3：正前 + 两侧入画，呈现 3D 层次
    if (cos < -0.3) return
    const xC = radius * Math.sin(phi)
    const zC = radius * (cos - 1)
    const yT = -zC * Math.sin(tiltRad)
    const zT = zC * Math.cos(tiltRad)
    const factor = perspective / (perspective - zT)
    result.push({
      index,
      x: width / 2 + xC * factor,
      y: height / 2 - yT * factor,
      // 横向透视收窄：与 CSS rotateY 的视觉效果一致
      width: scaledWidth * factor * Math.abs(cos),
      opacity: cos > 0 ? Math.min(1, 0.75 + cos * 0.25) : 0.6,
      depth: zT,
    })
  })
  result.sort((a, b) => a.depth - b.depth)
  return result
}

/** 极光背景：深色底 + 青/紫/粉辉光 + 星星（对齐站内的深色极光风格） */
export function drawAuroraBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rand: () => number = mulberry32(42)
): void {
  ctx.save()
  const base = ctx.createLinearGradient(0, 0, 0, height)
  base.addColorStop(0, '#050510')
  base.addColorStop(1, '#100d24')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  const maxDim = Math.max(width, height)
  const blobs = [
    { x: 0.2, y: 0.15, r: 0.75, color: 'rgba(20, 184, 166, 0.20)' },
    { x: 0.85, y: 0.3, r: 0.7, color: 'rgba(139, 92, 246, 0.18)' },
    { x: 0.15, y: 0.85, r: 0.7, color: 'rgba(236, 72, 153, 0.14)' },
    { x: 0.6, y: 0.7, r: 0.6, color: 'rgba(56, 189, 248, 0.12)' },
  ] as const
  ctx.globalCompositeOperation = 'lighter'
  for (const b of blobs) {
    const bx = b.x * width
    const by = b.y * height
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r * maxDim)
    g.addColorStop(0, b.color)
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }
  ctx.globalCompositeOperation = 'source-over'

  for (let i = 0; i < 90; i++) {
    const x = rand() * width
    const y = rand() * height
    const r = 0.8 + rand() * 1.4
    ctx.globalAlpha = 0.2 + rand() * 0.6
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('照片加载失败：' + url))
    img.src = url
  })
}

function traceCardPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  p: WallCardPlacement
): void {
  const w = p.width
  const h = (w * 4) / 3
  const x = p.x - w / 2
  const y = p.y - h / 2
  const r = Math.min(16, w * 0.07)

  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = Math.max(12, w * 0.14)
  ctx.shadowOffsetY = w * 0.03
  traceCardPath(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
  ctx.lineWidth = Math.max(1, w * 0.004)
  traceCardPath(ctx, x, y, w, h, r)
  ctx.stroke()
  ctx.restore()
}

export async function renderWallToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  photos: WallExportPhoto[],
  angleDeg: number
): Promise<void> {
  drawAuroraBackground(ctx, width, height)
  const placements = layoutWallCards(photos.length, width, height, angleDeg)
  const images = await Promise.all(photos.map((p) => loadImage(p.url)))
  for (const p of placements) {
    drawCard(ctx, images[p.index], p)
  }
}

export async function exportWallPng(
  photos: WallExportPhoto[],
  angleDeg: number,
  filename: string,
  width = window.innerWidth,
  height = window.innerHeight
): Promise<void> {
  const ratio = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.scale(ratio, ratio)
  await renderWallToCanvas(ctx, width, height, photos, angleDeg)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG 编码失败'))),
      'image/png'
    )
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
