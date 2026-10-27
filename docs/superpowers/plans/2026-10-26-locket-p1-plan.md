# Locket P1 实现计划：脚手架 + 3D 旋转照片墙

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭好 Vite+React+TS+Tailwind 项目，实现可用鼠标/触屏拖拽、带惯性、自动慢转的 3D 圆柱照片墙（假数据），配 React Bits 动态背景。

**Architecture:** 纯前端 SPA。墙的圆柱排布和旋转物理抽成无副作用的纯函数模块（可单测）；React 组件只负责渲染和事件；背景组件懒加载并在弱动效偏好下降级。

**Tech Stack:** Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + shadcn CLI（react-bits registry）+ Vitest。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（§2 目标 1/14，§6 架构，§8 P1）

## Global Constraints

- 包管理只用 **npm**（E 盘 exFAT 不支持符号链接，pnpm 会挂）。
- Node ≥ 20。
- React Bits 组件通过 shadcn CLI 拉取：`npx shadcn@latest add @react-bits/<Name>-TS-TW`（本仓库 registry 已在 Task 1 配好）；reactbits.dev 拉不动就官网手动复制源码。
- TypeScript strict；组件 props 必须 typed。
- 动效必须尊重 `prefers-reduced-motion`：命中时禁自动旋转与惯性（Task 5 验证）。
- 每 Task 结束必须 `git commit`（Conventional Commits，中文摘要）。

## Review Focus

1. **照片只有 1~3 张时圆柱不塌**：间距角 ≥ 120°、半径有下限——Task 2 的测试钉住。
2. **照片 200+ 张时的帧率**：必须只改 transform、用 `will-change`——Task 4 手动验证（假数据造 200 张）。
3. **鼠标与触屏行为一致**：统一 Pointer Events；拖拽中暂停自动旋转，松手恢复——Task 4 手动验证（DevTools 设备模拟）。
4. **窗口缩放后布局不崩**：半径/卡片尺寸随容器宽度重算——Task 4 手动验证（拖窗口大小）。
5. **弱动效偏好**：系统开启 reduced-motion 时墙静止可拖但不自转——Task 5 手动验证（DevTools Rendering 面板模拟）。

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, `components.json`, `.gitignore`, `README.md`
- Test: 无（本 Task 验证靠命令输出）

**Interfaces:**
- Produces: 可 `npm run dev` / `npm run build` / `npx vitest run` 的空项目；`components.json` 含 `"registries": { "@react-bits": "https://reactbits.dev/r/{name}.json" }`；`npx shadcn@latest add` 可用。

- [ ] **Step 1: 用 Vite 官方模板建项目**（在项目根目录 `E:\old-new\backup\BNU_leaning\locket`）：

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest @types/node
```

- [ ] **Step 2: 装 Tailwind 4 + shadcn，注册 react-bits registry**

```bash
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node   # 若已装跳过
npx shadcn@latest init       # 选 Vite、TS、Tailwind 4 默认项
```

在生成的 `components.json` 顶层加：

```json
"registries": { "@react-bits": "https://reactbits.dev/r/{name}.json" }
```

- [ ] **Step 3: 写 `.gitignore`**（node_modules、dist、.env*、*.local）和一页 `README.md`（项目名 Locket、本地启动命令）。

- [ ] **Step 4: 验证**

Run: `npm run build && npx vitest run`
Expected: build 成功；vitest 报 "No test files found"（正常，Task 2 起有测试）。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "build: Vite+React+TS+Tailwind4 脚手架与 shadcn/react-bits registry"
```

---

### Task 2: 圆柱排布几何模块 `wallGeometry`

**Files:**
- Create: `src/lib/wallGeometry.ts`
- Test: `src/lib/wallGeometry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface WallPlacement { angleDeg: number; radiusPx: number }
  export function computeRadius(count: number, cardWidthPx: number, gapPx: number): number
  export function computePlacements(count: number, cardWidthPx: number, gapPx: number): WallPlacement[]
  ```
  约定：`radius = max(320, (cardWidth + gap) * count / (2π))`；`placements[i].angleDeg = i * 360 / count`；`count <= 0` 返回 `[]`。Task 4 的 PhotoWall 消费这两个函数。

- [ ] **Step 1: 写失败测试** `src/lib/wallGeometry.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { computeRadius, computePlacements } from './wallGeometry'

describe('computeRadius', () => {
  it('张数多时按周长公式计算', () => {
    // 卡宽 240 + 间隙 24 = 264px；20 张 → 264*20/(2π) ≈ 840
    expect(computeRadius(20, 240, 24)).toBeCloseTo(840, 0)
  })
  it('张数少时不小于下限 320', () => {
    expect(computeRadius(2, 240, 24)).toBe(320)
  })
})

describe('computePlacements', () => {
  it('均匀分布整圆', () => {
    const p = computePlacements(4, 240, 24)
    expect(p.map(x => x.angleDeg)).toEqual([0, 90, 180, 270])
    expect(p.every(x => x.radiusPx === p[0].radiusPx)).toBe(true)
  })
  it('0 张返回空数组', () => {
    expect(computePlacements(0, 240, 24)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/wallGeometry.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `src/lib/wallGeometry.ts`**（签名见 Interfaces；`Math.max(320, ...)` 与 `i * 360 / count` 是唯一合理的实现）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/wallGeometry.test.ts`
Expected: PASS（3 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wallGeometry.ts src/lib/wallGeometry.test.ts
git commit -m "feat(wall): 圆柱排布几何模块"
```

---

### Task 3: 旋转物理模块 `rotationPhysics`

**Files:**
- Create: `src/lib/rotationPhysics.ts`
- Test: `src/lib/rotationPhysics.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface RotationState { angleDeg: number; velocityDegPerSec: number }
  export function stepRotation(
    state: RotationState,
    dtSec: number,
    autoRotateDegPerSec: number,
    inertiaHalfLifeSec: number
  ): RotationState
  ```
  约定：有速度时角度按速度积分、速度按半衰期指数衰减（`v *= 0.5 ** (dt / halfLife)`）；速度低于 0.5°/s 视为停（归零）；速度为零时角度按 `autoRotateDegPerSec` 匀速走。Task 4 的 hook 每帧调用。
  默认值由调用方传：自动旋转 6°/s、半衰期 0.8s。

- [ ] **Step 1: 写失败测试** `src/lib/rotationPhysics.test.ts`：

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/rotationPhysics.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `src/lib/rotationPhysics.ts`**（签名与衰减公式见 Interfaces）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/rotationPhysics.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/rotationPhysics.ts src/lib/rotationPhysics.test.ts
git commit -m "feat(wall): 旋转物理模块（惯性衰减与自动旋转）"
```

---

### Task 4: 照片墙组件 + 拖拽 Hook + 假数据

**Files:**
- Create: `src/hooks/usePhotoWallRotation.ts`, `src/components/PhotoWall.tsx`, `src/components/PhotoWallCard.tsx`, `src/lib/fakePhotos.ts`, `src/App.tsx`（改）
- Test: 无新增单测（UI 行为按 Review Focus 2/3/4 手动验证）

**Interfaces:**
- Consumes: Task 2 的 `computePlacements`、`computeRadius`；Task 3 的 `stepRotation`。
- Produces:
  ```ts
  export interface FakePhoto { id: string; src: string; caption: string }
  export function makeFakePhotos(count: number): FakePhoto[]   // fakePhotos.ts；SVG data URI，无网络依赖
  export function usePhotoWallRotation(opts?: {
    autoRotateDegPerSec?: number   // 默认 6
    inertiaHalfLifeSec?: number    // 默认 0.8
  }): { angleDeg: number; isDragging: boolean }                 // usePhotoWallRotation.ts
  export function PhotoWall(props: {
    photos: FakePhoto[]
    cardWidthPx?: number   // 默认 240
    gapPx?: number         // 默认 24
  }): JSX.Element                                             // PhotoWall.tsx
  ```
  Hook 行为约定：Pointer Events（pointerdown/move/up + setPointerCapture）；拖动中 `isDragging=true` 且速度记为 `-dx/dt`（拖右边往左甩 → 墙正转）；松手后惯性衰减，归零后恢复自动旋转；`matchMedia('(prefers-reduced-motion: reduce)')` 命中时不自动旋转。
  PhotoWall 渲染：外层容器 `perspective: 1200px`，内层 `transform-style: preserve-3d; transform: rotateY(angleDeg)`；每张照片绝对定位居中后 `rotateY(angle) translateZ(radius)`；`will-change: transform`。

- [ ] **Step 1: 实现 `src/lib/fakePhotos.ts`**——按 `makeFakePhotos(count)` 生成：本地 SVG data URI（渐变底色 + 序号文字），避免外链图床。

- [ ] **Step 2: 实现 `src/hooks/usePhotoWallRotation.ts`**——rAF 循环每帧 `stepRotation`；`pointermove` 时同时更新角度和瞬时速度；逻辑与 Task 3 的约定一致。

- [ ] **Step 3: 实现 `src/components/PhotoWallCard.tsx` 与 `PhotoWall.tsx`**——按 Interfaces 的 transform 约定渲染；空数组渲染占位提示。

- [ ] **Step 4: 改 `src/App.tsx`**——`makeFakePhotos(12)` 传入 `PhotoWall`，占满视口居中。

- [ ] **Step 5: 手动验证（Review Focus 2/3/4）**

Run: `npm run dev`
Expected: ① 墙缓慢自转；② 鼠标拖拽可旋转、甩动有惯性、松手恢复自转；③ DevTools 切 iPhone 尺寸触屏拖拽同样可玩；④ 拖窄窗口卡片和圆柱重排不溢出；⑤ 把 `makeFakePhotos(12)` 改成 200 重建，拖拽仍流畅（200 张时只应见 transform 变化，无 layout 抖动）。

- [ ] **Step 6: Commit**

```bash
git add src/hooks src/components src/lib/fakePhotos.ts src/App.tsx
git commit -m "feat(wall): 3D 圆柱照片墙（拖拽/惯性/自动旋转 + 假数据）"
```

---

### Task 5: React Bits 动态背景 + 弱动效降级

**Files:**
- Create: `src/components/Backdrop.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: shadcn CLI（react-bits registry）。
- Produces:
  ```ts
  export function Backdrop(): JSX.Element
  ```
  行为约定：`React.lazy` + `Suspense` 加载背景；`prefers-reduced-motion` 命中时渲染静态渐变 div；背景 `position: fixed; inset: 0; z-index: -1`。

- [ ] **Step 1: 拉取背景组件**

Run: `npx shadcn@latest add @react-bits/Aurora-TS-TW`（若 reactbits.dev 拉取失败：去 https://reactbits.dev/backgrounds 的 Aurora 页面手动复制 TS+TW 源码到 `src/components/react-bits/Aurora.tsx` 并 `npm i ogl`——Aurora 依赖 ogl）。
Expected: `src/components/` 下出现 Aurora 组件。

- [ ] **Step 2: 实现 `src/components/Backdrop.tsx`**——按 Interfaces 约定懒加载 Aurora、降级静态渐变。

- [ ] **Step 3: 改 `src/App.tsx`** 挂 `<Backdrop />` 在 `<PhotoWall />` 之前。

- [ ] **Step 4: 手动验证（Review Focus 5）**

Run: `npm run dev`
Expected: 背景为极光动效且照片墙在上层；DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`，刷新后背景变静态渐变、墙不自转但仍可拖。

- [ ] **Step 5: Commit**

```bash
git add src/components/Backdrop.tsx src/App.tsx src/components/react-bits 2>/dev/null
git commit -m "feat(wall): Aurora 动态背景（懒加载 + 弱动效降级）"
```

---

## Self-Review 记录

1. **Spec 覆盖**：P1 对应 spec §8 的 P1（脚手架+3D墙+假数据+背景氛围）——Task 1/4/5 覆盖；几何与物理（spec §6 的墙本体约定）由 Task 2/3 钉住。P2-P7 不在本计划，各自开工时再写计划。
2. **Step 扫描**：Task 1/4/5 无单测，验证步骤给的是可观察的命令/行为；Task 2/3 的测试先写后实现。无 "TBD"。
3. **类型一致**：`computePlacements` 返回 `WallPlacement[]`、`stepRotation` 出入 `RotationState`——Task 4 的 Hook 签名与之吻合；`FakePhoto` 字段在 fakePhotos 与 PhotoWall 间一致。
4. **Review Focus**：5 条均已映射（1→Task 2 测试；2/3/4→Task 4 Step 5；5→Task 5 Step 4）。
5. **比例**：代码块仅为测试与命令，实现只给签名与关键公式，长度与 spec P1 一节相称。
