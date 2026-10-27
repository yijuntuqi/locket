# P6：布局市场 + 常驻控制 + 删除交互优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 删除心形模式；控制按钮常驻右缘不挡照片；hover 暂停自转让删除可操作；新增球形/散落/螺旋三种照片墙布局，每个相册可选并持久化（含圆柱共 4 种）。

**Architecture:** 布局 = 纯几何函数（`src/lib/layouts/<name>Geometry.ts`，可测）+ 场景组件（复用 `usePhotoWallRotation` 拖拽/惯性/自转 + `CardFaces` 双面反光 + DoF + 删除）。`WallScene` 按 `album.wall_layout` 分发。布局存 `albums.wall_layout`（migration 白名单约束）。

**Tech Stack:** 同上（CSS 3D + Tailwind 4 + Supabase）。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md` §11 方向修订 v4（本计划追加修订：心形模式移除、布局市场加入）

## 说明（调研记录）

参考页（包图网照片墙模板列表）为 VIP 登录墙无法读取，且其模板为付费版权素材不可直接复用。本计划的布局选型采用行业通用原型：球形展厅 / 散落拍立得 / 螺旋隧道 + 已有圆柱，全部为自研 CSS 3D 实现。

## Global Constraints

沿用 P5（npm maxsockets、TDD 桩惯例、不加运行时依赖、reduced-motion 关动效、main 直提中文 Conventional Commits）。

## Review Focus

- 布局几何：球面/螺旋点分布确定性、无 NaN（count=1/2 边界）、点不重叠出界。
- 布局切换：相册页即时切换 + 刷新后保持；白名单外值回退 cylinder。
- 常驻控制条不拦截拖拽/删除（pointer-events 与 z-index）。
- hover 暂停自转只在非拖拽时生效，leave 恢复。
- 心形删除干净（组件/几何库/按钮零残留）。

---

### Task 1: 减法与交互优化 —— 删心形、常驻右缘控制条、删除可操作

**Files:**
- Delete: `src/components/wall/HeartCanvas.tsx` + `.test.tsx`、`src/lib/heartGeometry3d.ts` + `.test.tsx`
- Create: `src/components/wall/ControlsBar.tsx`；Test: `src/components/wall/ControlsBar.test.tsx`
- Modify: `src/components/PhotoWall.tsx`、`src/components/PhotoWallCard.tsx`、`src/hooks/usePhotoWallRotation.ts`、`src/pages/WallPage.tsx` 及测试

**Interfaces:**
- Produces:
  - `ControlsBar: (props: { currentLayout: WallLayout; onLayoutChange(l: WallLayout): void; autoRotate: boolean; onToggleAutoRotate(): void; disabled: boolean }) => JSX` —— 右缘垂直居中常驻（`fixed right-3 top-1/2 -translate-y-1/2 z-30` 垂直 pill，glassPill）：布局按钮（显示当前布局中文名，点击展开选项浮层，选项来自 `WALL_LAYOUTS`）、分隔点、自动旋转开关（aria-pressed）。
  - `WALL_LAYOUTS: { id: WallLayout; label: string }[]`、`type WallLayout = 'cylinder' | 'sphere' | 'scatter' | 'spiral'`（`src/lib/layouts.ts`）。
  - `usePhotoWallRotation` 新返回 `pause(): void` / `resume(): void` 或在 opts 加 `paused` —— 取实现简洁者；PhotoWall 在 hover 聚焦时暂停自转、失焦恢复（reduced-motion 下本就无自转）。
  - PhotoWallCard 删除按钮加大：`h-8 w-8`、 bg-black/70、hover 红底更明显。
- Consumes: 现有全部。

- [ ] **Step 1: 写失败测试**

`ControlsBar.test.tsx`：渲染当前布局名与自动旋转开关（aria-pressed）；点击布局按钮展开 4 个选项；点选调用 `onLayoutChange('sphere')`；`disabled` 时按钮禁用。
`usePhotoWallRotation` 测试（在 PhotoWall.component.test）：hover 卡片期间自转暂停——render 默认 autoRotate + pointerEnter 卡片 → 120ms 后拖拽面 `rotateY(0deg)` 不变；pointerLeave 后恢复增长。
PhotoWallCard 删除按钮：`aria-label^="删除"` 的按钮 className 含 `h-8`。

- [ ] **Step 2: 跑测试确认失败** → 导入报错/断言失败。

- [ ] **Step 3: 实现**

`layouts.ts` 常量；`ControlsBar.tsx`；hook 加暂停（dragRef 已有，加 `pausedRef`，tick 中 `if (!dragRef.current && !pausedRef.current)`；暴露 `setPaused`）；PhotoWall：`focusedId !== null → setPaused(true)`（effect）；WallPage 删心形状态/按钮/EdgeReveal bottom 包 Dock 整块换成 `<ControlsBar/>`（EdgeReveal bottom 删除），顶栏 EdgeReveal 保留。

- [ ] **Step 4: 全量测试 + 构建** → 全绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(wall): 删心形、常驻右缘控制条、hover 暂停自转优化删除"
```

### Task 2: 布局持久化 —— migration + lib + 接线

**Files:**
- Create: `supabase/migrations/0004_album_layout.sql`
- Modify: `src/lib/types.ts`、`src/lib/albums.ts`、Test: `src/lib/albums.test.ts`、`src/pages/WallPage.tsx` 及测试

**Interfaces:**
- Produces:
  - DB：`albums.wall_layout text not null default 'cylinder'` + `check (wall_layout in ('cylinder','sphere','scatter','spiral'))`。
  - `Album` 增 `wall_layout: WallLayout`；`setAlbumLayout(albumId: string, layout: WallLayout): Promise<void>`（白名单校验，非法值 throw）。
- [ ] **Step 1: migration**（MCP apply_migration）→ `execute_sql` 验证列与约束存在。

- [ ] **Step 2: 写失败测试**：`setAlbumLayout` mock supabase update 断言参数；非法 layout throw；WallPage 点选布局后 `album.wall_layout` 更新（mock albums 模块）。

- [ ] **Step 3: 实现 → 全量测试 + 构建 → Commit** `feat(db): albums.wall_layout 布局持久化`

### Task 3: 三个新布局（sphere / scatter / spiral）

**Files:**
- Create: `src/lib/layouts/sphereGeometry.ts` + test；`src/lib/layouts/scatterGeometry.ts` + test；`src/lib/layouts/spiralGeometry.ts` + test
- Create: `src/components/wall/SphereWall.tsx` + test；`ScatterWall.tsx` + test；`SpiralWall.tsx` + test
- Create: `src/components/wall/WallScene.tsx`（layout 分发）
- Modify: `src/pages/WallPage.tsx`

**Interfaces:**
- Consumes: Task 1/2；`CardFaces`、`usePhotoWallRotation`（含暂停）、PhotoWallCard 同款 DoF/删除交互（每个 Wall 组件内复制聚焦状态模式，与 PhotoWall 一致）。
- Produces:
  - `computeSpherePlacements(count): { theta: number; phi: number }[]` —— 斐波那契球面（黄金角经线 + 等弧纬线），确定性；SphereWall 用球坐标转 3D（半径 R，卡片朝外 rotateY/rotateX），整体 rotateY 拖拽 + 背面（z<0）隐藏。
  - `computeScatterPlacements(count, width, height): { x: number; y: number; rotateDeg: number; scale: number; driftDelayMs: number }[]` —— 种子确定性散布（`mulberry32(23)`），min 间距防重叠（拒绝采样，上限迭代）；ScatterWall 为 2D 平面（容器轻微 rotateX/rotateY 跟随拖拽作视差），每张带缓慢浮动 keyframes（index.css 加 `float-drift`，reduced-motion 关闭）。
  - `computeSpiralPlacements(count): { angleDeg: number; z: number }[]` —— 等角螺旋（角度线性 + 深度线性），SpiralWall 把卡片沿螺旋放（translateX/Y 由角度决定圆环 + translateZ 纵深），透视 1200，整体旋转制造穿越感。
- [ ] **Step 1: 各几何 lib 失败测试**（确定性、count 边界 0/1/2、坐标有限数、散布无重叠（间距>阈值比例））。

- [ ] **Step 2: 组件失败测试**（渲染 N 张 img、容器 perspective、focused hover 浮出——抽查 SphereWall，其余结构相同）。

- [ ] **Step 3: 实现 → WallPage 用 `WallScene layout={album.wall_layout}` 替换 PhotoWall → 全量测试 + 构建 → Commit** `feat(wall): 球形/散落/螺旋三种照片墙布局`

- [ ] **Step 4: 人工验收**：4 种布局切换流畅、刷新保持、右缘控制条不挡操作。

### Task 4: 复审与收尾

- [ ] **Step 1: 派全新 coder 子代理复审**（范围 P6 全部；Review Focus 五条）。
- [ ] **Step 2: Critical/Important 修复（TDD），Minor 记 ledger，推送。**
- [ ] **Step 3: 验收清单**：删心形零残留 / 右缘控制条不挡照片 / hover 暂停后可稳定点删除 / 4 布局各有表现力且刷新保持 / 布局白名单外值回退 cylinder。
