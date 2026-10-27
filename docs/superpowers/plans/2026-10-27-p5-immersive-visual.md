# P5：沉浸式视觉大爆炸（减法 + 隐藏式 UI + 卡片质感）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 砍掉时间轴/瀑布流/排序等“网感化”功能，只保留 3D 圆柱墙 + 3D 心形；控制 UI 默认隐藏、触边浮现；照片卡片获得动态反光、hover 景深（DoF）、场景聚光与尘埃粒子，实现“打开就哇”的沉浸式浪漫。

**Architecture:** 全部基于现有 CSS 3D 栈（不加 WebGL/Three.js）。减法先行（删视图删排序删灯箱），再做隐藏式控制层（毛玻璃浮现面板），最后卡片质感三件套（sheen 动态反光 / hover 景深 / 聚光+尘埃）。关键技术约束：`filter` 与 `opacity<1` 会使元素的 preserve-3d 子树塌陷（[MDN transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style)、[Chrome 示例](https://googlechrome.github.io/samples/css-opacity-force-flattening/index.html)），因此模糊/变暗只能加在叶子 img 上，不能加卡片容器。

**Tech Stack:** Vite + React 19 + TS strict + Tailwind 4 + CSS keyframes + vitest（jsdom）。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（本计划含方向修订，见 Task 1 Step 0；§6 CSS 3D 约束节）

## 设计规范调研结论（执行依据）

来自 [Apple HIG 空间设计准则](https://developer.apple.com/design/human-interface-guidelines)（经 [apple-design skill](https://github.com/emilkowalski/apple-design) 与 [visionOS 设计解读](https://ui.wensity.com/blog/the-anatomy-of-apples-design-language) 转述）与 [Awwwards 2025 趋势](https://www.awwwards.com/case-study-immersive-gardens-new-website.html)（Immersive Garden 为 2025 年度代理）：

1. **玻璃只属于控制层**：内容层不用玻璃；控制层用半透明+模糊浮于内容之上（本计划：浮现面板用毛玻璃，照片卡片不加玻璃）。
2. **材质轻重编码层级，亮玻璃不叠亮玻璃**（浮现面板 active 态用更深的 bg-white/20）。
3. **聚焦 = 其余变暗**：visionOS 的聚焦窗口会让背景变暗——正是 hover DoF 的规范出处；配合模糊即成景深。
4. **空间纵深靠粒子与视差**：漂浮尘埃 + 鼠标视差是获奖站点的通用氛围手段。
5. **动态反光用移动高光（sheen）模拟**：真实反射需环境贴图/WebGL，超出 CSS 3D 栈范围；缓慢扫过的高光足以传达“材质感”。

## Global Constraints

- npm 安装一律 `--maxsockets=4`；提交直接进 main，Conventional Commits 中文正文。
- 测试桩惯例（jsdom / ResizeObserver / matchMedia stub / vi.hoisted）。
- 不新增运行时依赖（不加 framer-motion/GSAP，CSS keyframes 足够）。
- `prefers-reduced-motion` 下：sheen 动画、DoF、尘埃全部停用（CSS media query + hook 已有 reduced-motion 处理）。

## Review Focus

- **preserve-3d 塌陷**：blur/dim 只加叶子 img，卡片容器 transform-style 必须仍是 preserve-3d（测试断言）。
- **hover 与拖拽冲突**：拖动旋转中 hover 不得触发 DoF（isDragging 时忽略）。
- **触屏退化**：无 hover 设备 DoF 不触发（自然退化）；控制栏必须有可发现的手柄（tap 切换）。
- **性能**：blur 仅作用于非焦点卡片的 img；reduced-motion 关闭一切动效。
- **减法彻底**：无残留 import / 死测试 / 孤儿 lib 函数（reorderPhotos、persistSortOrder、灯箱）。

---

### Task 1: 大减法 —— 删除时间轴/瀑布流/排序/灯箱

**Files:**
- Delete: `src/components/wall/TimelineView.tsx` + `.test.tsx`；`src/components/wall/MasonryView.tsx` + `.test.tsx`；`src/components/wall/SortableGridView.tsx` + `.test.tsx`；`src/components/wall/PhotoLightbox.tsx` + `.test.tsx`
- Modify: `src/pages/WallPage.tsx`、`src/pages/WallPage.test.tsx`、`src/lib/photos.ts`、`src/lib/reorder.test.ts`（删）
- Modify: `docs/superpowers/specs/2026-10-26-locket-design.md`（加“方向修订 v4”章节）

**Interfaces:**
- Produces: WallPage 无 viewMode/sortMode/lightbox 状态；头部只剩 返回+相册名+上传；`photos.ts` 只剩 listPhotosWithUrls / deletePhoto。
- Ruling（写入 spec 修订与 ledger）：灯箱随视图一起删除（墙/心形不点开大图，右键存图足够）；DB 侧 reorder_photos RPC、UPDATE 策略、唯一索引**保留**（sort_order 仍驱动墙顺序与上传重试，删了会动 migration 历史）。

- [ ] **Step 0: spec 加方向修订章节**：说明 P4 用户决策（撤销导出/zip）与 P5 用户决策（三视图/排序/灯箱移除，只留双 3D 模式 + 隐藏式 UI），声明 §7.3 页面结构 3 与 §8 P3 行被本修订取代。

- [ ] **Step 1: 删文件与代码，修 WallPage**

删除上述 6 个组件/测试文件；WallPage 移除 viewMode、VIEW_LABELS、sortMode、lightbox 相关 state/JSX/import（TimelineView/MasonryView/SortableGridView/PhotoLightbox/useMemo timelinePhotos 等）；头部右侧只保留相册名 + UploadButton；`photos.ts` 删 reorderPhotos/persistSortOrder；删 `src/lib/reorder.test.ts`。

- [ ] **Step 2: 修 WallPage.test**

删三视图切换、排序 drop、灯箱、时间轴相关用例；保留竞态、删除守卫、心形切换、自动旋转、空相册用例；`renderAlbumPage` 保留。

- [ ] **Step 3: 跑测试 + 构建** → 全绿，`npx vitest run && npm run build`。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(wall): 大减法——移除时间轴/瀑布流/排序/灯箱，只留双 3D 模式"
```

### Task 2: 隐藏式 UI —— 触边浮现的毛玻璃控制层

**Files:**
- Create: `src/components/wall/EdgeReveal.tsx`；Test: `src/components/wall/EdgeReveal.test.tsx`
- Modify: `src/pages/WallPage.tsx`、`src/index.css`

**Interfaces:**
- Consumes: Task 1 的精简 WallPage。
- Produces:
  - `EdgeReveal: (props: { edge: 'top' | 'bottom'; children: ReactNode }) => JSX` —— 结构：触发条（`h-3 w-full`，top 贴顶/bottom 贴底，无 hover 设备上为常驻半透明渐变手柄）+ 面板容器。默认隐藏（panel class 含 `-translate-y-full`（top）或 `translate-y-full`（bottom）与 `opacity-0`）；指针进入触发条或面板 → 显示（`translate-y-0 opacity-100`），离开面板 600ms 后隐藏。`transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s`。面板样式用现有 glassPill/glassPanel 体系。
  - 触屏（`(hover: none)`，JS `window.matchMedia` 检测一次）：点击触发条切换显示/隐藏。
- [ ] **Step 1: 写失败测试**

`EdgeReveal.test.tsx`（matchMedia stub，复用现有模式）：
- 初始面板含 `opacity-0` 与对应位移类；`fireEvent.pointerEnter` 触发条 → 类变为 `opacity-100`；`fireEvent.pointerLeave` 面板 + 快进定时器（`vi.useFakeTimers` 或 waitFor）→ 恢复隐藏。
- matchMedia 返回 hover:none → 点击触发条切换显示。
- 顶层容器带 `data-testid="edge-reveal-top|bottom"`。

- [ ] **Step 2: 跑测试确认失败** → 导入报错。

- [ ] **Step 3: 实现 `EdgeReveal.tsx`**

状态 `visible: boolean` + `hideTimerRef`；`onPointerEnter` 清定时器并显示；`onPointerLeave` 启动 600ms 定时隐藏；`onClick`（仅触屏分支）toggle。触发条 `aria-label="显示控制栏"`。

- [ ] **Step 4: WallPage 接线**

顶栏（返回+相册名+上传）包 `<EdgeReveal edge="top">`，Dock（心形+自动旋转）包 `<EdgeReveal edge="bottom">`（Dock 移到 EdgeReveal 面板内，保留原有按钮与禁用逻辑）。上传提示条（uploadMessage）保持原样。

`src/pages/WallPage.test.tsx` 追加：渲染后头部按钮在 DOM 中（隐藏≠卸载，仍可按 role 查到），面板初始带 `opacity-0`；触发条 pointerEnter 后 `opacity-100`。

- [ ] **Step 5: 全量测试 + 构建** → 全绿。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): 控制层默认隐藏，触边毛玻璃浮现（顶栏+Dock）"
```

### Task 3: 卡片质感 —— 动态反光 / hover 景深 / 聚光尘埃

**Files:**
- Create: `src/components/wall/CardFaces.tsx`；Test: `src/components/wall/CardFaces.test.tsx`
- Modify: `src/components/PhotoWallCard.tsx`、`src/components/wall/HeartCanvas.tsx`、`src/components/PhotoWall.tsx`、`src/pages/WallPage.tsx`、`src/index.css`

**Interfaces:**
- Consumes: Task 2 的 WallPage。
- Produces:
  - `CardFaces: (props: { photo: FakePhoto; dimmed: boolean; sheenDelayMs: number }) => JSX` —— 双面照片内容（正/背 img + 动态反光层），**所有 filter/opacity 只加在叶子 img/overlay 上**，自身无 preserve-3d 语义（由父级卡片容器提供）。`dimmed=true` 时正/背 img 内联 style 加 `filter: blur(3px) brightness(0.45)`，`transition: filter 0.4s`；反光层为绝对定位渐变 div，`animation: sheen 7s ease-in-out infinite`（keyframes 在 index.css），`mix-blend-mode: screen`。
  - PhotoWall/HeartCanvas 新增聚焦状态：`focusedId: string | null`；卡片 `onPointerEnter/Leave` 维护（`isDragging` 时 enter 忽略）；有焦点时其余卡片 `dimmed`，焦点卡片容器 transform 追加 `translateZ(48px)` 且阴影加重。
  - WallPage 场景层（在墙容器兄弟位置）：`data-testid="scene-light"` 固定遮罩（pointer-events-none，radial-gradient 跟随指针，CSS 变量 --spot-x/--spot-y，window pointermove rAF 节流更新）；`DustMotes`（`data-testid="dust-motes"`，24 颗种子确定性散布的 2~4px 白点，CSS keyframes 缓慢漂移）。
- [ ] **Step 1: 写失败测试**

`CardFaces.test.tsx`：`dimmed=false` 时正/背 img 无 filter 样式；`dimmed=true` 时有 `blur(3px)`；反光层存在且含 `animation` 样式。
`PhotoWall.component.test.tsx` 追加：hover 某卡片（`fireEvent.pointerEnter`）→ 该卡片容器 style.transform 含 `translateZ(48px)`，**其余**卡片正 img style.filter 含 `blur`；`pointerLeave` 后还原；卡片容器 style.transformStyle 仍为 `preserve-3d`。
WallPage.test 追加：`scene-light` 与 `dust-motes` 存在于相册页。

- [ ] **Step 2: 跑测试确认失败** → 断言失败/导入报错。

- [ ] **Step 3: 实现**

按签名实现；index.css 追加 `@keyframes sheen`（background-position 120%→-120%）、`@keyframes dust-drift`（多段位移）、`@media (prefers-reduced-motion: reduce)` 内停掉这两个动画。PhotoWallCard/HeartCard 用 CardFaces 替换正/背 img；聚焦逻辑在 PhotoWall 与 HeartCanvas 各一份（与角度状态同层）。

- [ ] **Step 4: 全量测试 + 构建** → 全绿。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(wall): 卡片质感三件套——动态反光、hover 景深、场景聚光与尘埃"
```

### Task 4: 复审与收尾

- [ ] **Step 1: 派全新 coder 子代理复审**（范围 = P5 全部 commit；重点 Review Focus 五条 + 减法彻底性；只读评审）。
- [ ] **Step 2: Critical/Important 修复（TDD），Minor 记 ledger，推送。
- [ ] **Step 3: 给用户的实机验收清单**：① 进相册只看到墙/极光/星空，鼠标到顶/底缘毛玻璃控制层浮现；② hover 照片：其余变暗模糊、选中浮出，拖动旋转中 DoF 不误触发；③ 卡片表面有缓慢扫过的微光；④ 鼠标移动时场景光斑跟随；⑤ 手机触屏：边缘半透明手柄可点开控制层；⑥ 减法的残留检查（无时间轴/瀑布流入口）。
