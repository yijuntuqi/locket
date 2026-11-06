# P7：视觉大改版——画廊细框 + 排版体系 + 漂移布局 Implementation Plan

**Goal:** 对标包图网照片墙模板的质感基因（实体相框、科技光感、大标题排版、暗场氛围），把全站视觉拉起一档：卡片画廊细框化、全站字体与排版体系、场景入场编排、相册大标题、第 5 种「漂移」布局、相册列表/弹窗/登录页/控制条全面升级。

**Architecture:** 设计 token 全部收进 `src/index.css` @theme + `src/lib/glass.ts`；卡片质感与反光在 `CardFaces`（叶子层，保 preserve-3d）；入场动画用内层 wrapper（只碰 opacity/transform，不压塌 3D）；漂移布局 = 静态几何函数（可测）+ 列容器 rAF 漂移（DOM ref 直更，不走 React state）；vendor react-bits 的 GlareHover / DriftWall 核心改造为项目风格。

**Tech Stack:** 同前（CSS 3D + Tailwind 4 + Supabase），新增运行时依赖仅 `@fontsource-variable/noto-serif-sc`（字体本地打包，无外链）。

**Spec:** 用户 2026-11-06 拍板（画廊细框 / Noto Serif SC 大标题 / 加入漂移布局）；参考素材：react-bits.dev 的 GlareHover、DriftWall（MIT+Commons Clause，个人项目可用）；包图网付费模板仅提取风格基因，不搬素材。

## 前置（用户手动）

```bash
npm install @fontsource-variable/noto-serif-sc
```

Geist / lucide-react / tw-animate-css 均已在 package.json，无需新装。

## Global Constraints

- 沿用 v4 修订：不加运行时动画库（纯 CSS keyframes + rAF）；WebGL 只留背景 Aurora 一个；reduced-motion 全覆盖（新动画一律加进 index.css 的 reduce 块）。
- 3D 铁律：filter/opacity 不加在 preserve-3d 容器上，只加叶子；入场动画只用 opacity+transform。
- 动画只碰 transform/opacity（compositor 层），blur 只在叶子。
- main 直提中文 Conventional Commits；TDD：先写失败测试再实现。

## Review Focus

- 卡片相框改造后 4 种既有布局不回归（背面镜像、dim 景深、sheen→glare 替换、删除按钮可达）。
- WallCard 补 `group` class（修复 sphere/scatter/spiral 下 hover 删除钮不出现的 bug）。
- 入场 stagger 总时长 ≤ 1.2s（delay clamp）；布局切换重挂载触发入场而非瞬变。
- drift 布局 reduced-motion 下漂移停住成静态透视墙；autoRotate 开关对 drift 禁用。
- migration 0005 约束名与 0004 一致（`albums_wall_layout_check`），白名单外值回退 cylinder 逻辑不破。

---

### Task 1: 设计系统——字体、色彩 token、毛玻璃层级

**Files:**
- Modify: `src/index.css`、`src/main.tsx`、`src/lib/glass.ts` + Test: `src/lib/glass.test.ts`

**Interfaces:**
- `main.tsx` 顶部 `import '@fontsource-variable/geist'` + `import '@fontsource-variable/noto-serif-sc'`。
- index.css @theme 增：`--font-sans: 'Geist Variable', ui-sans-serif, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif`、`--font-display: 'Noto Serif SC Variable', 'Songti SC', 'SimSun', serif`、品牌色 `--color-void: #05060f`（全站背景基准）、`--color-gilt: #e8c98a`（香槟金强调）、`--color-gilt-deep: #b8935a`；body 默认 font-sans；新增 utility class `.font-display-gradient`（白→gilt 微渐变 bg-clip-text）。
- 新 keyframes：`twinkle`（opacity 0.65↔1）、`rise-in`（opacity 0→1 + translateZ(-96px)→0）、`fade-blur-in`（opacity+blur 8px→0，仅 2D 页面用）、`pop-in`（scale 0.96→1，弹窗用）。
- glass.ts：`glassPanel`/`glassPill` 加内描边高光 `inset 0 1px 0 rgba(255,255,255,0.08)`；新增 `glassPanelHover`（hover:bg-white/10 + 边框提亮）。
- Starfield 三层加 twinkle 错峰（8s/11s/14s）。
- reduce 块扩为覆盖全部新动画选择器。

**Steps:** 写失败测试（glass.test.ts 断言新 class）→ 实现 → 全量测试 + build → Commit `feat(ui): 设计系统——字体加载、品牌色彩 token、毛玻璃层级`。

### Task 2: 卡片画廊细框质感（白边相框 + 多层投影 + glare 反光）

**Files:**
- Modify: `src/components/wall/CardFaces.tsx`（+Test）、`src/components/wall/WallCard.tsx`（+Test）
- Create: `src/components/wall/GlareLayer.tsx`（vendor react-bits GlareHover 核心：CSS 变量 --gx/--gy 驱动的光带 overlay，pointerenter 按进入边算方向；hover:none 设备退化为 7s 周期自动扫）
- Delete: 旧 `sheen` keyframes 及 card-sheen overlay（被 glare 取代）

**Interfaces:**
- `CardFaces` 新 prop `framePadPx: number`（各布局按 widthPx 传 `Math.min(6, widthPx * 0.045)`）。
- 卡片结构：正面 = frame div（白底 `#faf8f4`、padding framePadPx、rounded-2xl、多层 box-shadow `0 2px 6px rgba(0,0,0,0.45), 0 18px 44px rgba(0,0,0,0.35)`、内描边 `inset 0 0 0 1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)`）> img（rounded-lg）；背面 frame 同构但背板 `#1c1f2b`、img opacity 0.5；dimmed filter 仍只加在 img 上。
- `WallCard` 容器补 `group` class（bug 修复）；删除按钮换 lucide `X` 图标。

**Steps:** 失败测试（card-frame 存在、内描边样式、glare overlay data-testid、WallCard 含 group、4 布局快照不回归）→ 实现 → 全量 + build → Commit `feat(wall): 画廊细框卡片——白边相框、多层投影、glare 反光（修 group-hover）`。

### Task 3: 场景入场编排 + 相册大标题 + 空状态

**Files:**
- Modify: `src/components/wall/WallCard.tsx`（内层 rise-in wrapper：`animation: rise-in 0.7s cubic-bezier(0.22,1,0.36,1) both`，delay `Math.min(i * 45, 900)`ms，wrapper 保持 preserve-3d）
- Create: `src/components/wall/SceneTitle.tsx` + Test
- Modify: `src/pages/WallPage.tsx`（+Test）、`src/components/Backdrop.tsx`、各布局组件传 index 给 WallCard（已有 i）

**Interfaces:**
- `SceneTitle: ({ name, photoCount }) => JSX` —— 场景顶部居中 `absolute top-10 z-10 pointer-events-none`，相册名 `font-display text-5xl md:text-7xl font-black tracking-[0.12em] font-display-gradient`，meta 行 `text-white/60`（`N 张照片`），底部 mask 渐隐（mask-image linear-gradient）。
- 空状态（WallPage）：居中 lucide `Images` 图标 + font-display 引导语 + UploadButton 常驻按钮。

**Steps:** 失败测试（SceneTitle 渲染名称/张数；WallCard rise-in delay 样式；空状态含引导与上传）→ 实现 → 全量 + build → Commit `feat(wall): 入场 stagger 编排、相册大标题排版、空状态设计`。

### Task 4: 第 5 布局「漂移」（vendor DriftWall 改造）

**Files:**
- Create: `src/lib/layouts/driftGeometry.ts` + Test、`src/components/wall/DriftWall.tsx` + Test
- Modify: `src/lib/layouts.ts`（type 加 `'drift'`，label「漂移墙」）、`src/components/wall/WallScene.tsx`、`src/components/wall/ControlsBar.tsx`（+Test：5 选项；drift 时自转开关 disabled）
- Create: `supabase/migrations/0005_drift_layout.sql`

**Interfaces:**
- `computeDriftPlacements(count, vw, vh): { col, row, x, y, widthPx }[]`——cols = clamp(3, floor(vw/220), 6)，tile 宽 190、gap 16，x/y 为相对屏幕中心的格点坐标（确定性、无 NaN、count 0/1 边界）。
- `DriftWall`：外层 perspective 1200 + `rotateX(14deg) rotateY(-8deg)`；每列一个列容器（preserve-3d），rAF 直更列容器 translateY 实现无限上漂（不进 React state）；卡片仍用 WallCard 统一相框质感，transform = `translate(-50%,-50%) translate3d(x,y,0)`；hover 浮出 translateZ(56px) + 删除按钮；外壳 mask-image（radial + linear 双重渐隐，从 vendor CSS 抄）；reduced-motion 停漂。
- migration 0005：`drop constraint albums_wall_layout_check` → 重建含 `'drift'`。**需用户在 Supabase Dashboard SQL Editor 手动执行。**

**Steps:** 失败测试（几何确定性/边界；DriftWall 渲染卡片数与 mask；ControlsBar 5 选项 + drift 禁自转；WallPage 分发 drift）→ 实现 → 全量 + build → Commit `feat(wall): 第五布局「漂移」——透视漂移墙（vendor DriftWall 改造）`。

### Task 5: 相册列表 / 弹窗 / 登录页 / 控制条升级

**Files:**
- Modify: `src/lib/photos.ts`（+Test：`getAlbumSummary(albumId): Promise<{ coverUrl: string | null; count: number }>`，两次轻查询：count + sort_order 首图）、`src/lib/albums.ts`（`listAlbumsWithSummaries()` 并发聚合）
- Modify: `src/pages/AlbumsPage.tsx`（+Test）、`src/components/albums/AlbumDialog.tsx`、`src/pages/LoginPage.tsx`（+Test）、`src/components/wall/ControlsBar.tsx`、`src/index.css`（@import tw-animate-css）

**Interfaces:**
- 相册卡片：竖版封面（无封面用 lucide `Images` 占位 + 渐变底）+ 底部渐隐遮罩 + font-display 相册名 + 张数 pill；hover `-translate-y-1` 阴影加深 + GlareLayer；入场 fade-blur-in stagger（i*70ms）。
- 页头：「我的相册」font-display text-4xl + 新建按钮 glassPill + lucide `Plus` + hover 态。
- AlbumDialog：遮罩 `bg-black/60 backdrop-blur-sm`，面板 glassPanel + `animate-in fade-in zoom-in-95`（tw-animate），关闭即卸载；删除确认弹窗同语言。
- LoginPage：顶部 Locket 字标（font-display + gilt 渐变）+ 表单排版统一。
- ControlsBar：每布局配 lucide 图标（cylinder=Columns3, sphere=Orbit, scatter=Sparkles, spiral=Shell, drift=Waves），菜单展开 scale/opacity 动画（origin-right 0.15s），自转开关 RotateCw 图标。

**Steps:** 失败测试（封面/张数渲染、无封面占位、dialog glass class 与动画 class、控制条图标 aria）→ 实现 → 全量 + build → Commit `feat(ui): 相册封面卡片、弹窗毛玻璃化、登录页与控制条图标化`。

### Task 6: 清理与全站验收

**Files:**
- Modify: `package.json`（移除死依赖 ogl——npm uninstall 由用户执行）
- 核对清单：EdgeReveal/弹窗/drift/twinkle/glare/rise-in 的 reduced-motion 覆盖；4+1 布局 × 桌面(1280)/移动(375) 截图走查

**Steps:** `npx vitest run` 全绿 + `npm run build` + `npm run lint` → dev server + playwright 截图走查（含 reduced-motion 模拟）→ 用户执行 `npm uninstall ogl` → migration 0005 应用确认 → Commit `chore(ui): 移除死依赖 ogl，reduced-motion 全覆盖核对`。

## 验证

1. 每任务 `npx vitest run` 全绿、`npm run build` 通过（tsc -b）。
2. `npm run dev` 后 playwright 截图：相册列表、登录页、5 种布局、弹窗、空状态；375px 移动端宽度复查不溢出。
3. 用户在 Supabase Dashboard 执行 migration 0005 后，切到漂移布局 → 刷新 → 布局保持。
