/** 统一的毛玻璃质感（P4 视觉规范，P7 加内描边高光与 hover 层级） */

/** 内描边高光：玻璃上缘的一条细反光，加进所有玻璃 token 的阴影里 */
const GLASS_INSET_HIGHLIGHT = 'inset_0_1px_0_rgba(255,255,255,0.08)'

/** 圆角面板：卡片、弹窗、表单容器 */
export const glassPanel = `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35),${GLASS_INSET_HIGHLIGHT}]`

/** 全弧胶囊：按钮组、标签、浮动栏 */
export const glassPill = `rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3),${GLASS_INSET_HIGHLIGHT}]`

/** 玻璃面板 hover 态：背景与边框同时提亮（用于可点的相册卡片等） */
export const glassPanelHover =
  'transition-[background-color,border-color,transform,box-shadow] duration-300 hover:border-white/20 hover:bg-white/10'
