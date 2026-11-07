/** 漂移墙几何：透视瓷砖墙的静态格点 + 每列循环序列（漂移动画由组件 rAF 驱动） */

export interface DriftColumnSpec {
  /** 该列展示的照片下标序列（tiles[r] = photos[r % photos.length]，内容周期 = photos.length） */
  photos: number[]
  /** 实际渲染的瓦片数：≥ 填满视口所需，且是 photos.length 的整数倍（保证回绕无缝） */
  tiles: number[]
  /** 该列回绕周期（px）：translateY 位移取模此值 */
  cycleHeightPx: number
  /** 列中心相对场景中心的 x 坐标（px） */
  xPx: number
}

export interface DriftLayoutSpec {
  cols: number
  tileWidthPx: number
  tileHeightPx: number
  gapPx: number
  columns: DriftColumnSpec[]
}

export const DRIFT_TILE_WIDTH = 190
export const DRIFT_TILE_HEIGHT = Math.round((DRIFT_TILE_WIDTH * 4) / 3)
export const DRIFT_GAP = 16
/** 自动漂移速度（px/s），向上 */
export const DRIFT_SPEED_PX_PER_SEC = 42

/** 透视漂移墙的静态格点：列数按视口宽自适应，每列独立无缝循环 */
export function computeDriftLayout(count: number, vw: number, vh: number): DriftLayoutSpec {
  const tileHeightPx = DRIFT_TILE_HEIGHT
  const gapPx = DRIFT_GAP
  if (count <= 0 || vw <= 0 || vh <= 0) {
    return { cols: 0, tileWidthPx: DRIFT_TILE_WIDTH, tileHeightPx, gapPx, columns: [] }
  }
  // 列数：视口宽决定基准，≤6 列封顶，且不超过照片数（照片少时不开空列）
  const cols = Math.min(6, count, Math.max(3, Math.floor(vw / (DRIFT_TILE_WIDTH + gapPx))))
  // 填满视口（上下各多留一张高）所需行数
  const minRows = Math.ceil((vh + tileHeightPx * 2) / (tileHeightPx + gapPx))
  // 照片按列轮转分配（列间均衡）
  const perCol: number[][] = Array.from({ length: cols }, () => [])
  for (let i = 0; i < count; i++) perCol[i % cols].push(i)

  const columns = perCol.map((photos, c) => {
    const len = photos.length
    const step = tileHeightPx + gapPx
    // 内容周期：≥ 静态铺满所需，且是 len 的整数倍（保证 y=0 与 y=cycle 处内容一致，回绕无缝）
    const periodRows = Math.ceil(minRows / len) * len
    // 回绕补位：列上移接近一个周期时，视口底部需要下一周期的开头瓦片接上（否则底部露出空墙）
    const wrapRows = Math.ceil((vh + tileHeightPx) / step)
    const tilesCount = periodRows + wrapRows
    const tiles = Array.from({ length: tilesCount }, (_, r) => photos[r % len])
    return {
      photos,
      tiles,
      cycleHeightPx: periodRows * step,
      xPx: (c - (cols - 1) / 2) * (DRIFT_TILE_WIDTH + gapPx),
    }
  })

  return { cols, tileWidthPx: DRIFT_TILE_WIDTH, tileHeightPx, gapPx, columns }
}
