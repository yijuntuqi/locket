# P4：导出 PNG + 心形模式 + 打包下载 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 相册页新增浮动 Dock：一键把当前 3D 墙（或心形聚合）导出为 PNG 发朋友圈，心形模式动画聚合照片，整相册打包下载 zip 带进度。

**Architecture:** 导出与打包都是纯前端能力：`html-to-image` 截 DOM 生成 PNG（spec 指定的 spike 项，先验证 `preserve-3d` 兼容性），`jszip` 逐张拉取签名 URL 流式打包。心形模式用心形参数方程计算照片目标坐标（纯函数可测），入场动画用 CSS transition。Dock 是浮于底部的玻璃质感按钮栏。

**Tech Stack:** Vite + React 19 + TS strict + Tailwind 4 + html-to-image + jszip + vitest（jsdom）。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（§6 3D 墙与导出、§7 页面结构 3、§8 P4 行）

## Global Constraints

- 每个用户只能读写自己名下的行（RLS owner 级）；永远不在前端出现 service_role key。
- npm 安装一律 `npm install --maxsockets=4`（E 盘 exFAT 并发解压会丢文件）。
- 环境变量用 `VITE_` 前缀 + `import.meta.env` 读取。
- 测试文件顶部 `// @vitest-environment jsdom`；ResizeObserver / matchMedia 在 beforeAll 里 stub；mock 模块用 `vi.hoisted`。
- 提交直接进 main，Conventional Commits，中文正文。
- 数据库 migration 走 Supabase MCP `apply_migration`，文件名 `supabase/migrations/NNNN_name.sql`（P4 预计无 migration，若需要再补）。

## Review Focus

- `html-to-image` 对 CSS 3D（preserve-3d、will-change、半透明镜像背板）的真实渲染效果——这是 spec 点名的 spike 风险，Task 1 末尾必须人工验证。
- 导出 PNG 的观感：深色背景、2 倍像素密度，朋友圈直接可用。
- 打包下载中途某张失败：整包中断并明确报错，不留残缺 zip。
- 心形模式在照片极少（1~3 张）时形状仍可读、不重叠出界。
- 导出的节点引用在切换视图/相册后必须失效安全（不导出错误内容）。

---

### Task 1: spike — 依赖 + 导出 PNG（3D 墙）+ Dock 骨架

**Files:**
- Modify: `package.json`（依赖：html-to-image、jszip）
- Create: `src/lib/exportPng.ts`；Test: `src/lib/exportPng.test.ts`
- Create: `src/components/wall/Dock.tsx`；Test: `src/components/wall/Dock.test.tsx`
- Modify: `src/pages/WallPage.tsx`、`src/pages/WallPage.test.tsx`

**Interfaces:**
- Produces:
  - `exportNodeToPng(node: HTMLElement, filename: string): Promise<void>`（`src/lib/exportPng.ts`）——`toPng(node, { pixelRatio: 2, backgroundColor: '#0b0b10', cacheBust: true })` 生成 dataURL，经 `<a download>` 触发下载；失败抛错。
  - `Dock: (props: { children: React.ReactNode }) => JSX` —— 底部居中浮动玻璃栏（`fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-1.5 backdrop-blur`）。
- Consumes: 无新依赖（html-to-image、jszip 本 Task 一并装上，jszip Task 2 才用）。

- [ ] **Step 1: 装依赖**

```bash
npm install html-to-image jszip --maxsockets=4
```

装完跑 `node /c/Users/45732/AppData/Local/Temp/verify-nm.js "E:\old-new\backup\BNU_leaning\locket\node_modules"` 确认无损坏包。

- [ ] **Step 2: 写失败测试**

`src/lib/exportPng.test.ts`：mock `html-to-image`（`vi.hoisted` + `vi.mock`，`toPng: vi.fn(async () => 'data:image/png;base64,x')`）；stub `URL.createObjectURL`？（本实现走 dataURL + a.click，不需 createObjectURL；spy `HTMLAnchorElement.prototype.click`）。
- `toPng 以 pixelRatio 2 和深色背景被调用，filename 作为下载名`：断言 `toPng` 收到 node 与 `{ pixelRatio: 2, backgroundColor: '#0b0b10', cacheBust: true }`，且 anchor 的 `download` 属性为 filename、`click` 被调。
- `toPng 失败时抛错`：toPng reject → `exportNodeToPng` reject。

`src/components/wall/Dock.test.tsx`：渲染 `<Dock><button>导出 PNG</button></Dock>` → 按钮在 DOM 中且父级带 `fixed` 类。

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/exportPng.test.ts src/components/wall/Dock.test.tsx`
预期：模块不存在导入报错。

- [ ] **Step 4: 实现**

按签名实现 `exportPng.ts` 与 `Dock.tsx`。

- [ ] **Step 5: WallPage 接线（3D 墙导出）**

- WallPage 的 wall 渲染外包一层 `<div ref={wallExportRef} className="h-full">`（含空态分支外的 PhotoWall 区域）。
- 渲染 `<Dock>` 于根部（所有视图可见；位置在 `uploadMessage` 提示附近，z-index 低于灯箱）。
- Dock 内放第一个按钮「导出 PNG」：`onClick` 调 `exportNodeToPng(wallExportRef.current, \`locket-${album.name}.png\`)`，成功 `toast.success('已导出 PNG')`，失败 `toast.error`；`viewMode !== 'wall'` 或 heartMode 下 disabled（heartMode Task 3 才引入，本 Task 只判断 viewMode）。

`src/pages/WallPage.test.tsx` 追加（沿用现有 mock 与 `renderAlbumPage`）：
- Dock 出现在相册页，含「导出 PNG」按钮。
- 时间轴视图下「导出 PNG」按钮 `disabled`。
- mock `@/lib/exportPng` 的 `exportNodeToPng`，点按钮（3D 墙视图）→ 被调用一次。

- [ ] **Step 6: 全量测试 + 构建**

Run: `npx vitest run && npm run build` → 全绿、构建通过。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(wall): 导出 3D 墙 PNG（html-to-image spike）与 Dock 骨架"
```

- [ ] **Step 8: 人工 spike 验收（阻塞点）**

本地 `npm run dev`：往相册传几张照片，点「导出 PNG」，检查导出的图片：
1. 照片清晰无错位（`preserve-3d` 没翻车）；
2. 深色背景、整体观感可直接发朋友圈。
通过 → 继续 Task 2。**若翻车（元素拍扁/丢失/黑块）→ 停下告知用户，启用兜底方案（canvas 按当前角度重绘，另写补丁任务）。**

### Task 2: 打包下载 zip（jszip 流式 + 进度）

**Files:**
- Create: `src/lib/zipDownload.ts`；Test: `src/lib/zipDownload.test.ts`
- Modify: `src/components/wall/Dock.tsx`、`src/pages/WallPage.tsx`、`src/pages/WallPage.test.tsx`

**Interfaces:**
- Produces:
  - `downloadAlbumZip(files: { name: string; url: string }[], onProgress: (percent: number) => void): Promise<void>`（`src/lib/zipDownload.ts`）——`new JSZip()`，逐张 `fetch` → `zip.file(name, blob)`；`generateAsync({ type: 'blob' }, meta => onProgress(meta.percent))`；`URL.createObjectURL` + `<a download="locket-photos.zip">` 触发下载后 `revokeObjectURL`。任一张 fetch 失败即抛错（fail-fast，不留残缺 zip）。
  - Dock 追加 prop 无需变化（ children 组合）；WallPage 提供「打包下载」按钮与进度状态。
- Consumes: Task 1 `Dock`。

- [ ] **Step 1: 写失败测试**

`src/lib/zipDownload.test.ts`：mock `jszip`（`vi.hoisted`：实例方法 `file: vi.fn()`、`generateAsync: vi.fn(async (opts, cb) => { cb({ percent: 100 }); return new Blob(['x']) })`）；mock `fetch` 返回 `{ ok: true, blob: async () => new Blob(['x']) }`；stub `URL.createObjectURL/revokeObjectURL`；spy `HTMLAnchorElement.prototype.click`。
- `逐张 fetch 并 zip.file，文件名与顺序一致，完成后触发下载`。
- `generateAsync 的进度回调透传给 onProgress`（断言回调收到 100）。
- `某张 fetch 非 ok 时抛错且不触发下载`。

- [ ] **Step 2: 跑测试确认失败** → 导入报错。

- [ ] **Step 3: 实现 `zipDownload.ts`** 按签名。

- [ ] **Step 4: WallPage 接线**

- 状态 `zipping: boolean` + `zipProgress: number | null`；Dock 内加「打包下载」按钮（所有视图可用；`photos.length === 0` 或 zipping 时 disabled）。
- 点击：`setZipping(true)`，构造 `files = photos.map((p, i) => ({ name: \`\${String(i + 1).padStart(3, '0')}-\${p.id}.webp\`, url: p.url }))`，`await downloadAlbumZip(files, setZipProgress)`；成功 `toast.success('打包下载完成')`；失败 `toast.error`；finally 复位。
- 进度显示：zipping 时 Dock 内显示 `\`打包中 ${Math.round(zipProgress ?? 0)}%\`` 文本替换按钮文案（或按钮旁小字，取实现简洁者）。

`src/pages/WallPage.test.tsx` 追加：
- mock `@/lib/zipDownload`；点「打包下载」→ `downloadAlbumZip` 以 2 张照片的文件名数组（`001-<id>.webp` 格式）被调用。

- [ ] **Step 5: 全量测试 + 构建** → 全绿。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(wall): 相册打包下载 zip（jszip 流式 + 进度显示）"
```

### Task 3: 心形模式（参数方程聚合 + 动画 + 导出）

**Files:**
- Create: `src/lib/heartGeometry.ts`；Test: `src/lib/heartGeometry.test.ts`
- Create: `src/components/wall/HeartCanvas.tsx`；Test: `src/components/wall/HeartCanvas.test.tsx`
- Modify: `src/pages/WallPage.tsx`、`src/pages/WallPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 `exportNodeToPng`、`Dock`；`FakePhoto`（`src/lib/fakePhotos.ts`）。
- Produces:
  - `HeartPlacement { x: number; y: number; scale: number }`；`computeHeartPlacements(count: number, width: number, height: number): HeartPlacement[]`（`src/lib/heartGeometry.ts`）——心形参数方程 `hx = 16·sin³t`，`hy = 13cos t − 5cos2t − 2cos3t − cos4t`，`t = (i / count) · 2π`；y 轴翻转（屏幕向下为正）；等比缩放适配 `width/height`（留 10% 边距）；`scale = min(width, height) / 900`（卡片基准宽 240 的观感系数）。
  - `HeartCanvas: (props: { photos: FakePhoto[]; width: number; height: number }) => JSX` ——相对定位容器；每张照片 `position: absolute; left: x; top: y; transform: translate(-50%, -50%) scale(0)`，挂载后过渡为 `scale(sp.scale)`（`transition: transform 0.6s ease`，`transitionDelay: i * 40ms`，卡片宽 `240 * scale`）；照片为圆角阴影卡片（与墙卡片同款观感）。

- [ ] **Step 1: 写失败测试**

`src/lib/heartGeometry.test.ts`：
- `数量为 count，结果确定（两次调用完全一致）`。
- `所有点落在边距内（0 < x < width, 0 < y < height）`（count 取 5、20、60 各验一次）。

`src/components/wall/HeartCanvas.test.tsx`（stub ResizeObserver/matchMedia 不需要；组件接收 width/height，无 DOM 测量）：
- 渲染 3 张照片 → 3 个 `img`，每张照片外层 style 含 `transition` 且初始 transform 为 `scale(0)`（jsdom 不跑过渡，直接断言挂载时的内联 style 由实现决定——实现约定：初始 style 直接写目标 transform，动画由 CSS transition + 挂载后 rAF 切类触发；测试断言最终 transform 含 `translate(-50%, -50%) scale(` 与 left/top 来自 `computeHeartPlacements`）。

`src/pages/WallPage.test.tsx` 追加：
- 3D 墙视图点 Dock「心形」→ 出现 heart 容器（`data-testid="heart-canvas"`）；再点「心形」（或「返回墙」）→ 恢复 PhotoWall 拖拽面（`data-testid="wall-drag-surface"` 再现）。
- 心形模式下「导出 PNG」enabled，点击 → `exportNodeToPng` 被调（导出的是 heart 容器节点，通过 wallExportRef 指向同一包裹层实现）。

- [ ] **Step 2: 跑测试确认失败** → 导入报错 / 按钮不存在。

- [ ] **Step 3: 实现** 按签名；WallPage 加 `heartMode: boolean`（切相册/切视图时复位 false），heartMode 时 wall 区域渲染 `<HeartCanvas photos={wallItems} width={容器宽} height={容器高}>`——容器尺寸用现有 `containerRef` 模式（ResizeObserver）或直接用 `window.innerWidth/innerHeight` 近似（取实现简洁者，计划不锁定）；「心形」按钮 toggle，`viewMode !== 'wall'` 时 disabled。

- [ ] **Step 4: 全量测试 + 构建** → 全绿。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(wall): 心形聚合模式（参数方程 + 入场动画 + 导出）"
```

- [ ] **Step 6: 人工 spike 验收（阻塞点）**

`npm run dev`：开 10+ 张照片的相册点心形 → 照片聚成爱心、动画顺滑、不重叠出界；导出的 PNG 爱心完整。**翻车（重叠/出界/动画卡）→ 停下告知用户再定。**

### Task 4: Dock 补全（自动旋转开关）+ 收尾

**Files:**
- Modify: `src/hooks/usePhotoWallRotation.ts`、`src/components/wall/Dock.tsx`、`src/pages/WallPage.tsx`
- Modify: 对应测试文件

**Interfaces:**
- Consumes: Task 1~3 全部。
- Produces:
  - `usePhotoWallRotation` 新可选参数 `autoRotateDegPerSec`（已有，WallPage 现在显式传入）：WallPage 持 `autoRotate: boolean`（默认 true），`autoRotateDegPerSec={autoRotate ? 6 : 0}`；reduced-motion 时 hook 内部已为 0，不变。
  - Dock 追加「自动旋转」开关按钮（`aria-pressed`，仅 3D 墙视图可用）。

- [ ] **Step 1: 写失败测试**

- Dock 含「自动旋转」按钮，默认 `aria-pressed="true"`；点击变 `false`。
- `src/lib/rotationPhysics.test.ts` 追加：`autoRotateDegPerSec 传 0 时角度不随时间变化`（如已有等价断言则复用，不重复造）。
- WallPage.test：关闭自动旋转后 PhotoWall 仍渲染（无行为断言可观测时，仅断言按钮状态与墙存在）。

- [ ] **Step 2: 跑测试确认失败** → 断言失败。

- [ ] **Step 3: 实现** 按上述。

- [ ] **Step 4: 全量测试 + 构建** → 全绿。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(wall): Dock 自动旋转开关"
```

### Task 5: 复审与收尾

- [ ] **Step 1: 派全新 coder 子代理整体复审本阶段全部 diff**（MERGE_BASE = P4 起始 commit；对照本计划 + spec §6/§7.3/§8 P4 行 + Review Focus 五条；只读评审）。
- [ ] **Step 2: Critical/Important 修复（TDD），Minor 记 ledger；最终提交推送 `git push origin main`。
- [ ] **Step 3: 给用户 P4 验收清单**：3D 墙导出 PNG 观感 / 心形模式动画与导出 / zip 完整可解压 / 自动旋转开关生效 / Dock 在各视图表现正常。
